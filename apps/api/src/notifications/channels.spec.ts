import { describe, it, expect } from 'vitest';
import { resolveTelegramConfig } from './telegram.service';
import { resolveWhatsappConfig } from './whatsapp.service';

const env = (values: Record<string, string> = {}) => ({ get: (k: string, d?: string) => values[k] ?? d });

describe('resolveTelegramConfig', () => {
  it('is disabled without a token+chat', () => {
    expect(resolveTelegramConfig({}, env()).enabled).toBe(false);
    expect(resolveTelegramConfig({ botToken: 't' }, env()).enabled).toBe(false); // no chatId
  });
  it('enables with token + chat from env', () => {
    const c = resolveTelegramConfig({}, env({ TELEGRAM_BOT_TOKEN: 'abc', TELEGRAM_CHAT_ID: '42' }));
    expect(c).toMatchObject({ enabled: true, botToken: 'abc', chatId: '42' });
  });
  it('DB overrides env and respects explicit disable', () => {
    expect(resolveTelegramConfig({ botToken: 'db', chatId: '9' }, env({ TELEGRAM_BOT_TOKEN: 'env' })).botToken).toBe('db');
    expect(resolveTelegramConfig({ botToken: 'db', chatId: '9', enabled: 'false' }, env()).enabled).toBe(false);
  });
});

describe('resolveWhatsappConfig', () => {
  it('needs token + phoneId + recipient to enable', () => {
    expect(resolveWhatsappConfig({}, env()).enabled).toBe(false);
    expect(resolveWhatsappConfig({ token: 't', phoneId: 'p' }, env()).enabled).toBe(false); // no recipient
    expect(resolveWhatsappConfig({ token: 't', phoneId: 'p', recipient: '628' }, env()).enabled).toBe(true);
  });
  it('defaults the API version and honors overrides', () => {
    expect(resolveWhatsappConfig({}, env()).apiVersion).toBe('v21.0');
    expect(resolveWhatsappConfig({ apiVersion: 'v20.0' }, env()).apiVersion).toBe('v20.0');
  });
  it('respects explicit disable even when fully configured', () => {
    const c = resolveWhatsappConfig({ token: 't', phoneId: 'p', recipient: '628', enabled: 'false' }, env());
    expect(c.enabled).toBe(false);
  });
});
