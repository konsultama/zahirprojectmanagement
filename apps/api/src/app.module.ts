import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthController } from './health/health.controller';
import { ProjectsModule } from './projects/projects.module';
import { StagesModule } from './stages/stages.module';
import { PlanningModule } from './planning/planning.module';
import { ExecutingModule } from './executing/executing.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { ClosingModule } from './closing/closing.module';
import { AuditModule } from './audit/audit.module';
import { MasterModule } from './master/master.module';
import { SettingsModule } from './settings/settings.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FilesModule } from './files/files.module';
import { ContactsModule } from './contacts/contacts.module';
import { UsersModule } from './users/users.module';
import { CurrentUserMiddleware } from './common/auth/current-user.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    NotificationsModule,
    ProjectsModule,
    StagesModule,
    PlanningModule,
    ExecutingModule,
    MonitoringModule,
    ClosingModule,
    AuditModule,
    MasterModule,
    SettingsModule,
    ReportsModule,
    DashboardModule,
    FilesModule,
    ContactsModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CurrentUserMiddleware).forRoutes('*');
  }
}
