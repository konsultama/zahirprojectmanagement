import { describe, it, expect } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import { EmailService, resolveSmtpConfig } from './email.service';

const env = (values: Record<string, string> = {}) => ({
  get: (k: string, d?: string) => values[k] ?? d,
});

describe('resolveSmtpConfig', () => {
  it('is dry-run (disabled) when no host anywhere', () => {
    const cfg = resolveSmtpConfig({}, env());
    expect(cfg.enabled).toBe(false);
  });

  it('enables from the env host', () => {
    const cfg = resolveSmtpConfig({}, env({ SMTP_HOST: 'smtp.env.com' }));
    expect(cfg).toMatchObject({ enabled: true, host: 'smtp.env.com', port: 587 });
  });

  it('lets DB settings override env', () => {
    const cfg = resolveSmtpConfig(
      { host: 'smtp.db.com', port: '2525', secure: 'true', user: 'u', from: 'DB <a@b.com>' },
      env({ SMTP_HOST: 'smtp.env.com', SMTP_PORT: '587' }),
    );
    expect(cfg).toMatchObject({ host: 'smtp.db.com', port: 2525, secure: true, user: 'u', from: 'DB <a@b.com>', enabled: true });
  });

  it('respects an explicit disable even with a host', () => {
    const cfg = resolveSmtpConfig({ host: 'smtp.db.com', enabled: 'false' }, env());
    expect(cfg.enabled).toBe(false);
  });
});

describe('EmailService', () => {
  // Stub Prisma so no smtp.* rows exist → falls back to env (dry-run here).
  const stub = (smtpRows: { key: string; value: string }[] = []) =>
    new EmailService(
      { appSetting: { findMany: async () => smtpRows } } as unknown as PrismaService,
      env() as unknown as ConfigService,
    );

  it('no-ops (returns false) with no recipients', async () => {
    expect(await stub().send([], 'Subjek', 'Isi')).toBe(false);
    expect(await stub().send(['', ''], 'Subjek', 'Isi')).toBe(false);
  });

  it('composes and dry-run sends to valid recipients', async () => {
    expect(await stub().send(['a@b.com', 'c@d.com'], 'Subjek', 'Isi')).toBe(true);
  });

  it('sendTest reports dry-run mode when SMTP is unconfigured', async () => {
    expect(await stub().sendTest('a@b.com')).toEqual({ delivered: false, mode: 'dry-run' });
  });
});
