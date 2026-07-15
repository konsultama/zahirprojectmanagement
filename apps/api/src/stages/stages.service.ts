import { Injectable, NotFoundException } from '@nestjs/common';
import { StageType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ORDER: StageType[] = [
  StageType.INITIATING,
  StageType.PLANNING,
  StageType.EXECUTING,
  StageType.MONITORING,
  StageType.CLOSING,
];

@Injectable()
export class StagesService {
  constructor(private readonly prisma: PrismaService) {}

  /** All 5 stages for a project, ordered, with the gating flags the UI needs. */
  async list(projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundException('Proyek tidak ditemukan.');

    const stages = await this.prisma.projectStage.findMany({
      where: { projectId },
      orderBy: { sequence: 'asc' },
      include: {
        pic: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    const statusOf = (t: StageType) => stages.find((s) => s.stageType === t)?.status;
    const initiatingApproved = statusOf(StageType.INITIATING) === 'APPROVED';
    const planningApproved = statusOf(StageType.PLANNING) === 'APPROVED';

    return stages
      .sort((a, b) => ORDER.indexOf(a.stageType) - ORDER.indexOf(b.stageType))
      .map((s) => ({
        id: s.id,
        stageType: s.stageType,
        sequence: s.sequence,
        status: s.status,
        completionPct: Number(s.completionPct),
        pic: s.pic,
        approvedBy: s.approvedBy,
        approvedAt: s.approvedAt,
        rejectionReason: s.rejectionReason,
        // gating (§7.2.1): a stage's approval may be locked until a predecessor is approved
        approvalLocked:
          (s.stageType === StageType.PLANNING && !initiatingApproved) ||
          ((s.stageType === StageType.EXECUTING || s.stageType === StageType.MONITORING) && !planningApproved),
      }));
  }
}
