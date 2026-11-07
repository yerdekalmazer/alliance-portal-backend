import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { queryOne } from './db';

export type Role = 'admin' | 'alliance';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('JWT_SECRET en az 16 karakter olmalı');
  return s;
}

const TOKEN_TTL = process.env.JWT_TTL || '7d';

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const checkPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, role: user.role }, secret(), {
    expiresIn: TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

/** Okunaklı geçici şifre: karışan karakterler (0/O, 1/l) yok. */
export function generatePassword(length = 12): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, error: 'Oturum gerekli' });

  try {
    const payload = jwt.verify(token, secret()) as { sub: string };
    const user = await queryOne<AuthUser>(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [payload.sub],
    );
    if (!user) return res.status(401).json({ success: false, error: 'Kullanıcı bulunamadı' });

    if (user.role === 'alliance') {
      const member = await queryOne<{ status: string }>(
        'SELECT status FROM alliance_members WHERE user_id = $1',
        [user.id],
      );
      if (member && member.status !== 'active') {
        return res.status(403).json({ success: false, error: 'Hesabınız pasif durumda' });
      }
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Oturum süresi doldu, tekrar giriş yapın' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Bu işlem için admin yetkisi gerekli' });
  }
  next();
}

export function requireAlliance(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'alliance') {
    return res.status(403).json({ success: false, error: 'Bu işlem alliance üyelerine açık' });
  }
  next();
}
