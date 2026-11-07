import { hashPassword } from './auth';
import { query, queryOne } from './db';

/**
 * ADMIN_EMAIL + ADMIN_PASSWORD tanımlıysa ve o e-postayla kullanıcı yoksa admin hesabı açar.
 * Var olan hesaba dokunmaz (şifre her açılışta sıfırlanmaz).
 */
export async function ensureAdminFromEnv(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (password.length < 8) throw new Error('ADMIN_PASSWORD en az 8 karakter olmalı');

  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) return;

  await query(`INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, 'admin', $3)`, [
    email,
    process.env.ADMIN_NAME?.trim() || 'Divizyon Admin',
    await hashPassword(password),
  ]);
  console.log(`Admin hesabı açıldı: ${email}`);
}
