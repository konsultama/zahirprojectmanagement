import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestUser } from '../common/auth/current-user.middleware';

export interface SmtpDto {
  enabled?: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

const KEYS = ['enabled', 'host', 'port', 'secure', 'user', 'from'] as const;

@Injectable()
export class SmtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  /** Current settings for the form. The password is never returned — only a flag. */
  async get() {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: 'smtp.' } } });
    const db: Record<string, string> = {};
    for (const r of rows) db[r.key.slice(5)] = r.value;
    const eff = await this.email.resolve();
    return {
      enabled: db.enabled != null ? db.enabled === 'true' : eff.enabled,
      host: db.host ?? '',
      port: db.port ? Number(db.port) : 587,
      secure: db.secure === 'true',
      user: db.user ?? '',
      from: db.from ?? '',
      hasPassword: !!db.pass,
      // What the app will actually use once env fallback is applied.
      effective: { enabled: eff.enabled, host: eff.host, from: eff.from, source: db.host ? 'database' : 'environment' },
    };
  }

  async update(dto: SmtpDto, actor: RequestUser, ip?: string) {
    const entries: [string, string][] = [];
    if (dto.enabled != null) entries.push(['smtp.enabled', String(dto.enabled)]);
    if (dto.host != null) entries.push(['smtp.host', dto.host.trim()]);
    if (dto.port != null) entries.push(['smtp.port', String(dto.port)]);
    if (dto.secure != null) entries.push(['smtp.secure', String(dto.secure)]);
    if (dto.user != null) entries.push(['smtp.user', dto.user.trim()]);
    if (dto.from != null) entries.push(['smtp.from', dto.from.trim()]);
    // Only overwrite the password when a non-empty value is supplied.
    if (dto.pass) entries.push(['smtp.pass', dto.pass]);

    for (const [key, value] of entries) {
      await this.prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    await this.audit.log({
      entityType: 'AppSetting',
      entityId: 'smtp',
      action: AuditAction.UPDATE,
      actor,
      newValue: { ...dto, pass: dto.pass ? '***' : undefined },
      ipAddress: ip,
    });
    return this.get();
  }

  async test(to: string): Promise<{ delivered: boolean; mode: string; message: string }> {
    try {
      const res = await this.email.sendTest(to);
      return {
        ...res,
        message:
          res.mode === 'smtp'
            ? `Email uji terkirim ke ${to} via SMTP.`
            : `SMTP nonaktif — email uji disusun (dry-run), tidak dikirim. Aktifkan & isi host untuk pengiriman nyata.`,
      };
    } catch (e) {
      // Surface the SMTP failure to the admin instead of a 500.
      return { delivered: false, mode: 'error', message: `Gagal mengirim: ${(e as Error).message}` };
    }
  }
}
