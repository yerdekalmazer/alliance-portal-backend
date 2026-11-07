import { Router } from 'express';
import { requireAdmin, requireAlliance, requireAuth } from '../auth';
import { query, queryOne, transaction } from '../db';
import { HttpError, ok, oneOf, pick, requiredText, text, textArray, wrap } from '../util';
import { CASE_SELECT, insertCase } from './cases';

const router = Router();
router.use(requireAuth);

const IDEA_SELECT = `
  SELECT i.*, u.name AS submitter_name, u.email AS submitter_email, m.organization AS member_organization,
         c.id AS case_id, c.title AS case_title, c.status AS case_status, c.current_step AS case_step
    FROM ideas i
    LEFT JOIN users u ON u.id = i.submitted_by
    LEFT JOIN alliance_members m ON m.user_id = i.submitted_by
    LEFT JOIN cases c ON c.idea_id = i.id`;

/** Alliance üyesine admin notu gösterilmez. */
function forMember(idea: any) {
  const { admin_note: _note, ...rest } = idea;
  return rest;
}

const IDEA_FIELDS = [
  'contact_name', 'email', 'organization', 'department', 'position', 'phone',
  'creative_output', 'creative_reference', 'digital_product', 'digital_product_reference',
  'digital_experience', 'digital_experience_reference', 'archetype',
  'target_audience', 'problem_need', 'must_have_features', 'better_features',
  'surprise_features', 'archetype_specific_answer', 'additional_notes', 'stage',
] as const;

const camel = (s: string) => s.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());

// Alliance üyesi fikir gönderir (uzun form — tüm alanlar saklanır)
router.post(
  '/',
  requireAlliance,
  wrap(async (req, res) => {
    const b = req.body || {};
    const title = requiredText(pick(b, 'project_title', 'projectTitle', 'title'), 'Proje başlığı', 300);
    const values = IDEA_FIELDS.map((f) => text(pick(b, f, camel(f))));
    const cols = [...IDEA_FIELDS, 'project_title', 'contribution_types', 'tags', 'submitted_by'];
    const params = [
      ...values,
      title,
      textArray(pick(b, 'contribution_types', 'contributionTypes')),
      textArray(b.tags),
      req.user!.id,
    ];
    const row = await queryOne(
      `INSERT INTO ideas (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      params,
    );
    ok(res, forMember(row), 201);
  }),
);

router.get(
  '/',
  wrap(async (req, res) => {
    if (req.user!.role === 'admin') {
      return ok(res, await query(`${IDEA_SELECT} ORDER BY i.submitted_at DESC`));
    }
    const rows = await query(`${IDEA_SELECT} WHERE i.submitted_by = $1 ORDER BY i.submitted_at DESC`, [req.user!.id]);
    ok(res, rows.map(forMember));
  }),
);

router.get(
  '/:id',
  wrap(async (req, res) => {
    const row = await queryOne(`${IDEA_SELECT} WHERE i.id = $1`, [req.params.id]);
    if (!row || (req.user!.role !== 'admin' && row.submitted_by !== req.user!.id)) {
      throw new HttpError(404, 'Fikir bulunamadı');
    }
    ok(res, req.user!.role === 'admin' ? row : forMember(row));
  }),
);

// Admin: onayla / reddet (gerekçeli) / arşivle / arşivden çıkar / not
router.patch(
  '/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const b = req.body || {};
    const cur = await queryOne('SELECT * FROM ideas WHERE id = $1', [req.params.id]);
    if (!cur) throw new HttpError(404, 'Fikir bulunamadı');

    let status = cur.status;
    if (b.status !== undefined) {
      status = oneOf(b.status, ['pending', 'approved', 'rejected', 'archived'] as const, 'Durum');
      if (cur.status === 'converted') throw new HttpError(409, "Case'e dönüşmüş fikrin durumu değiştirilemez");
    }
    const reasonIn = pick(b, 'rejection_reason', 'rejectionReason');
    const row = await queryOne(
      `UPDATE ideas SET status=$1, admin_note=$2, rejection_reason=$3, updated_at=NOW() WHERE id=$4 RETURNING id`,
      [
        status,
        b.admin_note !== undefined ? text(b.admin_note) : cur.admin_note,
        status === 'rejected' ? (reasonIn !== undefined ? text(reasonIn) : cur.rejection_reason) : null,
        req.params.id,
      ],
    );
    ok(res, await queryOne(`${IDEA_SELECT} WHERE i.id = $1`, [row.id]));
  }),
);

// Admin: "Case Oluştur" — eski case formunun gövdesiyle, fikre bağlı case açar
router.post(
  '/:id/convert',
  requireAdmin,
  wrap(async (req, res) => {
    const idea = await queryOne('SELECT * FROM ideas WHERE id = $1', [req.params.id]);
    if (!idea) throw new HttpError(404, 'Fikir bulunamadı');
    if (idea.status === 'converted') throw new HttpError(409, "Bu fikir zaten case'e dönüştürülmüş");

    const caseId = await transaction(async (c) => {
      const id = await insertCase(c, req.body || {}, {
        ideaId: idea.id,
        memberUserId: idea.submitted_by,
        createdBy: req.user!.id,
      });
      await c.query(`UPDATE ideas SET status='converted', rejection_reason=NULL, updated_at=NOW() WHERE id=$1`, [idea.id]);
      return id;
    });
    ok(res, await queryOne(`${CASE_SELECT} WHERE c.id = $1`, [caseId]), 201);
  }),
);

router.delete(
  '/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const row = await queryOne('DELETE FROM ideas WHERE id = $1 RETURNING id', [req.params.id]);
    if (!row) throw new HttpError(404, 'Fikir bulunamadı');
    ok(res, row);
  }),
);

export default router;
