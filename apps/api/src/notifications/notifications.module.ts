import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { TelegramService } from './telegram.service';
import { WhatsappService } from './whatsapp.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationService, EmailService, TelegramService, WhatsappService],
  exports: [NotificationService, EmailService, TelegramService, WhatsappService],
})
export class NotificationsModule {}
