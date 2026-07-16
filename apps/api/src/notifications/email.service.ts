import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Sends transactional emails. When SMTP_HOST is configured it delivers via SMTP;
 * otherwise it falls back to nodemailer's jsonTransport — messages are composed
 * and logged but not delivered, so development works without a mail server.
 * Never throws: a mail failure must not break the business op.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transport: Transporter;
  private readonly from: string;
  readonly enabled: boolean;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get<string>('SMTP_FROM', 'Zahir PM <no-reply@zahir.local>');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    if (host) {
      this.transport = nodemailer.createTransport({
        host,
        port: Number(config.get<string>('SMTP_PORT', '587')),
        secure: config.get<string>('SMTP_SECURE') === 'true',
        auth: user ? { user, pass } : undefined,
      });
      this.enabled = true;
    } else {
      // No SMTP configured → compose only (dry run), don't deliver.
      this.transport = nodemailer.createTransport({ jsonTransport: true });
      this.enabled = false;
    }
  }

  /** Send one email to a list of recipients (bcc). Returns false on no-op/failure. */
  async send(recipients: string[], subject: string, text: string): Promise<boolean> {
    const to = recipients.filter((r) => !!r);
    if (to.length === 0) return false;
    try {
      const info = await this.transport.sendMail({ from: this.from, bcc: to, subject, text });
      if (!this.enabled) {
        // jsonTransport returns the composed message as JSON on info.message
        this.logger.debug(`Email (dry-run, SMTP tidak dikonfigurasi): ${info.message as string}`);
      }
      return true;
    } catch (e) {
      this.logger.warn(`Gagal mengirim email: ${(e as Error).message}`);
      return false;
    }
  }
}
