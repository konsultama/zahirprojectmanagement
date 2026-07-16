import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, StageStatus, StageType, WbsItemType } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RequestUser } from '../common/auth/current-user.middleware';
import { CreateWbsDto, ImportRabDto, UpdateWbsDto } from './dto/wbs.dto';

const MAX_DEPTH = 4;
const money = (n: number) => Math.round(n * 100) / 100;

interface RawItem {
  id: string;
  parentId: string | null;
  sortOrder: number;
  itemType: WbsItemType;
  qty: Prisma.Decimal | null;
  unitBudget: Prisma.Decimal | null;
  totalBudget: Prisma.Decimal;
  wbsNumber: string;
  level: number;
}

export interface WbsNode {
  id: string;
  parentId: string | null;
  wbsNumber: string;
  level: number;
  sortOrder: number;
  name: string;
  itemType: WbsItemType;
  locationId: string;
  locationName?: string | null;
  uom: string | null;
  qty: number | null;
  unitBudget: number | null;
  totalBudget: number;
  weightPct: number | null;
  startDate: Date | null;
  endDate: Date | null;
  isQcRequired: boolean;
  picId: string | null;
  picName: string | null;
  vendorId: string | null;
  vendorName: string | null;
  predecessorId: string | null;
  predecessorNumber: string | null;
  notes: string | null;
  children: WbsNode[];
}

@Injectable()
export class WbsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private num(d: Prisma.Decimal | null): number | null {
    return d == null ? null : Number(d);
  }

  private async getProject(projectId: string) {
    const p = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!p) throw new NotFoundException('Proyek tidak ditemukan.');
    return p;
  }

  private async planningStatus(projectId: string): Promise<StageStatus> {
    const stage = await this.prisma.projectStage.findFirst({
      where: { projectId, stageType: StageType.PLANNING },
      select: { status: true },
    });
    return stage?.status ?? StageStatus.NOT_STARTED;
  }

  /**
   * Renumbers the whole tree (1, 1.1, …), fixes levels & group flags, and rolls
   * budgets bottom-up. Persists changed rows and updates project.totalBudget.
   * Runs after every structural mutation.
   */
  private async recompute(tx: Prisma.TransactionClient, projectId: string): Promise<number> {
    const items = (await tx.wbsItem.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true, parentId: true, sortOrder: true, itemType: true,
        qty: true, unitBudget: true, totalBudget: true, wbsNumber: true, level: true,
      },
    })) as RawItem[];

    const byParent = new Map<string | null, RawItem[]>();
    for (const it of items) {
      const key = it.parentId;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(it);
    }
    for (const list of byParent.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);

    const updates: { id: string; wbsNumber: string; level: number; itemType: WbsItemType; totalBudget: number; qty: number | null; unitBudget: number | null }[] = [];

    // post-order DFS: assign numbers/levels top-down, totals bottom-up
    const visit = (node: RawItem, prefix: string, index: number, level: number): number => {
      const wbsNumber = prefix ? `${prefix}.${index}` : `${index}`;
      const children = byParent.get(node.id) ?? [];
      let itemType = node.itemType;
      let total: number;
      let qty = this.num(node.qty);
      let unitBudget = this.num(node.unitBudget);

      if (children.length > 0) {
        // has children → aggregator group; qty/unit not applicable
        itemType = WbsItemType.GROUP;
        qty = null;
        unitBudget = null;
        let sum = 0;
        children.forEach((c, i) => {
          sum += visit(c, wbsNumber, i + 1, level + 1);
        });
        total = money(sum);
      } else {
        // leaf
        if (itemType === WbsItemType.GROUP) itemType = WbsItemType.TASK; // demoted group with no children
        total = money((qty ?? 0) * (unitBudget ?? 0));
      }

      updates.push({ id: node.id, wbsNumber, level, itemType, totalBudget: total, qty, unitBudget });
      return total;
    };

    const roots = byParent.get(null) ?? [];
    let projectTotal = 0;
    roots.forEach((r, i) => {
      projectTotal += visit(r, '', i + 1, 1);
    });
    projectTotal = money(projectTotal);

    // persist only rows that changed
    for (const u of updates) {
      const orig = items.find((x) => x.id === u.id)!;
      const changed =
        orig.wbsNumber !== u.wbsNumber ||
        orig.level !== u.level ||
        orig.itemType !== u.itemType ||
        Number(orig.totalBudget) !== u.totalBudget ||
        this.num(orig.qty) !== u.qty ||
        this.num(orig.unitBudget) !== u.unitBudget;
      if (changed) {
        await tx.wbsItem.update({
          where: { id: u.id },
          data: {
            wbsNumber: u.wbsNumber,
            level: u.level,
            itemType: u.itemType,
            totalBudget: u.totalBudget,
            qty: u.qty,
            unitBudget: u.unitBudget,
          },
        });
      }
    }

    await tx.project.update({ where: { id: projectId }, data: { totalBudget: projectTotal } });
    return projectTotal;
  }

  private assertDatesInRange(project: { startDate: Date; finishDate: Date }, start?: string, end?: string) {
    if (start && new Date(start) < project.startDate) {
      throw new BadRequestException('Tanggal mulai kegiatan di luar rentang tanggal proyek.');
    }
    if (end && new Date(end) > project.finishDate) {
      throw new BadRequestException('Tanggal selesai kegiatan di luar rentang tanggal proyek.');
    }
    if (start && end && new Date(end) < new Date(start)) {
      throw new BadRequestException('Tanggal selesai kegiatan harus ≥ tanggal mulai.');
    }
  }

  // ---- read -------------------------------------------------------------

  async getTree(projectId: string) {
    const project = await this.getProject(projectId);
    const items = await this.prisma.wbsItem.findMany({
      where: { projectId, deletedAt: null },
      include: {
        location: { select: { name: true } },
        pic: { select: { name: true } },
        vendor: { select: { name: true } },
        predecessor: { select: { wbsNumber: true } },
      },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    });

    const nodes = new Map<string, WbsNode>();
    for (const it of items) {
      nodes.set(it.id, {
        id: it.id,
        parentId: it.parentId,
        wbsNumber: it.wbsNumber,
        level: it.level,
        sortOrder: it.sortOrder,
        name: it.name,
        itemType: it.itemType,
        locationId: it.locationId,
        locationName: it.location?.name ?? null,
        uom: it.uom,
        qty: this.num(it.qty),
        unitBudget: this.num(it.unitBudget),
        totalBudget: Number(it.totalBudget),
        weightPct: this.num(it.weightPct),
        startDate: it.startDate,
        endDate: it.endDate,
        isQcRequired: it.isQcRequired,
        picId: it.picId,
        picName: it.pic?.name ?? null,
        vendorId: it.vendorId,
        vendorName: it.vendor?.name ?? null,
        predecessorId: it.predecessorId,
        predecessorNumber: it.predecessor?.wbsNumber ?? null,
        notes: it.notes,
        children: [],
      });
    }
    const roots: WbsNode[] = [];
    for (const node of nodes.values()) {
      if (node.parentId && nodes.has(node.parentId)) nodes.get(node.parentId)!.children.push(node);
      else roots.push(node);
    }
    const sortRec = (list: WbsNode[]) => {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      list.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);

    const totalPlan = Number(project.totalBudget);
    const estimate = project.initialBudget == null ? null : Number(project.initialBudget);
    return {
      tree: roots,
      summary: {
        totalPlan,
        estimate,
        contractValue: project.contractValue == null ? null : Number(project.contractValue),
        selisih: estimate == null ? null : money(totalPlan - estimate),
        pctOfEstimate: estimate && estimate > 0 ? money((totalPlan / estimate) * 100) : null,
        allowOverbudget: project.allowOverbudget,
        overbudgetTolerancePct: project.overbudgetTolerancePct == null ? null : Number(project.overbudgetTolerancePct),
        overbudgetReason: project.overbudgetReason,
        isOverbudget: project.isOverbudget,
      },
      planningStatus: await this.planningStatus(projectId),
    };
  }

  // ---- Excel export -----------------------------------------------------

  /** Build a formatted .xlsx workbook of the RAB (WBS + budget rollup). */
  async exportXlsx(projectId: string): Promise<{ buffer: Buffer; filename: string }> {
    const project = await this.getProject(projectId);
    const { tree, summary } = await this.getTree(projectId);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Zahir Project Management';
    const ws = wb.addWorksheet('RAB');

    // Title block
    ws.mergeCells('A1:G1');
    ws.getCell('A1').value = `RAB — ${project.code} · ${project.name}`;
    ws.getCell('A1').font = { bold: true, size: 14 };

    ws.columns = [
      { key: 'wbs', width: 12 },
      { key: 'name', width: 44 },
      { key: 'uom', width: 8 },
      { key: 'qty', width: 10 },
      { key: 'unit', width: 16 },
      { key: 'total', width: 18 },
      { key: 'loc', width: 20 },
    ];

    const headerRow = ws.addRow(['No. WBS', 'Uraian', 'Satuan', 'Qty', 'Harga Satuan', 'Jumlah', 'Lokasi']);
    headerRow.font = { bold: true };
    headerRow.eachCell((c) => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF2F8' } };
      c.border = { bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } } };
    });

    const moneyFmt = '#,##0;[Red]-#,##0';
    const walk = (nodes: WbsNode[]) => {
      for (const n of nodes) {
        const isGroup = n.itemType === WbsItemType.GROUP || n.children.length > 0;
        const row = ws.addRow([
          n.wbsNumber,
          `${'    '.repeat(Math.max(0, n.level - 1))}${n.name}`,
          isGroup ? '' : n.uom ?? '',
          isGroup ? null : n.qty ?? null,
          isGroup ? null : n.unitBudget ?? null,
          n.totalBudget,
          n.locationName ?? '',
        ]);
        row.getCell(4).numFmt = moneyFmt;
        row.getCell(5).numFmt = moneyFmt;
        row.getCell(6).numFmt = moneyFmt;
        if (isGroup) row.font = { bold: true };
        walk(n.children);
      }
    };
    walk(tree);

    // Totals
    ws.addRow([]);
    const totalRow = ws.addRow(['', 'TOTAL RENCANA', '', '', '', summary.totalPlan, '']);
    totalRow.font = { bold: true };
    totalRow.getCell(6).numFmt = moneyFmt;
    totalRow.getCell(6).border = { top: { style: 'double' } };
    if (summary.estimate != null) {
      const est = ws.addRow(['', 'Estimasi Awal', '', '', '', summary.estimate, '']);
      est.getCell(6).numFmt = moneyFmt;
      const sel = ws.addRow(['', 'Selisih (Rencana − Estimasi)', '', '', '', summary.totalPlan - summary.estimate, '']);
      sel.getCell(6).numFmt = moneyFmt;
      sel.font = { color: { argb: summary.totalPlan > summary.estimate ? 'FFC0392B' : 'FF1E8449' } };
    }

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return { buffer, filename: `RAB-${project.code}.xlsx` };
  }

  // ---- create -----------------------------------------------------------

  async create(projectId: string, dto: CreateWbsDto, actor: RequestUser, ip?: string) {
    const project = await this.getProject(projectId);

    let level = 1;
    let locationId = dto.locationId;
    if (dto.parentId) {
      const parent = await this.prisma.wbsItem.findFirst({
        where: { id: dto.parentId, projectId, deletedAt: null },
      });
      if (!parent) throw new BadRequestException('Baris induk tidak ditemukan.');
      if (parent.level >= MAX_DEPTH) {
        throw new BadRequestException(`Kedalaman WBS maksimum ${MAX_DEPTH} level.`);
      }
      level = parent.level + 1;
      locationId = locationId ?? parent.locationId; // inherit (§7.2.3 B)
    }
    if (!locationId) {
      const firstLoc = await this.prisma.projectLocation.findFirst({
        where: { projectId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      if (!firstLoc) throw new BadRequestException('Proyek belum punya lokasi.');
      locationId = firstLoc.id;
    }
    this.assertDatesInRange(project, dto.startDate, dto.endDate);

    const created = await this.prisma.$transaction(async (tx) => {
      const maxSort = await tx.wbsItem.aggregate({
        where: { projectId, parentId: dto.parentId ?? null, deletedAt: null },
        _max: { sortOrder: true },
      });
      const item = await tx.wbsItem.create({
        data: {
          projectId,
          parentId: dto.parentId ?? null,
          locationId,
          wbsNumber: 'tmp',
          level,
          sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
          name: dto.name,
          itemType: dto.itemType as unknown as WbsItemType,
          uom: dto.uom ?? null,
          qty: dto.qty ?? null,
          unitBudget: dto.unitBudget ?? null,
          totalBudget: money((dto.qty ?? 0) * (dto.unitBudget ?? 0)),
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          isQcRequired: dto.isQcRequired ?? false,
          notes: dto.notes ?? null,
        },
      });
      await this.recompute(tx, projectId);
      await this.audit.log(
        { entityType: 'WbsItem', entityId: item.id, action: AuditAction.CREATE, projectId, actor, newValue: { name: item.name }, ipAddress: ip },
        tx,
      );
      return item;
    });
    return this.getTree(projectId);
  }

  // ---- update -----------------------------------------------------------

  async update(projectId: string, id: string, dto: UpdateWbsDto, actor: RequestUser, ip?: string) {
    const project = await this.getProject(projectId);
    const existing = await this.prisma.wbsItem.findFirst({ where: { id, projectId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Baris WBS tidak ditemukan.');

    if ((await this.planningStatus(projectId)) === StageStatus.APPROVED && !dto.reason) {
      throw new BadRequestException('Perubahan pada Planning yang sudah Approved memerlukan alasan.');
    }
    this.assertDatesInRange(
      project,
      dto.startDate,
      dto.endDate,
    );

    // A row with children is a group: block direct qty/budget edits
    const childCount = await this.prisma.wbsItem.count({ where: { parentId: id, deletedAt: null } });
    if (childCount > 0 && (dto.qty != null || dto.unitBudget != null)) {
      throw new BadRequestException('Baris induk (punya sub-baris) tidak bisa diisi Qty/Nilai Anggaran langsung.');
    }
    if (dto.predecessorId && dto.predecessorId === id) {
      throw new BadRequestException('Predecessor tidak boleh baris itu sendiri.');
    }
    // relation fields: '' clears (null), undefined leaves unchanged
    const rel = (v: string | undefined) => (v === undefined ? undefined : v === '' ? null : v);

    await this.prisma.$transaction(async (tx) => {
      await tx.wbsItem.update({
        where: { id },
        data: {
          name: dto.name ?? undefined,
          itemType: childCount === 0 && dto.itemType ? dto.itemType : undefined,
          locationId: dto.locationId || undefined,
          uom: dto.uom ?? undefined,
          qty: childCount === 0 ? dto.qty ?? undefined : undefined,
          unitBudget: childCount === 0 ? dto.unitBudget ?? undefined : undefined,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          weightPct: dto.weightPct ?? undefined,
          picId: rel(dto.picId),
          vendorId: rel(dto.vendorId),
          predecessorId: rel(dto.predecessorId),
          isQcRequired: dto.isQcRequired ?? undefined,
          notes: dto.notes ?? undefined,
        },
      });
      await this.recompute(tx, projectId);
      await this.audit.log(
        { entityType: 'WbsItem', entityId: id, action: AuditAction.UPDATE, projectId, actor, reason: dto.reason ?? null, ipAddress: ip },
        tx,
      );
    });
    return this.getTree(projectId);
  }

  // ---- import RAB (§7.2.3 E) --------------------------------------------

  private parentNumber(n: string): string | null {
    return n.includes('.') ? n.slice(0, n.lastIndexOf('.')) : null;
  }
  private cmpWbs(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] ?? 0) - (pb[i] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  }

  async importRab(projectId: string, dto: ImportRabDto, actor: RequestUser, ip?: string) {
    await this.getProject(projectId);
    if ((await this.planningStatus(projectId)) === StageStatus.APPROVED) {
      throw new BadRequestException('Planning sudah Approved — tidak bisa diimpor. Reject dulu bila perlu.');
    }
    const existing = await this.prisma.wbsItem.count({ where: { projectId, deletedAt: null } });
    if (existing > 0 && !dto.replace) {
      throw new BadRequestException(`RAB sudah berisi ${existing} baris. Aktifkan "ganti" untuk menimpa.`);
    }

    // validate
    const numbers = new Set(dto.rows.map((r) => r.wbsNumber));
    for (const r of dto.rows) {
      if (!/^\d+(\.\d+)*$/.test(r.wbsNumber)) throw new BadRequestException(`No. WBS "${r.wbsNumber}" tidak valid.`);
      if (r.wbsNumber.split('.').length > MAX_DEPTH) throw new BadRequestException(`No. WBS "${r.wbsNumber}" melebihi ${MAX_DEPTH} level.`);
      const p = this.parentNumber(r.wbsNumber);
      if (p && !numbers.has(p)) throw new BadRequestException(`Induk "${p}" untuk baris ${r.wbsNumber} tidak ada.`);
    }

    const locations = await this.prisma.projectLocation.findMany({ where: { projectId, deletedAt: null }, orderBy: { createdAt: 'asc' } });
    if (locations.length === 0) throw new BadRequestException('Proyek belum punya lokasi.');
    const locByName = new Map(locations.map((l) => [l.name.toLowerCase(), l.id]));
    const defaultLoc = locations[0].id;

    const sorted = [...dto.rows].sort((a, b) => this.cmpWbs(a.wbsNumber, b.wbsNumber));

    await this.prisma.$transaction(async (tx) => {
      if (existing > 0) {
        await tx.wbsItem.updateMany({ where: { projectId, deletedAt: null }, data: { deletedAt: new Date() } });
      }
      const idByNum = new Map<string, string>();
      const locByNum = new Map<string, string>();
      let sort = 0;
      for (const r of sorted) {
        const parentNum = this.parentNumber(r.wbsNumber);
        const parentId = parentNum ? idByNum.get(parentNum) ?? null : null;
        const locId =
          (r.locationName && locByName.get(r.locationName.toLowerCase())) ||
          (parentNum ? locByNum.get(parentNum) : undefined) ||
          defaultLoc;
        const itemType = r.itemType?.toUpperCase() === 'MATERIAL' ? WbsItemType.MATERIAL : WbsItemType.TASK;
        const qty = r.qty ?? null;
        const unit = r.unitBudget ?? null;
        const created = await tx.wbsItem.create({
          data: {
            projectId,
            parentId,
            locationId: locId,
            wbsNumber: 'tmp',
            level: r.wbsNumber.split('.').length,
            sortOrder: ++sort,
            name: r.name,
            itemType,
            uom: r.uom ?? null,
            qty,
            unitBudget: unit,
            totalBudget: money((qty ?? 0) * (unit ?? 0)),
          },
        });
        idByNum.set(r.wbsNumber, created.id);
        locByNum.set(r.wbsNumber, locId);
      }
      await this.recompute(tx, projectId);
      await this.audit.log(
        { entityType: 'WbsItem', entityId: projectId, action: AuditAction.CREATE, projectId, actor, newValue: { imported: sorted.length }, ipAddress: ip },
        tx,
      );
    });
    return this.getTree(projectId);
  }

  // ---- delete -----------------------------------------------------------

  async remove(projectId: string, id: string, actor: RequestUser, ip?: string) {
    await this.getProject(projectId);
    const existing = await this.prisma.wbsItem.findFirst({ where: { id, projectId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Baris WBS tidak ditemukan.');

    // collect descendants
    const all = await this.prisma.wbsItem.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true, parentId: true },
    });
    const toDelete = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const it of all) {
        if (it.parentId && toDelete.has(it.parentId) && !toDelete.has(it.id)) {
          toDelete.add(it.id);
          grew = true;
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.wbsItem.updateMany({ where: { id: { in: [...toDelete] } }, data: { deletedAt: new Date() } });
      await this.recompute(tx, projectId);
      await this.audit.log(
        { entityType: 'WbsItem', entityId: id, action: AuditAction.DELETE, projectId, actor, newValue: { deletedCount: toDelete.size }, ipAddress: ip },
        tx,
      );
    });
    return { ...(await this.getTree(projectId)), deletedCount: toDelete.size };
  }
}
