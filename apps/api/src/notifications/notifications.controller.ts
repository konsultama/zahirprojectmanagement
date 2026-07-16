import { Controller, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';

function must(u?: RequestUser): RequestUser {
  if (!u) throw new UnauthorizedException('Otentikasi diperlukan.');
  return u;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

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
