import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { TelegramService } from '../notifications/telegram.service';
import { WhatsappService } from '../notifications/whatsapp.service';
import { RequestUser } from '../common/auth/current-user.middleware';

export interface TelegramDto {
  enabled?: boolean;
  botToken?: string;
  chatId?: string;
}
export interface WhatsappDto {
  enabled?: boolean;
  token?: string;
  phoneId?: string;
  recipient?: string;
  apiVersion?: string;
}

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly telegram: TelegramService,
    private readonly whatsapp: WhatsappService,
  ) {}

  private async read(prefix: string): Promise<Record<string, string>> {
    const rows = await this.prisma.appSetting.findMany({ where: { key: { startsWith: `${prefix}.` } } });
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key.slice(prefix.length + 1)] = r.value;
    return out;
  }

  private async write(prefix: string, entries: [string, string][], actor: RequestUser, redacted: object, ip?: string) {
    for (const [k, value] of entries) {
      const key = `${prefix}.${k}`;
      await this.prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    await this.audit.log({ entityType: 'AppSetting', entityId: prefix, action: AuditAction.UPDATE, actor, newValue: redacted, ipAddress: ip });
  }

  // ---- Telegram ----
  async getTelegram() {
    const db = await this.read('telegram');
    const eff = await this.telegram.resolve();
    return {
      enabled: db.enabled != null ? db.enabled === 'true' : eff.enabled,
      chatId: db.chatId ?? '',
      hasBotToken: !!db.botToken,
      effective: { enabled: eff.enabled, source: db.botToken ? 'database' : 'environment' },
    };
  }
  async updateTelegram(dto: TelegramDto, actor: RequestUser, ip?: string) {
    const e: [string, string][] = [];
    if (dto.enabled != null) e.push(['enabled', String(dto.enabled)]);
    if (dto.chatId != null) e.push(['chatId', dto.chatId.trim()]);
    if (dto.botToken) e.push(['botToken', dto.botToken.trim()]); // only when supplied
    await this.write('telegram', e, actor, { ...dto, botToken: dto.botToken ? '***' : undefined }, ip);
    return this.getTelegram();
  }
  async testTelegram() {
    try {
      const r = await this.telegram.sendTest();
      return { ...r, message: r.mode === 'telegram' ? 'Pesan uji Telegram terkirim.' : 'Telegram nonaktif — pesan uji disusun (dry-run).' };
    } catch (e) {
      return { delivered: false, mode: 'error', message: `Gagal: ${(e as Error).message}` };
    }
  }

  // ---- WhatsApp ----
  async getWhatsapp() {
    const db = await this.read('whatsapp');
    const eff = await this.whatsapp.resolve();
    return {
      enabled: db.enabled != null ? db.enabled === 'true' : eff.enabled,
      phoneId: db.phoneId ?? '',
      recipient: db.recipient ?? '',
      apiVersion: db.apiVersion ?? 'v21.0',
      hasToken: !!db.token,
      effective: { enabled: eff.enabled, source: db.token ? 'database' : 'environment' },
    };
  }
  async updateWhatsapp(dto: WhatsappDto, actor: RequestUser, ip?: string) {
    const e: [string, string][] = [];
    if (dto.enabled != null) e.push(['enabled', String(dto.enabled)]);
    if (dto.phoneId != null) e.push(['phoneId', dto.phoneId.trim()]);
    if (dto.recipient != null) e.push(['recipient', dto.recipient.trim()]);
    if (dto.apiVersion != null) e.push(['apiVersion', dto.apiVersion.trim()]);
    if (dto.token) e.push(['token', dto.token.trim()]);
    await this.write('whatsapp', e, actor, { ...dto, token: dto.token ? '***' : undefined }, ip);
    return this.getWhatsapp();
  }
  async testWhatsapp() {
    try {
      const r = await this.whatsapp.sendTest();
      return { ...r, message: r.mode === 'whatsapp' ? 'Pesan uji WhatsApp terkirim.' : 'WhatsApp nonaktif — pesan uji disusun (dry-run).' };
    } catch (e) {
      return { delivered: false, mode: 'error', message: `Gagal: ${(e as Error).message}` };
    }
  }
}
