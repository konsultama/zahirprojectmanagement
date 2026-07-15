import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  DocumentStatus,
  ExecutionStatus,
  Prisma,
  ProjectStatus,
  QcStatus,
  RiskStatus,
  StageStatus,
  StageType,
  WbsItemType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestUser } from '../common/auth/current-user.middleware';
import { DEFAULT_CLOSING_DOCS } from './closing.template';
import { CreateDocumentDto, EvaluationDto, MasterUpdateDto, UpdateDocumentDto } from './dto/closing.dto';

const num = (d: Prisma.Decimal | null | undefined): number => (d == null ? 0 : Number(d));
const days = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

export interface Evaluation {
  lessonsLearned?: string;
  vendorRating?: number;
  vendorNotes?: string;
  clientRating?: number;
  clientNotes?: string;
}

@Injectable()
export class ClosingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async getContext(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { stages: true, pic: { select: { id: true, name: true } }, client: { select: { id: true, name: true } } },
    });
    if (!project) throw new NotFoundException('Proyek tidak ditemukan.');
    const closing = project.stages.find((s) => s.stageType === StageType.CLOSING);
    if (!closing) throw new NotFoundException('Tahap Closing tidak ditemukan.');
    return { project, closing };
  }

  private parseEval(notes: string | null): Evaluation {
    if (!notes) return {};
    try {
      return JSON.parse(notes) as Evaluation;
    } catch {
      return {};
    }
  }

  private async ensureDocs(projectId: string): Promise<void> {
    const count = await this.prisma.projectDocument.count({ where: { projectId } });
    if (count === 0) {
      await this.prisma.projectDocument.createMany({
        data: DEFAULT_CLOSING_DOCS.map((d, i) => ({
          projectId,
          name: d.name,
          isRequired: d.isRequired,
          status: DocumentStatus.BELUM,
          sortOrder: i + 1,
        })),
      });
    }
  }

  /**
   * Progress indicator for the Closing stage (shown in the header). Tracks
   * verified required docs + lessons filled. Does NOT override the SUBMITTED /
   * APPROVED workflow states.
   */
  private async refreshStage(projectId: string): Promise<void> {
    const stage = await this.prisma.projectStage.findFirst({
      where: { projectId, stageType: StageType.CLOSING },
    });
    if (!stage) return;
    if (stage.status === StageStatus.SUBMITTED || stage.status === StageStatus.APPROVED) return;

    const docs = await this.prisma.projectDocument.findMany({ where: { projectId } });
    const requiredDocs = docs.filter((d) => d.isRequired);
    const resolved = requiredDocs.filter(
      (d) => d.status === DocumentStatus.TERVERIFIKASI || d.status === DocumentStatus.TIDAK_BERLAKU,
    ).length;
    const lessonsFilled = !!this.parseEval(stage.notes).lessonsLearned?.trim();

    const denom = requiredDocs.length + 1; // +1 for lessons learned
    const doneCount = resolved + (lessonsFilled ? 1 : 0);
    const pct = Math.round((doneCount / denom) * 10000) / 100;
    const status = doneCount === 0 ? StageStatus.NOT_STARTED : StageStatus.IN_PROGRESS;

    if (stage.status !== status || Number(stage.completionPct) !== pct) {
      await this.prisma.projectStage.update({ where: { id: stage.id }, data: { status, completionPct: pct } });
    }
  }

  // ---- read -------------------------------------------------------------

  async get(projectId: string) {
    const { project, closing } = await this.getContext(projectId);
    await this.ensureDocs(projectId);

    const documents = await this.prisma.projectDocument.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    });
    const requiredDocs = documents.filter((d) => d.isRequired);
    const requiredDone = requiredDocs.filter(
      (d) => d.status === DocumentStatus.TERVERIFIKASI || d.status === DocumentStatus.TIDAK_BERLAKU,
    ).length;

    const evaluation = this.parseEval(closing.notes);

    // auto summary (§7.2.6 C)
    const leaves = await this.prisma.wbsItem.findMany({
      where: { projectId, deletedAt: null, itemType: { not: WbsItemType.GROUP } },
      select: { execution: { select: { status: true } }, qc: { select: { qcStatus: true } }, isQcRequired: true },
    });
    const qcFindings = leaves.filter((l) => l.qc?.qcStatus === QcStatus.FAILED || l.qc?.qcStatus === QcStatus.PERLU_PERBAIKAN).length;
    const risksOccurred = await this.prisma.projectRisk.count({ where: { projectId, status: RiskStatus.OCCURRED } });

    const plannedDays = days(project.startDate, project.finishDate);
    const endRef = project.actualFinishDate ?? new Date();
    const actualDays = days(project.startDate, endRef);

    // gating (§7.2.6 D)
    const blockers: string[] = [];
    const pendingDocs = requiredDocs.filter(
      (d) => d.status !== DocumentStatus.TERVERIFIKASI && d.status !== DocumentStatus.TIDAK_BERLAKU,
    );
    if (pendingDocs.length > 0) blockers.push(`${pendingDocs.length} dokumen wajib belum lengkap`);
    const openExec = leaves.filter(
      (l) => l.execution && l.execution.status !== ExecutionStatus.DONE && l.execution.status !== ExecutionStatus.CANCELLED,
    ).length;
    if (openExec > 0) blockers.push(`${openExec} kegiatan Executing belum Done/Cancelled`);
    const openQc = leaves.filter(
      (l) => l.isQcRequired && l.qc?.qcStatus !== QcStatus.PASSED && l.qc?.qcStatus !== QcStatus.WAIVED,
    ).length;
    if (openQc > 0) blockers.push(`${openQc} item wajib QC belum Passed/Waived`);
    if (!evaluation.lessonsLearned?.trim()) blockers.push('Lessons Learned belum diisi');

    return {
      stage: { id: closing.id, status: closing.status, rejectionReason: closing.rejectionReason, approvedAt: closing.approvedAt },
      documents: documents.map((d) => ({
        id: d.id,
        name: d.name,
        isRequired: d.isRequired,
        status: d.status,
        documentNo: d.documentNo,
        documentDate: d.documentDate,
        fileUrl: d.fileUrl,
        waiverReason: d.waiverReason,
        notes: d.notes,
      })),
      completeness: { requiredDone, requiredTotal: requiredDocs.length },
      evaluation,
      autoSummary: {
        budget: { plan: num(project.totalBudget), actual: num(project.actualCost), variance: num(project.actualCost) - num(project.totalBudget) },
        schedule: { plannedDays, actualDays, diffDays: actualDays - plannedDays },
        qcFindings,
        risksOccurred,
        progressPct: num(project.progressPct),
      },
      master: {
        status: project.status,
        actualFinishDate: project.actualFinishDate,
        progressPct: num(project.progressPct),
        contractValue: project.contractValue == null ? null : num(project.contractValue),
        description: project.description,
        pic: project.pic,
      },
      gating: { canSubmit: blockers.length === 0, blockers },
      readOnly: project.status === ProjectStatus.CLOSED,
    };
  }

  // ---- documents --------------------------------------------------------

  async updateDocument(projectId: string, id: string, dto: UpdateDocumentDto, actor: RequestUser, ip?: string) {
    const doc = await this.prisma.projectDocument.findFirst({ where: { id, projectId } });
    if (!doc) throw new NotFoundException('Dokumen tidak ditemukan.');
    if (dto.status === DocumentStatus.TIDAK_BERLAKU && doc.isRequired && !dto.waiverReason?.trim()) {
      throw new BadRequestException('Dokumen wajib yang ditandai "Tidak Berlaku" memerlukan alasan.');
    }
    await this.prisma.projectDocument.update({
      where: { id },
      data: {
        status: dto.status ?? undefined,
        documentNo: dto.documentNo ?? undefined,
        documentDate: dto.documentDate ? new Date(dto.documentDate) : undefined,
        fileUrl: dto.fileUrl ?? undefined,
        notes: dto.notes ?? undefined,
        waiverReason: dto.status === DocumentStatus.TIDAK_BERLAKU ? dto.waiverReason ?? undefined : undefined,
        verifiedById: dto.status === DocumentStatus.TERVERIFIKASI ? actor.id : undefined,
        verifiedAt: dto.status === DocumentStatus.TERVERIFIKASI ? new Date() : undefined,
      },
    });
    await this.audit.log({ entityType: 'ProjectDocument', entityId: id, action: AuditAction.UPDATE, projectId, actor, newValue: { status: dto.status }, reason: dto.waiverReason ?? null, ipAddress: ip });
    await this.refreshStage(projectId);
    return this.get(projectId);
  }

  async addDocument(projectId: string, dto: CreateDocumentDto, actor: RequestUser, ip?: string) {
    await this.getContext(projectId);
    const max = await this.prisma.projectDocument.aggregate({ where: { projectId }, _max: { sortOrder: true } });
    await this.prisma.projectDocument.create({
      data: { projectId, name: dto.name, isRequired: dto.isRequired ?? false, status: DocumentStatus.BELUM, sortOrder: (max._max.sortOrder ?? 0) + 1 },
    });
    await this.audit.log({ entityType: 'ProjectDocument', entityId: projectId, action: AuditAction.CREATE, projectId, actor, newValue: { name: dto.name }, ipAddress: ip });
    await this.refreshStage(projectId);
    return this.get(projectId);
  }

  async removeDocument(projectId: string, id: string, actor: RequestUser, ip?: string) {
    const doc = await this.prisma.projectDocument.findFirst({ where: { id, projectId } });
    if (!doc) throw new NotFoundException('Dokumen tidak ditemukan.');
    await this.prisma.projectDocument.delete({ where: { id } });
    await this.audit.log({ entityType: 'ProjectDocument', entityId: id, action: AuditAction.DELETE, projectId, actor, ipAddress: ip });
    await this.refreshStage(projectId);
    return this.get(projectId);
  }

  // ---- evaluation -------------------------------------------------------

  async saveEvaluation(projectId: string, dto: EvaluationDto, actor: RequestUser, ip?: string) {
    const { closing } = await this.getContext(projectId);
    const current = this.parseEval(closing.notes);
    const merged: Evaluation = { ...current, ...dto };
    await this.prisma.projectStage.update({ where: { id: closing.id }, data: { notes: JSON.stringify(merged) } });
    await this.audit.log({ entityType: 'ProjectStage', entityId: closing.id, action: AuditAction.UPDATE, projectId, actor, newValue: { evaluation: true }, ipAddress: ip });
    await this.refreshStage(projectId);
    return this.get(projectId);
  }

  // ---- master data update (§7.2.6 A) -----------------------------------

  async applyMasterUpdate(projectId: string, dto: MasterUpdateDto, actor: RequestUser, ip?: string) {
    const { project } = await this.getContext(projectId);
    if (dto.progressPct != null && dto.progressPct < 100 && !dto.progressReason?.trim()) {
      throw new BadRequestException('Progress < 100% saat penutupan memerlukan alasan.');
    }
    const before = {
      actualFinishDate: project.actualFinishDate,
      progressPct: num(project.progressPct),
      contractValue: project.contractValue == null ? null : num(project.contractValue),
      description: project.description,
      picId: project.picId,
    };
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        actualFinishDate: dto.actualFinishDate ? new Date(dto.actualFinishDate) : undefined,
        progressPct: dto.progressPct ?? undefined,
        contractValue: dto.contractValue ?? undefined,
        description: dto.description ?? undefined,
        picId: dto.picId ?? undefined,
        updatedBy: actor.id,
      },
    });
    await this.audit.log({
      entityType: 'Project',
      entityId: projectId,
      action: AuditAction.UPDATE,
      projectId,
      actor,
      oldValue: before,
      newValue: dto,
      reason: dto.progressReason ?? null,
      ipAddress: ip,
    });
    return this.get(projectId);
  }

  // ---- submit / approve / reject ---------------------------------------

  async submit(projectId: string, actor: RequestUser, ip?: string) {
    const state = await this.get(projectId);
    if (state.stage.status === StageStatus.APPROVED) throw new BadRequestException('Closing sudah disetujui.');
    if (!state.gating.canSubmit) {
      throw new BadRequestException(`Belum bisa submit: ${state.gating.blockers.join('; ')}.`);
    }
    const { closing } = await this.getContext(projectId);
    await this.prisma.projectStage.update({ where: { id: closing.id }, data: { status: StageStatus.SUBMITTED, rejectionReason: null } });
    await this.audit.log({ entityType: 'ProjectStage', entityId: closing.id, action: AuditAction.UPDATE, projectId, actor, newValue: { status: 'SUBMITTED' }, ipAddress: ip });
    return this.get(projectId);
  }

  async approve(projectId: string, actor: RequestUser, ip?: string) {
    const { project, closing } = await this.getContext(projectId);
    if (closing.status !== StageStatus.SUBMITTED) throw new BadRequestException('Hanya Closing "Diajukan" yang bisa disetujui.');

    await this.prisma.$transaction(async (tx) => {
      await tx.projectStage.update({
        where: { id: closing.id },
        data: { status: StageStatus.APPROVED, completionPct: 100, approvedById: actor.id, approvedAt: new Date(), actualEnd: new Date() },
      });
      await tx.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.CLOSED, actualFinishDate: project.actualFinishDate ?? new Date(), updatedBy: actor.id },
      });
      await this.audit.log(
        { entityType: 'Project', entityId: projectId, action: AuditAction.STATUS_CHANGE, projectId, actor, oldValue: { status: project.status }, newValue: { status: 'CLOSED' }, ipAddress: ip },
        tx,
      );
    });
    return this.get(projectId);
  }

  async reject(projectId: string, reason: string, actor: RequestUser, ip?: string) {
    const { closing } = await this.getContext(projectId);
    if (closing.status !== StageStatus.SUBMITTED) throw new BadRequestException('Hanya Closing "Diajukan" yang bisa ditolak.');
    if (!reason?.trim()) throw new BadRequestException('Alasan penolakan wajib diisi.');
    await this.prisma.projectStage.update({ where: { id: closing.id }, data: { status: StageStatus.IN_PROGRESS, rejectionReason: reason } });
    await this.audit.log({ entityType: 'ProjectStage', entityId: closing.id, action: AuditAction.REJECT, projectId, actor, reason, ipAddress: ip });
    return this.get(projectId);
  }

  // ---- closure report ---------------------------------------------------

  async report(projectId: string) {
    const { project, closing } = await this.getContext(projectId);
    const state = await this.get(projectId);
    return {
      generatedAt: new Date(),
      project: {
        code: project.code,
        name: project.name,
        client: project.client?.name ?? null,
        pic: project.pic?.name ?? null,
        status: project.status,
        startDate: project.startDate,
        finishDate: project.finishDate,
        actualFinishDate: project.actualFinishDate,
        contractValue: project.contractValue == null ? null : num(project.contractValue),
      },
      summary: state.autoSummary,
      documents: state.documents,
      completeness: state.completeness,
      evaluation: state.evaluation,
      approvedAt: closing.approvedAt,
    };
  }
}
