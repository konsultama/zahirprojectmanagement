/* eslint-disable no-console */
import {
  PrismaClient,
  Role,
  ContactType,
  ProjectStatus,
  StageType,
  StageStatus,
  WbsItemType,
  ExecutionStatus,
  QcStatus,
  DocumentStatus,
  RiskCategory,
  MitigationStrategy,
  RiskStatus,
  ProjectMemberRole,
} from '@prisma/client';

const prisma = new PrismaClient();

// Urutan & template tahapan (§7.2.1)
const STAGE_SEQUENCE: StageType[] = [
  StageType.INITIATING,
  StageType.PLANNING,
  StageType.EXECUTING,
  StageType.MONITORING,
  StageType.CLOSING,
];

// Template dokumen Closing (§7.2.6 B) — subset
const CLOSING_DOCS: { name: string; isRequired: boolean }[] = [
  { name: 'Berita Acara Serah Terima (BAST)', isRequired: true },
  { name: 'Berita Acara Pemeriksaan Pekerjaan', isRequired: true },
  { name: 'Laporan Akhir Proyek', isRequired: true },
  { name: 'Foto Dokumentasi 0% / 50% / 100%', isRequired: true },
  { name: 'Laporan Realisasi Anggaran Akhir', isRequired: true },
  { name: 'Invoice Final & Bukti Pembayaran', isRequired: true },
  { name: 'Surat Penyelesaian Kontrak', isRequired: true },
  { name: 'Sertifikat Garansi', isRequired: false },
  { name: 'Evaluasi Kepuasan Client', isRequired: false },
];

async function main() {
  console.log('Seeding… (menghapus data lama)');
  // Bersihkan (urutan mengikuti dependensi)
  await prisma.auditLog.deleteMany();
  await prisma.costActual.deleteMany();
  await prisma.executionRecord.deleteMany();
  await prisma.qcRecord.deleteMany();
  await prisma.wbsBaseline.deleteMany();
  await prisma.wbsItem.deleteMany();
  await prisma.initiatingDeliverable.deleteMany();
  await prisma.initiatingStakeholder.deleteMany();
  await prisma.initiatingRisk.deleteMany();
  await prisma.initiatingForm.deleteMany();
  await prisma.initiatingChecklist.deleteMany();
  await prisma.projectStage.deleteMany();
  await prisma.projectDocument.deleteMany();
  await prisma.projectRisk.deleteMany();
  await prisma.projectAttachment.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.projectLocation.deleteMany();
  await prisma.project.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.user.deleteMany();

  // --- Persona (§5) dipetakan ke Role sistem ---
  await prisma.persona.createMany({
    data: [
      { name: 'Andi', roleTitle: 'Project Manager', systemRole: Role.PM, mainNeed: 'Melihat status semua proyeknya, menyusun rencana, tahu lebih awal kalau ada yang melenceng' },
      { name: 'Rina', roleTitle: 'Admin Proyek', systemRole: Role.ADMIN, mainNeed: 'Form yang cepat, tidak mengulang input yang sudah ada di rencana' },
      { name: 'Bagus', roleTitle: 'Site Supervisor', systemRole: Role.SUPERVISOR, mainNeed: 'Update progres per kegiatan dari lokasi, tandai selesai' },
      { name: 'Sari', roleTitle: 'QC / Pengawas', systemRole: Role.QC, mainNeed: 'Mengisi hasil pemeriksaan per kegiatan, menolak yang belum layak' },
      { name: 'Dedi', roleTitle: 'Direktur / Manajemen', systemRole: Role.VIEWER, mainNeed: 'Dashboard ringkas: progres, serapan anggaran, proyek bermasalah' },
      { name: 'Fitri', roleTitle: 'Finance', systemRole: Role.FINANCE, mainNeed: 'Melihat serapan anggaran & kasus overbudget beserta alasannya' },
    ],
  });

  // --- Users (nama fiktif, §12.11) ---
  const [admin, pm, supervisor, qc, finance, viewer] = await Promise.all([
    prisma.user.create({ data: { name: 'Admin Sistem', email: 'admin@contoh.id', role: Role.ADMIN } }),
    prisma.user.create({ data: { name: 'Andi Pratama', email: 'andi.pm@contoh.id', role: Role.PM } }),
    prisma.user.create({ data: { name: 'Bagus Santoso', email: 'bagus.spv@contoh.id', role: Role.SUPERVISOR } }),
    prisma.user.create({ data: { name: 'Sari Melati', email: 'sari.qc@contoh.id', role: Role.QC } }),
    prisma.user.create({ data: { name: 'Fitri Handayani', email: 'fitri.fin@contoh.id', role: Role.FINANCE } }),
    prisma.user.create({ data: { name: 'Dedi Kurniawan', email: 'dedi.dir@contoh.id', role: Role.VIEWER } }),
  ]);

  // --- Contacts ---
  const client = await prisma.contact.create({
    data: { name: 'PT Nusantara Sejahtera', type: ContactType.CLIENT, email: 'kontak@nusantara.contoh.id' },
  });
  const vendor = await prisma.contact.create({
    data: { name: 'CV Baja Perkasa', type: ContactType.VENDOR, email: 'sales@bajaperkasa.contoh.id' },
  });

  // --- Project ---
  const project = await prisma.project.create({
    data: {
      code: 'PRJ-2026-00001',
      name: 'Pembangunan Gudang Distribusi Regional',
      description: 'Pembangunan dua gudang distribusi di Jawa Barat dan Jawa Tengah.',
      startDate: new Date('2026-08-01'),
      finishDate: new Date('2027-02-28'),
      status: ProjectStatus.ACTIVE,
      clientId: client.id,
      picId: pm.id,
      contractValue: 5_000_000_000,
      initialBudget: 4_500_000_000,
      allowOverbudget: false,
      createdBy: admin.id,
      members: {
        create: [
          { userId: pm.id, role: ProjectMemberRole.PIC_UTAMA },
          { userId: supervisor.id, role: ProjectMemberRole.SUPERVISOR },
          { userId: qc.id, role: ProjectMemberRole.QC },
          { userId: finance.id, role: ProjectMemberRole.FINANCE },
        ],
      },
      locations: {
        create: [
          { name: 'Gudang Bandung', city: 'Bandung', province: 'Jawa Barat', weightPct: 60, picId: supervisor.id },
          { name: 'Gudang Semarang', city: 'Semarang', province: 'Jawa Tengah', weightPct: 40 },
        ],
      },
    },
    include: { locations: true },
  });

  const locBandung = project.locations.find((l) => l.name === 'Gudang Bandung')!;

  // --- Stages (5, tetap) ---
  for (let i = 0; i < STAGE_SEQUENCE.length; i++) {
    const type = STAGE_SEQUENCE[i];
    const isInitiating = type === StageType.INITIATING;
    const isPlanning = type === StageType.PLANNING;
    const stage = await prisma.projectStage.create({
      data: {
        projectId: project.id,
        stageType: type,
        sequence: i + 1,
        status: isInitiating
          ? StageStatus.APPROVED
          : isPlanning
            ? StageStatus.APPROVED
            : StageStatus.IN_PROGRESS,
        completionPct: isInitiating ? 100 : isPlanning ? 100 : 25,
        picId: pm.id,
        approvedById: isInitiating || isPlanning ? admin.id : null,
        approvedAt: isInitiating || isPlanning ? new Date('2026-07-20') : null,
      },
    });

    if (isInitiating) {
      await prisma.initiatingForm.create({
        data: {
          stageId: stage.id,
          objective: 'Menyediakan kapasitas gudang tambahan untuk distribusi regional.',
          inScope: 'Konstruksi bangunan gudang, instalasi listrik, akses jalan.',
          outOfScope: 'Pengadaan rak & forklift.',
          initialBudget: 4_500_000_000,
          estimatedDays: 210,
          sponsorApproverId: admin.id,
          deliverables: {
            create: [
              { name: 'Gudang Bandung siap operasi', targetDate: new Date('2026-12-31') },
              { name: 'Gudang Semarang siap operasi', targetDate: new Date('2027-02-15') },
            ],
          },
          stakeholders: {
            create: [{ name: 'PT Nusantara Sejahtera', role: 'Client', influence: 'HIGH' }],
          },
        },
      });
      await prisma.initiatingChecklist.createMany({
        data: [
          { stageId: stage.id, text: 'Tujuan & ruang lingkup disepakati bersama client', isRequired: true, isChecked: true, sortOrder: 1 },
          { stageId: stage.id, text: 'Stakeholder teridentifikasi lengkap', isRequired: true, isChecked: true, sortOrder: 2 },
          { stageId: stage.id, text: 'Estimasi anggaran awal disetujui', isRequired: true, isChecked: true, sortOrder: 3 },
          { stageId: stage.id, text: 'Dokumen kontrak / SPK tersedia', isRequired: true, isChecked: true, sortOrder: 4 },
          { stageId: stage.id, text: 'Project charter ditandatangani', isRequired: true, isChecked: true, sortOrder: 5 },
        ],
      });
    }
  }

  // --- WBS (Planning) — struktur berjenjang untuk lokasi Bandung ---
  const parent = await prisma.wbsItem.create({
    data: {
      projectId: project.id,
      locationId: locBandung.id,
      wbsNumber: '1',
      level: 1,
      sortOrder: 1,
      name: 'Pekerjaan Struktur',
      itemType: WbsItemType.GROUP,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-10-31'),
    },
  });

  const leaves = [
    { wbsNumber: '1.1', name: 'Galian & Pondasi', itemType: WbsItemType.TASK, uom: 'ls', qty: 1, unitBudget: 350_000_000, isQcRequired: true },
    { wbsNumber: '1.2', name: 'Besi Beton D16', itemType: WbsItemType.MATERIAL, uom: 'kg', qty: 12_000, unitBudget: 15_000, isQcRequired: false },
    { wbsNumber: '1.3', name: 'Pengecoran Kolom', itemType: WbsItemType.TASK, uom: 'titik', qty: 48, unitBudget: 5_000_000, isQcRequired: true },
  ];

  let sort = 1;
  for (const leaf of leaves) {
    const total = Number(leaf.qty) * Number(leaf.unitBudget);
    const item = await prisma.wbsItem.create({
      data: {
        projectId: project.id,
        parentId: parent.id,
        locationId: locBandung.id,
        wbsNumber: leaf.wbsNumber,
        level: 2,
        sortOrder: sort++,
        name: leaf.name,
        itemType: leaf.itemType,
        uom: leaf.uom,
        qty: leaf.qty,
        unitBudget: leaf.unitBudget,
        totalBudget: total,
        isQcRequired: leaf.isQcRequired,
        vendorId: leaf.itemType === WbsItemType.MATERIAL ? vendor.id : null,
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-10-31'),
        execution: {
          create: {
            progressPct: 30,
            status: ExecutionStatus.IN_PROGRESS,
            actualQty: Number(leaf.qty) * 0.3,
            picId: supervisor.id,
          },
        },
        qc: {
          create: { qcStatus: QcStatus.BELUM_DIPERIKSA },
        },
      },
    });
    console.log(`  WBS ${item.wbsNumber} — ${item.name} (Rp ${total.toLocaleString('id-ID')})`);
  }

  // Rollup sederhana total anggaran induk & proyek (di produksi: service async, §8)
  const leafItems = await prisma.wbsItem.findMany({
    where: { projectId: project.id, itemType: { not: WbsItemType.GROUP } },
  });
  const projectTotal = leafItems.reduce((s, it) => s + Number(it.totalBudget), 0);
  await prisma.wbsItem.update({ where: { id: parent.id }, data: { totalBudget: projectTotal } });
  await prisma.project.update({ where: { id: project.id }, data: { totalBudget: projectTotal } });

  // --- Closing documents (template default) ---
  await prisma.projectDocument.createMany({
    data: CLOSING_DOCS.map((d, i) => ({
      projectId: project.id,
      name: d.name,
      isRequired: d.isRequired,
      status: DocumentStatus.BELUM,
      sortOrder: i + 1,
    })),
  });

  // --- Risk register ---
  await prisma.projectRisk.create({
    data: {
      projectId: project.id,
      code: 'RSK-001',
      description: 'Keterlambatan pasokan besi beton dari vendor.',
      category: RiskCategory.JADWAL,
      likelihood: 3,
      impact: 4,
      score: 12,
      mitigationStrategy: MitigationStrategy.MITIGATE,
      mitigationPlan: 'Kontrak pasokan dengan dua vendor cadangan.',
      ownerId: pm.id,
      status: RiskStatus.OPEN,
    },
  });

  console.log(`\nSelesai. Proyek contoh: ${project.code} (total anggaran Rp ${projectTotal.toLocaleString('id-ID')}).`);
  console.log(`Users: admin@contoh.id, andi.pm@contoh.id, dst. (role sesuai §6).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
