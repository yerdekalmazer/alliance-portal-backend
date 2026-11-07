import { Router } from 'express';
import type { PoolClient } from 'pg';
import { requireAdmin, requireAuth } from '../auth';
import { pool, query, queryOne } from '../db';
import { HttpError, ok, oneOf, pick, requiredText, text, textArray, wrap } from '../util';

export const CASE_STATUSES = ['active', 'paused', 'completed', 'archived'] as const;
export const PROCESS_STEPS = ['case-evaluated', 'team-formation', 'prototyping', 'productization', 'completed'] as const;

const router = Router();
router.use(requireAuth);

export const CASE_SELECT = `
  SELECT c.*, u.name AS member_name, u.email AS member_email, m.organization AS member_organization,
         i.project_title AS idea_title,
         (SELECT COUNT(*)::int FROM case_team_members t WHERE t.case_id = c.id) AS team_count
    FROM cases c
    LEFT JOIN users u ON u.id = c.member_user_id
    LEFT JOIN alliance_members m ON m.user_id = c.member_user_id
    LEFT JOIN ideas i ON i.id = c.idea_id`;

function teamRequirements(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, 'Takım gereksinimleri liste olmalı');
  return value.slice(0, 50).map((r: any) => {
    const count = Number(r?.count);
    if (!r?.jobType || !Number.isFinite(count) || count < 0) throw new HttpError(400, 'Geçersiz takım gereksinimi');
    return {
      jobType: String(r.jobType).slice(0, 200),
      count: Math.min(Math.round(count), 999),
      priority: ['high', 'medium', 'low'].includes(r.priority) ? r.priority : 'medium',
      ...(r.description ? { description: String(r.description).slice(0, 1000) } : {}),
    };
  });
}

function threshold(value: unknown) {
  if (value === undefined || value === null || value === '') return 70;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new HttpError(400, 'Eşik değeri 0-100 arasında olmalı');
  return Math.round(n);
}

/** Eski "Yeni Case Oluştur" formunun gövdesinden case kaydı açar */
export async function insertCase(
  c: PoolClient,
  b: Record<string, unknown>,
  extra: { ideaId: string | null; memberUserId: string | null; createdBy: string },
) {
  const { rows } = await c.query(
    `INSERT INTO cases (idea_id, member_user_id, title, description, domain, job_types, specializations,
                        requirements, initial_threshold, team_requirements, status, created_by, last_progress_update)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()) RETURNING id`,
    [
      extra.ideaId,
      extra.memberUserId,
      requiredText(b.title, 'Case başlığı', 300),
      requiredText(b.description, 'Açıklama', 20000),
      text(b.domain, 100),
      textArray(pick(b, 'job_types', 'jobTypes')),
      textArray(b.specializations),
      textArray(b.requirements),
      threshold(pick(b, 'initial_threshold', 'initialThreshold')),
      JSON.stringify(teamRequirements(pick(b, 'team_requirements', 'teamRequirements'))),
      b.status !== undefined ? oneOf(b.status, CASE_STATUSES, 'Durum') : 'active',
      extra.createdBy,
    ],
  );
  return rows[0].id as string;
}

router.get(
  '/',
  wrap(async (req, res) => {
    if (req.user!.role === 'admin') {
      return ok(res, await query(`${CASE_SELECT} ORDER BY c.created_at DESC`));
    }
    ok(res, await query(`${CASE_SELECT} WHERE c.member_user_id = $1 ORDER BY c.created_at DESC`, [req.user!.id]));
  }),
);

router.get(
  '/:id',
  wrap(async (req, res) => {
    const row = await queryOne(`${CASE_SELECT} WHERE c.id = $1`, [req.params.id]);
    if (!row || (req.user!.role !== 'admin' && row.member_user_id !== req.user!.id)) {
      throw new HttpError(404, 'Case bulunamadı');
    }
    ok(res, row);
  }),
);

// Admin: fikirsiz doğrudan case açma
router.post(
  '/',
  requireAdmin,
  wrap(async (req, res) => {
    const b = req.body || {};
    const memberId = text(pick(b, 'member_user_id', 'memberUserId'), 64);
    if (memberId && !(await queryOne(`SELECT id FROM users WHERE id = $1 AND role = 'alliance'`, [memberId]))) {
      throw new HttpError(400, 'Seçilen alliance üyesi bulunamadı');
    }
    const client = await pool.connect();
    try {
      const id = await insertCase(client, b, { ideaId: null, memberUserId: memberId, createdBy: req.user!.id });
      ok(res, await queryOne(`${CASE_SELECT} WHERE c.id = $1`, [id]), 201);
    } finally {
      client.release();
    }
  }),
);

// Admin: "Case Ayarları" — gönderilen alanlar güncellenir, diğerleri korunur
router.put(
  '/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const b = req.body || {};
    const cur = await queryOne('SELECT * FROM cases WHERE id = $1', [req.params.id]);
    if (!cur) throw new HttpError(404, 'Case bulunamadı');
    const has = (...keys: string[]) => keys.some((k) => b[k] !== undefined);

    await query(
      `UPDATE cases SET title=$1, description=$2, status=$3, domain=$4, job_types=$5, specializations=$6,
              requirements=$7, initial_threshold=$8, team_requirements=$9, updated_at=NOW()
        WHERE id=$10`,
      [
        has('title') ? requiredText(b.title, 'Case başlığı', 300) : cur.title,
        has('description') ? requiredText(b.description, 'Açıklama', 20000) : cur.description,
        has('status') ? oneOf(b.status, CASE_STATUSES, 'Durum') : cur.status,
        has('domain') ? text(b.domain, 100) : cur.domain,
        has('job_types', 'jobTypes') ? textArray(pick(b, 'job_types', 'jobTypes')) : cur.job_types,
        has('specializations') ? textArray(b.specializations) : cur.specializations,
        has('requirements') ? textArray(b.requirements) : cur.requirements,
        has('initial_threshold', 'initialThreshold') ? threshold(pick(b, 'initial_threshold', 'initialThreshold')) : cur.initial_threshold,
        has('team_requirements', 'teamRequirements')
          ? JSON.stringify(teamRequirements(pick(b, 'team_requirements', 'teamRequirements')))
          : JSON.stringify(cur.team_requirements),
        req.params.id,
      ],
    );
    ok(res, await queryOne(`${CASE_SELECT} WHERE c.id = $1`, [req.params.id]));
  }),
);

// Admin: "Durum Mesajı" — alliance üyesine iletilen güncel durum
router.put(
  '/:id/message',
  requireAdmin,
  wrap(async (req, res) => {
    const b = req.body || {};
    const row = await queryOne(
      `UPDATE cases SET admin_message_title=$1, admin_message_description=$2, admin_message_created_at=NOW(),
              admin_message_created_by=$3, updated_at=NOW()
        WHERE id=$4 RETURNING id`,
      [
        requiredText(b.title, 'Başlık', 300),
        requiredText(pick(b, 'description', 'content'), 'İçerik', 10000),
        req.user!.id,
        req.params.id,
      ],
    );
    if (!row) throw new HttpError(404, 'Case bulunamadı');
    ok(res, await queryOne(`${CASE_SELECT} WHERE c.id = $1`, [req.params.id]));
  }),
);

// Admin: süreç adımı ve adım notları
router.put(
  '/:id/process',
  requireAdmin,
  wrap(async (req, res) => {
    const b = req.body || {};
    const cur = await queryOne('SELECT current_step, process_state FROM cases WHERE id = $1', [req.params.id]);
    if (!cur) throw new HttpError(404, 'Case bulunamadı');
    const step = b.current_step !== undefined ? oneOf(b.current_step, PROCESS_STEPS, 'Süreç adımı') : cur.current_step;
    let state = cur.process_state;
    if (b.process_state !== undefined) {
      if (b.process_state !== null && (typeof b.process_state !== 'object' || Array.isArray(b.process_state))) {
        throw new HttpError(400, 'Süreç notları nesne olmalı');
      }
      if (JSON.stringify(b.process_state ?? null).length > 50000) throw new HttpError(400, 'Süreç notları çok uzun');
      state = b.process_state;
    }
    await query(
      `UPDATE cases SET current_step=$1, process_state=$2, last_progress_update=NOW(), updated_at=NOW() WHERE id=$3`,
      [step, state === null || state === undefined ? null : JSON.stringify(state), req.params.id],
    );
    ok(res, await queryOne(`${CASE_SELECT} WHERE c.id = $1`, [req.params.id]));
  }),
);

/* ───────── Ekip: admin case'in içinden kişi ekler ───────── */

async function caseVisible(req: any, id: string) {
  const row = await queryOne('SELECT member_user_id FROM cases WHERE id = $1', [id]);
  if (!row || (req.user.role !== 'admin' && row.member_user_id !== req.user.id)) {
    throw new HttpError(404, 'Case bulunamadı');
  }
}

function teamBody(b: Record<string, unknown>) {
  const mail = text(b.email, 254);
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw new HttpError(400, 'Geçerli bir e-posta girin');
  return [
    requiredText(pick(b, 'full_name', 'fullName', 'name'), 'Ad Soyad', 200),
    text(b.role, 200),
    mail ? mail.toLowerCase() : null,
    text(b.phone, 50),
    text(b.note, 2000),
  ];
}

router.get(
  '/:id/team',
  wrap(async (req, res) => {
    await caseVisible(req, String(req.params.id));
    const cols = req.user!.role === 'admin' ? '*' : 'id, case_id, full_name, role, created_at';
    ok(res, await query(`SELECT ${cols} FROM case_team_members WHERE case_id = $1 ORDER BY created_at`, [req.params.id]));
  }),
);

router.post(
  '/:id/team',
  requireAdmin,
  wrap(async (req, res) => {
    if (!(await queryOne('SELECT id FROM cases WHERE id = $1', [req.params.id]))) throw new HttpError(404, 'Case bulunamadı');
    const row = await queryOne(
      `INSERT INTO case_team_members (case_id, full_name, role, email, phone, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, ...teamBody(req.body || {}), req.user!.id],
    );
    await query('UPDATE cases SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    ok(res, row, 201);
  }),
);

router.put(
  '/:id/team/:memberId',
  requireAdmin,
  wrap(async (req, res) => {
    const row = await queryOne(
      `UPDATE case_team_members SET full_name=$1, role=$2, email=$3, phone=$4, note=$5, updated_at=NOW()
        WHERE id=$6 AND case_id=$7 RETURNING *`,
      [...teamBody(req.body || {}), req.params.memberId, req.params.id],
    );
    if (!row) throw new HttpError(404, 'Ekip üyesi bulunamadı');
    ok(res, row);
  }),
);

router.delete(
  '/:id/team/:memberId',
  requireAdmin,
  wrap(async (req, res) => {
    const row = await queryOne('DELETE FROM case_team_members WHERE id=$1 AND case_id=$2 RETURNING id', [
      req.params.memberId,
      req.params.id,
    ]);
    if (!row) throw new HttpError(404, 'Ekip üyesi bulunamadı');
    ok(res, row);
  }),
);

/** Case silinince kaynak fikir tekrar "Onaylandı" durumuna döner. */
router.delete(
  '/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const row = await queryOne('DELETE FROM cases WHERE id = $1 RETURNING id, idea_id', [req.params.id]);
    if (!row) throw new HttpError(404, 'Case bulunamadı');
    if (row.idea_id) {
      await query(`UPDATE ideas SET status = 'approved', updated_at = NOW() WHERE id = $1`, [row.idea_id]);
    }
    ok(res, row);
  }),
);

export default router;
