import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

/** Merge DB overrides (AppSetting `telegram.*`) over environment defaults. */
export function resolveTelegramConfig(
  db: Record<string, string>,
  env: { get: (k: string, d?: string) => string | undefined },
): TelegramConfig {
  const botToken = (db.botToken ?? env.get('TELEGRAM_BOT_TOKEN') ?? '').trim();
  const chatId = (db.chatId ?? env.get('TELEGRAM_CHAT_ID') ?? '').trim();
  const explicit = db.enabled != null ? db.enabled === 'true' : undefined;
  return { botToken, chatId, enabled: !!botToken && !!chatId && explicit !== false };
}

/**
 * Sends notifications to a Telegram chat/group via the Bot API. Reads config at
 * send-time from the DB (AppSetting `telegram.*`) over env vars. Dry-run
 * (compose + log, no delivery) when unconfigured or disabled. Never throws in
 * the notification path.
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async resolve(): Promise<TelegramConfig> {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: 'telegram.' } } });
    const db: Record<string, string> = {};
    for (const r of rows) db[r.key.slice('telegram.'.length)] = r.value;
    return resolveTelegramConfig(db, { get: (k, d) => this.config.get<string>(k, d as string) });
  }

  /** Deliver a message. Throws on API failure (used by the test path). */
  private async deliver(cfg: TelegramConfig, text: string): Promise<void> {
    const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cfg.chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Telegram API ${res.status}: ${body.slice(0, 200)}`);
    }
  }

  /** Best-effort send for notifications (never throws). */
  async send(text: string): Promise<boolean> {
    try {
      const cfg = await this.resolve();
      if (!cfg.enabled) {
        this.logger.debug(`Telegram (dry-run, nonaktif): ${text.replace(/\n/g, ' | ')}`);
        return true;
      }
      await this.deliver(cfg, text);
      return true;
    } catch (e) {
      this.logger.warn(`Gagal mengirim Telegram: ${(e as Error).message}`);
      return false;
    }
  }

  /** Test send — surfaces errors to the caller. */
  async sendTest(): Promise<{ delivered: boolean; mode: 'telegram' | 'dry-run' }> {
    const cfg = await this.resolve();
    const text = 'Uji notifikasi Telegram dari Zahir Project Management. Konfigurasi sudah benar bila pesan ini diterima.';
    if (!cfg.enabled) return { delivered: false, mode: 'dry-run' };
    await this.deliver(cfg, text);
    return { delivered: true, mode: 'telegram' };
  }
}
