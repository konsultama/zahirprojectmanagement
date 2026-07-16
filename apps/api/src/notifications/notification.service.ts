import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Observable, Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { TelegramService } from './telegram.service';
import { WhatsappService } from './whatsapp.service';

export interface NotifyData {
  type: string;
  title: string;
  message: string;
  projectId?: string;
}

/** All event types that CAN be routed to external channels, with labels. */
export const NOTIFY_EVENTS: { type: string; label: string }[] = [
  { type: 'STAGE_APPROVED', label: 'Tahap disetujui' },
  { type: 'STAGE_REJECTED', label: 'Tahap ditolak' },
  { type: 'QC_FAILED', label: 'QC gagal' },
  { type: 'OVERBUDGET', label: 'Planning overbudget' },
  { type: 'PROJECT_CLOSED', label: 'Proyek ditutup' },
];

/** Default set dispatched to external channels when nothing is configured. */
export const DEFAULT_EXTERNAL_EVENTS = ['STAGE_REJECTED', 'QC_FAILED', 'OVERBUDGET', 'PROJECT_CLOSED'];

const EVENT_CACHE_TTL_MS = 30_000;

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly telegram: TelegramService,
    private readonly whatsapp: WhatsappService,
  ) {}

  private eventCache: { at: number; set: Set<string> } | null = null;

  /** Event types configured to fan out to external channels (cached, DB-backed). */
  private async externalEvents(): Promise<Set<string>> {
    const now = Date.now();
    if (this.eventCache && now - this.eventCache.at < EVENT_CACHE_TTL_MS) return this.eventCache.set;
    let set = new Set(DEFAULT_EXTERNAL_EVENTS);
    try {
      const row = await this.prisma.appSetting.findUnique({ where: { key: 'notify.externalEvents' } });
      if (row) set = new Set(row.value.split(',').map((s) => s.trim()).filter(Boolean));
    } catch {
      /* fall back to defaults */
    }
    this.eventCache = { at: now, set };
    return set;
  }

  /** Invalidate the routing cache (called when the setting changes). */
  invalidateEventCache(): void {
    this.eventCache = null;
  }

  /**
   * For configured high-priority events, also push to external channels (never
   * throws): email each recipient, and broadcast once to Telegram/WhatsApp.
   */
  private async dispatchExternal(userIds: Iterable<string>, data: NotifyData): Promise<void> {
    if (!(await this.externalEvents()).has(data.type)) return;
    try {
      const ids = [...userIds];
      // Email — one per recipient.
      if (ids.length > 0) {
        const users = await this.prisma.user.findMany({
          where: { id: { in: ids }, deletedAt: null, email: { not: '' } },
          select: { email: true },
        });
        const emails = users.map((u) => u.email).filter((e): e is string => !!e);
        if (emails.length > 0) await this.email.send(emails, `[Zahir PM] ${data.title}`, data.message);
      }
      // Telegram / WhatsApp — one broadcast to the configured channel.
      const text = `🔔 ${data.title}\n${data.message}`;
      await Promise.all([this.telegram.send(text), this.whatsapp.send(text)]);
    } catch {
      /* external channels are best-effort — never break the business op */
    }
  }

  /** Per-user "you have a new notification" signals for the SSE stream. */
  private readonly signals$ = new Subject<{ userId: string }>();

  /** Stream of refresh signals for one user (used by the SSE endpoint). */
  streamFor(userId: string): Observable<{ userId: string }> {
    return new Observable((subscriber) => {
      const sub = this.signals$.subscribe((e) => {
        if (e.userId === userId) subscriber.next(e);
      });
      return () => sub.unsubscribe();
    });
  }

  private signal(userIds: Iterable<string>): void {
    for (const userId of userIds) this.signals$.next({ userId });
  }

  /** Notify a project's PIC + members (except the actor). Never throws. */
  async notifyProject(projectId: string, data: NotifyData, exceptUserId?: string): Promise<void> {
    try {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, deletedAt: null },
        select: { picId: true, members: { select: { userId: true } } },
      });
      if (!project) return;
      const ids = new Set<string>([project.picId, ...project.members.map((m) => m.userId)]);
      if (exceptUserId) ids.delete(exceptUserId);
      if (ids.size === 0) return;
      await this.prisma.notification.createMany({
        data: [...ids].map((userId) => ({
          userId,
          type: data.type,
          title: data.title,
          message: data.message,
          projectId: data.projectId ?? projectId,
        })),
      });
      this.signal(ids);
      await this.dispatchExternal(ids, data);
    } catch {
      /* notifications must never break the business op */
    }
  }

  /**
   * Notify a project's team (PIC + members) plus everyone holding one of the
   * given roles — deduped, except the actor. Used for events approvers must see
   * even when they aren't on the project (e.g. overbudget → Finance/Admin).
   * Never throws.
   */
  async notifyProjectAndRoles(
    projectId: string,
    roles: Role[],
    data: NotifyData,
    exceptUserId?: string,
  ): Promise<void> {
    try {
      const [project, roleUsers] = await Promise.all([
        this.prisma.project.findFirst({
          where: { id: projectId, deletedAt: null },
          select: { picId: true, members: { select: { userId: true } } },
        }),
        roles.length
          ? this.prisma.user.findMany({ where: { role: { in: roles }, deletedAt: null }, select: { id: true } })
          : Promise.resolve([]),
      ]);
      const ids = new Set<string>();
      if (project) {
        ids.add(project.picId);
        project.members.forEach((m) => ids.add(m.userId));
      }
      roleUsers.forEach((u) => ids.add(u.id));
      if (exceptUserId) ids.delete(exceptUserId);
      if (ids.size === 0) return;
      await this.prisma.notification.createMany({
        data: [...ids].map((userId) => ({
          userId,
          type: data.type,
          title: data.title,
          message: data.message,
          projectId: data.projectId ?? projectId,
        })),
      });
      this.signal(ids);
      await this.dispatchExternal(ids, data);
    } catch {
      /* notifications must never break the business op */
    }
  }

  /** Notify a specific user (except the actor). Never throws. */
  async notifyUser(userId: string | null | undefined, data: NotifyData, exceptUserId?: string): Promise<void> {
    if (!userId || userId === exceptUserId) return;
    try {
      await this.prisma.notification.create({
        data: { userId, type: data.type, title: data.title, message: data.message, projectId: data.projectId ?? null },
      });
      this.signal([userId]);
      await this.dispatchExternal([userId], data);
    } catch {
      /* ignore */
    }
  }

  async list(userId: string, page = 1, pageSize = 20) {
    const [total, data, unread] = await this.prisma.$transaction([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { data, total, unread, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async unreadCount(userId: string): Promise<{ unread: number }> {
    return { unread: await this.prisma.notification.count({ where: { userId, isRead: false } }) };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    return this.unreadCount(userId);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { unread: 0 };
  }
}
