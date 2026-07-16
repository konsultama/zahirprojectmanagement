import { Controller, Get, Param, Patch, Post, Query, Sse, UnauthorizedException } from '@nestjs/common';
import { Observable, map, merge, interval } from 'rxjs';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';

interface MessageEvent {
  data: string;
  type?: string;
}

function must(u?: RequestUser): RequestUser {
  if (!u) throw new UnauthorizedException('Otentikasi diperlukan.');
  return u;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  /**
   * Server-Sent Events stream. Emits a lightweight "refresh" whenever this user
   * gets a new notification, plus a periodic heartbeat to keep the connection
   * alive through proxies. Auth: `?token=<jwt>` (EventSource can't set headers),
   * resolved by CurrentUserMiddleware into req.user.
   */
  @Sse('stream')
  stream(@CurrentUser() u?: RequestUser): Observable<MessageEvent> {
    const userId = must(u).id;
    const refresh = this.notifications.streamFor(userId).pipe(map(() => ({ type: 'notification', data: 'refresh' })));
    const heartbeat = interval(25000).pipe(map(() => ({ type: 'ping', data: 'keepalive' })));
    return merge(refresh, heartbeat);
  }

  @Get()
  list(@Query('page') page: string | undefined, @CurrentUser() u?: RequestUser) {
    return this.notifications.list(must(u).id, page ? Number(page) : 1);
  }

  @Get('unread-count')
  unread(@CurrentUser() u?: RequestUser) {
    return this.notifications.unreadCount(must(u).id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() u?: RequestUser) {
    return this.notifications.markRead(must(u).id, id);
  }

  @Post('read-all')
  markAll(@CurrentUser() u?: RequestUser) {
    return this.notifications.markAllRead(must(u).id);
  }
}
