import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotifyData {
  type: string;
  title: string;
  message: string;
  projectId?: string;
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

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
