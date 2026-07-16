import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, signToken, verifyToken } from './jwt.util';

const SECRET = 'test-secret-abc';

describe('password hashing (scrypt)', () => {
  it('verifies a correct password against its own hash', () => {
    const stored = hashPassword('zahir123');
    expect(verifyPassword('zahir123', stored)).toBe(true);
  });

  it('rejects a wrong password', () => {
    const stored = hashPassword('zahir123');
    expect(verifyPassword('salah', stored)).toBe(false);
  });

  it('uses a random salt so two hashes of the same password differ', () => {
    expect(hashPassword('zahir123')).not.toBe(hashPassword('zahir123'));
  });

  it('rejects null / malformed stored values without throwing', () => {
    expect(verifyPassword('x', null)).toBe(false);
    expect(verifyPassword('x', undefined)).toBe(false);
    expect(verifyPassword('x', 'no-colon')).toBe(false);
  });
});

describe('HS256 JWT', () => {
  it('round-trips a payload', () => {
    const token = signToken({ sub: 'u1', role: 'PM', name: 'Andi' }, SECRET, 3600);
    const payload = verifyToken(token, SECRET);
    expect(payload).toMatchObject({ sub: 'u1', role: 'PM', name: 'Andi' });
    expect(payload?.iat).toBeTypeOf('number');
    expect(payload?.exp).toBeTypeOf('number');
  });

  it('rejects a token signed with a different secret', () => {
    const token = signToken({ sub: 'u1', role: 'PM', name: 'Andi' }, SECRET, 3600);
    expect(verifyToken(token, 'other-secret')).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const token = signToken({ sub: 'u1', role: 'VIEWER', name: 'Andi' }, SECRET, 3600);
    const [h, , s] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'u1', role: 'ADMIN', name: 'Andi' })).toString('base64url');
    expect(verifyToken(`${h}.${forged}.${s}`, SECRET)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = signToken({ sub: 'u1', role: 'PM', name: 'Andi' }, SECRET, -10);
    expect(verifyToken(token, SECRET)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifyToken('not-a-jwt', SECRET)).toBeNull();
    expect(verifyToken('a.b', SECRET)).toBeNull();
  });
});
