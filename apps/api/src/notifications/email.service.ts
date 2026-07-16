import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/** Merge DB overrides (AppSetting `smtp.*`) over environment defaults. */
export function resolveSmtpConfig(
  db: Record<string, string>,
  env: { get: (k: string, d?: string) => string | undefined },
): SmtpConfig {
  const host = (db.host ?? env.get('SMTP_HOST') ?? '').trim();
  const explicitEnabled = db.enabled != null ? db.enabled === 'true' : undefined;
  return {
    host,
    port: Number(db.port ?? env.get('SMTP_PORT', '587')) || 587,
    secure: (db.secure ?? env.get('SMTP_SECURE', 'false')) === 'true',
    user: db.user ?? env.get('SMTP_USER', '') ?? '',
    pass: db.pass ?? env.get('SMTP_PASS', '') ?? '',
    from: (db.from ?? env.get('SMTP_FROM', 'Zahir PM <no-reply@zahir.local>')) as string,
    // Enabled only when there is a host and it hasn't been explicitly turned off.
    enabled: !!host && explicitEnabled !== false,
  };
}

/**
 * Sends transactional emails. Configuration is read at send-time from the DB
 * (AppSetting `smtp.*`, editable by Admin in Pengaturan) layered over env vars.
 * When no host is configured or SMTP is disabled it falls back to nodemailer's
 * jsonTransport — messages are composed and logged but not delivered, so dev
 * works without a mail server. Never throws in the notification path.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Effective SMTP config (DB over env). */
  async resolve(): Promise<SmtpConfig> {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: 'smtp.' } } });
    const db: Record<string, string> = {};
    for (const r of rows) db[r.key.slice('smtp.'.length)] = r.value;
    return resolveSmtpConfig(db, { get: (k, d) => this.config.get<string>(k, d as string) });
  }

  private transportFor(cfg: SmtpConfig): Transporter {
    if (cfg.enabled && cfg.host) {
      return nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
      });
    }
    return nodemailer.createTransport({ jsonTransport: true });
  }

  /** Send one email (bcc) to a list of recipients. Returns false on no-op/failure. */
  async send(recipients: string[], subject: string, text: string): Promise<boolean> {
    const to = recipients.filter((r) => !!r);
    if (to.length === 0) return false;
    try {
      const cfg = await this.resolve();
      const info = await this.transportFor(cfg).sendMail({ from: cfg.from, bcc: to, subject, text });
      if (!cfg.enabled) this.logger.debug(`Email (dry-run, SMTP nonaktif): ${info.message as string}`);
      return true;
    } catch (e) {
      this.logger.warn(`Gagal mengirim email: ${(e as Error).message}`);
      return false;
    }
  }

  /** Send a test email to verify the configuration. Throws on SMTP failure. */
  async sendTest(to: string): Promise<{ delivered: boolean; mode: 'smtp' | 'dry-run' }> {
    const cfg = await this.resolve();
    await this.transportFor(cfg).sendMail({
      from: cfg.from,
      to,
      subject: '[Zahir PM] Uji koneksi email',
      text: 'Ini adalah email uji dari Zahir Project Management. Jika Anda menerimanya, konfigurasi SMTP sudah benar.',
    });
    return { delivered: cfg.enabled, mode: cfg.enabled ? 'smtp' : 'dry-run' };
  }
}
