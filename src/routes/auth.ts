import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { checkPassword, hashPassword, requireAuth, signToken } from '../auth';
import { query, queryOne, transaction } from '../db';
import { HttpError, checkNewPassword, email, ok, pick, requiredText, text, wrap } from '../util';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Çok fazla deneme yapıldı, 15 dakika sonra tekrar deneyin' },
});

const PROFILE_SELECT = `
  SELECT u.id, u.email, u.name, u.role, u.created_at, u.updated_at,
         m.organization, m.department, m.position, m.phone, m.website
    FROM users u LEFT JOIN alliance_members m ON m.user_id = u.id
   WHERE u.id = $1`;

router.post(
  '/login',
  loginLimiter,
  wrap(async (req, res) => {
    const mail = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!mail || !password) throw new HttpError(400, 'E-posta ve şifre gerekli');

    const row = await queryOne(
      `SELECT u.id, u.email, u.name, u.role, u.password_hash, u.created_at, u.updated_at, m.status AS member_status
         FROM users u LEFT JOIN alliance_members m ON m.user_id = u.id
        WHERE u.email = $1`,
      [mail],
    );
    if (!row || !(await checkPassword(password, row.password_hash))) {
      throw new HttpError(401, 'E-posta veya şifre hatalı');
    }
    if (row.role === 'alliance' && row.member_status && row.member_status !== 'active') {
      throw new HttpError(403, 'Hesabınız pasif durumda, Divizyon ekibiyle iletişime geçin');
    }

    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [row.id]);
    const user = { id: row.id, email: row.email, name: row.name, role: row.role };
    ok(res, {
      user: { ...user, created_at: row.created_at, updated_at: row.updated_at },
      token: signToken(user),
    });
  }),
);

router.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    ok(res, await queryOne(PROFILE_SELECT, [req.user!.id]));
  }),
);

/**
 * "Profil Bilgilerim" formu: ad, e-posta, kurum, departman, pozisyon, telefon
 * ve isteğe bağlı şifre değişikliği (mevcut şifre ile).
 */
router.put(
  '/profile',
  requireAuth,
  wrap(async (req, res) => {
    const b = req.body || {};
    const me = await queryOne('SELECT * FROM users WHERE id = $1', [req.user!.id]);
    if (!me) throw new HttpError(404, 'Kullanıcı bulunamadı');

    const name = b.name !== undefined ? requiredText(b.name, 'Ad soyad', 200) : me.name;
    const mail = b.email !== undefined ? email(b.email) : me.email;
    if (mail !== me.email && (await queryOne('SELECT id FROM users WHERE email = $1', [mail]))) {
      throw new HttpError(409, `${mail} adresiyle zaten bir hesap var`);
    }

    const newPassword = String(pick(b, 'newPassword', 'new_password') || '');
    let hash: string = me.password_hash;
    if (newPassword) {
      const current = String(pick(b, 'currentPassword', 'current_password') || '');
      if (!(await checkPassword(current, me.password_hash))) throw new HttpError(400, 'Mevcut şifre hatalı');
      checkNewPassword(newPassword);
      hash = await hashPassword(newPassword);
    }

    await transaction(async (c) => {
      await c.query('UPDATE users SET name=$1, email=$2, password_hash=$3, updated_at=NOW() WHERE id=$4', [
        name,
        mail,
        hash,
        me.id,
      ]);
      if (me.role === 'alliance') {
        await c.query(
          `UPDATE alliance_members SET organization=$1, department=$2, position=$3, phone=$4, updated_at=NOW()
            WHERE user_id=$5`,
          [text(b.organization, 300), text(b.department, 300), text(b.position, 200), text(b.phone, 50), me.id],
        );
      }
    });
    ok(res, await queryOne(PROFILE_SELECT, [me.id]));
  }),
);

router.post('/logout', (_req, res) => ok(res, null));

export default router;
