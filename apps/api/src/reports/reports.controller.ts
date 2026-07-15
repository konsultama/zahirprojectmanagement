import { Controller, Get, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequestUser } from '../common/auth/current-user.middleware';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get(':key')
  run(@Param('key') key: string, @CurrentUser() user?: RequestUser) {
    return this.reports.run(key, user);
  }
}
