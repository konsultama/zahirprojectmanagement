import { describe, it, expect } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

// Minimal ConfigService stub: return the seeded value or the provided default.
const stubConfig = (values: Record<string, string> = {}) =>
  ({ get: (k: string, d?: string) => values[k] ?? d }) as unknown as ConfigService;

describe('EmailService', () => {
  it('runs in dry-run mode when SMTP_HOST is absent', () => {
    expect(new EmailService(stubConfig()).enabled).toBe(false);
  });

  it('is enabled when SMTP_HOST is configured', () => {
    expect(new EmailService(stubConfig({ SMTP_HOST: 'smtp.example.com' })).enabled).toBe(true);
  });

  it('no-ops (returns false) with no recipients', async () => {
    const svc = new EmailService(stubConfig());
    expect(await svc.send([], 'Subjek', 'Isi')).toBe(false);
    expect(await svc.send(['', ''], 'Subjek', 'Isi')).toBe(false);
  });

  it('composes and dry-run sends to valid recipients', async () => {
    const svc = new EmailService(stubConfig());
    expect(await svc.send(['a@b.com', 'c@d.com'], 'Subjek', 'Isi')).toBe(true);
  });
});
