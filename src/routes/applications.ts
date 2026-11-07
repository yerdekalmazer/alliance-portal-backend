import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { generatePassword, hashPassword, requireAdmin, requireAuth } from '../auth';
import { query, queryOne, transaction } from '../db';
import { HttpError, bool, checkNewPassword, email, ok, pick, requiredText, text, textArray, wrap } from '../util';

const router = Router();

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Çok fazla başvuru gönderildi, biraz sonra tekrar deneyin' },
});

// Herkese açık başvuru formu
router.post(
  '/',
  submitLimiter,
  wrap(async (req, res) => {
    const b = req.body || {};
    const row = await queryOne(
      `INSERT INTO alliance_applications
         (organization_name, website, profile, contact_name, contact_title, email, phone,
          motivation, roles, other_role, archetype, contribution, confirm_accuracy, confirm_contact)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id, created_at`,
      [
        requiredText(pick(b, 'organizationName', 'organization_name'), 'Kurum adı'),
        text(b.website, 500),
        text(b.profile),
        requiredText(pick(b, 'contactName', 'contact_name'), 'İletişim kişisi'),
        text(pick(b, 'contactTitle', 'contact_title'), 200),
        email(b.email),
        text(b.phone, 50),
        text(b.motivation),
        textArray(b.roles),
        text(pick(b, 'otherRole', 'other_role'), 200),
        text(b.archetype, 200),
        text(b.contribution),
        bool(pick(b, 'confirmAccuracy', 'confirm_accuracy')),
        bool(pick(b, 'confirmContact', 'confirm_contact')),
      ],
    );
    ok(res, row, 201);
  }),
);

router.use(requireAuth, requireAdmin);

router.get(
  '/',
  wrap(async (req, res) => {
    const status = text(req.query.status, 20);
    const rows = await query(
      `SELECT a.*, r.name AS reviewed_by_name
         FROM alliance_applications a LEFT JOIN users r ON r.id = a.reviewed_by
        WHERE ($1::text IS NULL OR a.status = $1)
        ORDER BY (a.status = 'pending') DESC, a.created_at DESC`,
      [status],
    );
    ok(res, rows);
  }),
);

/**
 * Onay: kullanıcı hesabı + alliance üyesi kaydı açılır.
 * Şifre gövdede verilmezse üretilir ve yalnızca bu yanıtta bir kez döner.
 */
router.post(
  '/:id/approve',
  wrap(async (req, res) => {
    const app = await queryOne('SELECT * FROM alliance_applications WHERE id = $1', [req.params.id]);
    if (!app) throw new HttpError(404, 'Başvuru bulunamadı');
    if (app.status === 'approved') throw new HttpError(409, 'Bu başvuru zaten onaylanmış');

    const exists = await queryOne('SELECT id FROM users WHERE email = $1', [app.email]);
    if (exists) throw new HttpError(409, `${app.email} adresiyle zaten bir hesap var`);

    const password = text(req.body?.password, 200) || generatePassword();
    checkNewPassword(password);
    const hash = await hashPassword(password);

    const result = await transaction(async (c) => {
      const user = (
        await c.query(
          `INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, 'alliance', $3)
           RETURNING id, email, name, role`,
          [app.email, app.contact_name, hash],
        )
      ).rows[0];
      await c.query(
        `INSERT INTO alliance_members (user_id, application_id, organization, position, phone, website, expertise, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.id,
          app.id,
          app.organization_name,
          app.contact_title,
          app.phone,
          app.website,
          app.roles || [],
          app.motivation ? `Başvuru motivasyonu: ${app.motivation}` : null,
        ],
      );
      await c.query(
        `UPDATE alliance_applications
            SET status = 'approved', admin_notes = COALESCE($2, admin_notes), reviewed_by = $3, reviewed_at = NOW()
          WHERE id = $1`,
        [app.id, text(req.body?.adminNotes), req.user!.id],
      );
      return user;
    });

    ok(res, { user: result, password });
  }),
);

router.post(
  '/:id/reject',
  wrap(async (req, res) => {
    const row = await queryOne(
      `UPDATE alliance_applications
          SET status = 'rejected', admin_notes = COALESCE($2, admin_notes), reviewed_by = $3, reviewed_at = NOW()
        WHERE id = $1 AND status <> 'approved'
        RETURNING *`,
      [req.params.id, text(req.body?.adminNotes), req.user!.id],
    );
    if (!row) throw new HttpError(404, 'Başvuru bulunamadı ya da zaten onaylanmış');
    ok(res, row);
  }),
);

router.delete(
  '/:id',
  wrap(async (req, res) => {
    const row = await queryOne('DELETE FROM alliance_applications WHERE id = $1 RETURNING id', [req.params.id]);
    if (!row) throw new HttpError(404, 'Başvuru bulunamadı');
    ok(res, row);
  }),
);

export default router;
