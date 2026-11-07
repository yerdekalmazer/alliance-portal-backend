import { NextFunction, Request, RequestHandler, Response } from 'express';

/** async route hatalarını merkezi hata yakalayıcıya iletir */
export const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Boş string → null, kırpılmış metin döner. */
export function text(value: unknown, max = 10000): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, max);
}

export function requiredText(value: unknown, field: string, max = 500): string {
  const s = text(value, max);
  if (!s) throw new HttpError(400, `${field} zorunlu`);
  return s;
}

export function textArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean).slice(0, 50);
}

export function dateOrNull(value: unknown): string | null {
  const s = text(value, 20);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new HttpError(400, `Geçersiz tarih: ${s}`);
  return s;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (!allowed.includes(value as T)) {
    throw new HttpError(400, `${field} şunlardan biri olmalı: ${allowed.join(', ')}`);
  }
  return value as T;
}

export function email(value: unknown): string {
  const s = requiredText(value, 'E-posta', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new HttpError(400, 'Geçerli bir e-posta girin');
  return s;
}

/** İlk tanımlı değeri döndürür — hem camelCase hem snake_case gövde kabul etmek için. */
export function pick(body: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (body[k] !== undefined) return body[k];
  }
  return undefined;
}

/** Eski formlardaki kural: en az 6 karakter */
export const MIN_PASSWORD = 6;
export function checkNewPassword(p: string) {
  if (p.length < MIN_PASSWORD) throw new HttpError(400, `Şifre en az ${MIN_PASSWORD} karakter olmalıdır`);
}

export function bool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

export const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });
