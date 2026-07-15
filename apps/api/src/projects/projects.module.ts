import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectCodeService } from './project-code.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectCodeService],
})
export class ProjectsModule {}
