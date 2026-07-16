import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// --- Password hashing (scrypt, no external deps) ---

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(test, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

// --- Minimal HS256 JWT (no external deps) ---

export interface JwtPayload {
  sub: string; // user id
  role: string;
  name: string;
  iat?: number;
  exp?: number;
}

const b64u = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, secret: string, expiresSec: number): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64u({ alg: 'HS256', typ: 'JWT' });
  const body = b64u({ ...payload, iat: now, exp: now + expiresSec });
  const data = `${header}.${body}`;
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string, secret: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as JwtPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
