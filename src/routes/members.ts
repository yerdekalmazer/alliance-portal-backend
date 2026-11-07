import { Router } from 'express';
import { generatePassword, hashPassword, requireAdmin, requireAuth } from '../auth';
import { query, queryOne, transaction } from '../db';
import { HttpError, checkNewPassword, email, ok, oneOf, pick, requiredText, text, textArray, wrap } from '../util';

const router = Router();
router.use(requireAuth, requireAdmin);

export const MEMBER_SELECT = `
  SELECT u.id AS user_id, u.email, u.name, u.last_login_at, u.created_at,
         m.id, m.organization, m.department, m.position, m.phone, m.website, m.expertise,
         m.contact_preference, m.notes, m.status, m.application_id,
         (SELECT COUNT(*)::int FROM ideas i WHERE i.submitted_by = u.id) AS idea_count,
         (SELECT COUNT(*)::int FROM cases c WHERE c.member_user_id = u.id) AS case_count
    FROM alliance_members m JOIN users u ON u.id = m.user_id`;

router.get(
  '/',
  wrap(async (_req, res) => {
    ok(res, await query(`${MEMBER_SELECT} ORDER BY m.organization NULLS LAST, u.name`));
  }),
);

router.get(
  '/:userId',
  wrap(async (req, res) => {
    const row = await queryOne(`${MEMBER_SELECT} WHERE u.id = $1`, [req.params.userId]);
    if (!row) throw new HttpError(404, 'Üye bulunamadı');
    ok(res, row);
  }),
);

/** "Partner Ekle" formu (başvurudan ya da doğrudan) */
router.post(
  '/',
  wrap(async (req, res) => {
    const b = req.body || {};
    const mail = email(b.email);
    const name = requiredText(pick(b, 'fullName', 'full_name', 'name'), 'Ad Soyad', 200);
    if (await queryOne('SELECT id FROM users WHERE email = $1', [mail])) {
      throw new HttpError(409, `${mail} adresiyle zaten bir hesap var`);
    }
    const password = text(b.password, 200) || generatePassword();
    checkNewPassword(password);
    const hash = await hashPassword(password);

    const userId = await transaction(async (c) => {
      const u = (
        await c.query(
          `INSERT INTO users (email, name, role, password_hash) VALUES ($1,$2,'alliance',$3) RETURNING id`,
          [mail, name, hash],
        )
      ).rows[0];
      await c.query(
        `INSERT INTO alliance_members
           (user_id, application_id, organization, position, phone, website, expertise, contact_preference, notes, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          u.id,
          text(pick(b, 'applicationId', 'application_id'), 64),
          text(b.organization, 300),
          text(pick(b, 'position', 'role'), 200),
          text(b.phone, 50),
          text(b.website, 500),
          textArray(b.expertise),
          text(pick(b, 'contactPreference', 'contact_preference'), 20) || 'email',
          text(b.notes),
          b.status === 'inactive' ? 'inactive' : 'active',
        ],
      );
      return u.id as string;
    });

    ok(res, { member: await queryOne(`${MEMBER_SELECT} WHERE u.id = $1`, [userId]), password }, 201);
  }),
);

/** "Partner Düzenle" formu — yeni şifre boşsa mevcut şifre değişmez */
router.put(
  '/:userId',
  wrap(async (req, res) => {
    const b = req.body || {};
    const current = await queryOne(`${MEMBER_SELECT} WHERE u.id = $1`, [req.params.userId]);
    if (!current) throw new HttpError(404, 'Üye bulunamadı');

    const mail = b.email !== undefined ? email(b.email) : current.email;
    if (mail !== current.email && (await queryOne('SELECT id FROM users WHERE email = $1', [mail]))) {
      throw new HttpError(409, `${mail} adresiyle zaten bir hesap var`);
    }
    const nameIn = pick(b, 'fullName', 'full_name', 'name');
    const name = nameIn !== undefined ? requiredText(nameIn, 'Ad Soyad', 200) : current.name;
    const status = b.status !== undefined ? oneOf(b.status, ['active', 'inactive'] as const, 'Durum') : current.status;
    const newPassword = text(b.password, 200);
    if (newPassword) checkNewPassword(newPassword);
    const positionIn = pick(b, 'position', 'role');
    const keep = (key: string, value: unknown, fn: (v: unknown) => unknown) => (value !== undefined ? fn(value) : current[key]);

    await transaction(async (c) => {
      await c.query('UPDATE users SET email = $1, name = $2, updated_at = NOW() WHERE id = $3', [mail, name, req.params.userId]);
      if (newPassword) {
        await c.query('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(newPassword), req.params.userId]);
      }
      await c.query(
        `UPDATE alliance_members
            SET organization=$1, position=$2, phone=$3, website=$4, expertise=$5, notes=$6, status=$7,
                department=$8, updated_at=NOW()
          WHERE user_id = $9`,
        [
          keep('organization', b.organization, (v) => text(v, 300)),
          keep('position', positionIn, (v) => text(v, 200)),
          keep('phone', b.phone, (v) => text(v, 50)),
          keep('website', b.website, (v) => text(v, 500)),
          keep('expertise', b.expertise, textArray),
          keep('notes', b.notes, (v) => text(v)),
          status,
          keep('department', b.department, (v) => text(v, 300)),
          req.params.userId,
        ],
      );
    });
    ok(res, await queryOne(`${MEMBER_SELECT} WHERE u.id = $1`, [req.params.userId]));
  }),
);

/** Hesabı siler; fikirler ve case'ler kalır (gönderen boş görünür). */
router.delete(
  '/:userId',
  wrap(async (req, res) => {
    const row = await queryOne(`DELETE FROM users WHERE id = $1 AND role = 'alliance' RETURNING id`, [req.params.userId]);
    if (!row) throw new HttpError(404, 'Üye bulunamadı');
    ok(res, row);
  }),
);

export default router;
