import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface WhatsappConfig {
  enabled: boolean;
  token: string;
  phoneId: string;
  recipient: string;
  apiVersion: string;
}

/** Merge DB overrides (AppSetting `whatsapp.*`) over environment defaults. */
export function resolveWhatsappConfig(
  db: Record<string, string>,
  env: { get: (k: string, d?: string) => string | undefined },
): WhatsappConfig {
  const token = (db.token ?? env.get('WHATSAPP_TOKEN') ?? '').trim();
  const phoneId = (db.phoneId ?? env.get('WHATSAPP_PHONE_ID') ?? '').trim();
  const recipient = (db.recipient ?? env.get('WHATSAPP_RECIPIENT') ?? '').trim();
  const explicit = db.enabled != null ? db.enabled === 'true' : undefined;
  return {
    token,
    phoneId,
    recipient,
    apiVersion: (db.apiVersion ?? env.get('WHATSAPP_API_VERSION', 'v21.0')) as string,
    enabled: !!token && !!phoneId && !!recipient && explicit !== false,
  };
}

/**
 * Sends notifications via the Meta WhatsApp Cloud API. Reads config at send-time
 * from the DB (AppSetting `whatsapp.*`) over env vars. Dry-run (compose + log,
 * no delivery) when unconfigured or disabled. Never throws in the notification
 * path.
 *
 * Note: plain text delivery requires an open 24h customer-service window; for
 * business-initiated alerts Meta requires an approved message template.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async resolve(): Promise<WhatsappConfig> {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: 'whatsapp.' } } });
    const db: Record<string, string> = {};
    for (const r of rows) db[r.key.slice('whatsapp.'.length)] = r.value;
    return resolveWhatsappConfig(db, { get: (k, d) => this.config.get<string>(k, d as string) });
  }

  private async deliver(cfg: WhatsappConfig, text: string): Promise<void> {
    const res = await fetch(`https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: cfg.recipient, type: 'text', text: { body: text } }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`WhatsApp API ${res.status}: ${body.slice(0, 200)}`);
    }
  }

  async send(text: string): Promise<boolean> {
    try {
      const cfg = await this.resolve();
      if (!cfg.enabled) {
        this.logger.debug(`WhatsApp (dry-run, nonaktif): ${text.replace(/\n/g, ' | ')}`);
        return true;
      }
      await this.deliver(cfg, text);
      return true;
    } catch (e) {
      this.logger.warn(`Gagal mengirim WhatsApp: ${(e as Error).message}`);
      return false;
    }
  }

  async sendTest(): Promise<{ delivered: boolean; mode: 'whatsapp' | 'dry-run' }> {
    const cfg = await this.resolve();
    const text = 'Uji notifikasi WhatsApp dari Zahir Project Management.';
    if (!cfg.enabled) return { delivered: false, mode: 'dry-run' };
    await this.deliver(cfg, text);
    return { delivered: true, mode: 'whatsapp' };
  }
}
