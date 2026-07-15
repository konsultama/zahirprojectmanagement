-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PM', 'SUPERVISOR', 'QC', 'FINANCE', 'VIEWER');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CLIENT', 'VENDOR', 'BOTH');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('INITIATING', 'PLANNING', 'EXECUTING', 'MONITORING', 'CLOSING');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InfluenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "WbsItemType" AS ENUM ('GROUP', 'TASK', 'MATERIAL');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QcStatus" AS ENUM ('BELUM_DIPERIKSA', 'PASSED', 'FAILED', 'PERLU_PERBAIKAN', 'WAIVED');

-- CreateEnum
CREATE TYPE "RemediationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('BELUM', 'ADA', 'TERVERIFIKASI', 'TIDAK_BERLAKU');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('BIAYA', 'JADWAL', 'MUTU', 'K3', 'EKSTERNAL', 'SDM');

-- CreateEnum
CREATE TYPE "MitigationStrategy" AS ENUM ('AVOID', 'MITIGATE', 'TRANSFER', 'ACCEPT');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATED', 'CLOSED', 'OCCURRED');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('PIC_UTAMA', 'PIC_PENDAMPING', 'SUPERVISOR', 'QC', 'FINANCE', 'ANGGOTA');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'APPROVE', 'REJECT', 'REOPEN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContactType" NOT NULL DEFAULT 'CLIENT',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "startDate" DATE NOT NULL,
    "finishDate" DATE NOT NULL,
    "progressPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "clientId" TEXT NOT NULL,
    "picId" TEXT NOT NULL,
    "contractValue" DECIMAL(18,2),
    "initialBudget" DECIMAL(18,2),
    "totalBudget" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "allowOverbudget" BOOLEAN NOT NULL DEFAULT false,
    "overbudgetTolerancePct" DECIMAL(5,2),
    "overbudgetReason" TEXT,
    "isOverbudget" BOOLEAN NOT NULL DEFAULT false,
    "actualFinishDate" DATE,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLocation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "weightPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "picId" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectMemberRole" NOT NULL DEFAULT 'ANGGOTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAttachment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stageType" "StageType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completionPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "picId" TEXT,
    "actualStart" DATE,
    "actualEnd" DATE,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiatingForm" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "inScope" TEXT,
    "outOfScope" TEXT,
    "assumptions" JSONB,
    "constraints" JSONB,
    "initialBudget" DECIMAL(18,2),
    "estimatedDays" INTEGER,
    "sponsorApproverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InitiatingForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiatingDeliverable" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" DATE,

    CONSTRAINT "InitiatingDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiatingStakeholder" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "contact" TEXT,
    "influence" "InfluenceLevel" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "InitiatingStakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiatingRisk" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT,
    "likelihood" TEXT,

    CONSTRAINT "InitiatingRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiatingChecklist" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "responsibleId" TEXT,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InitiatingChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WbsItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "locationId" TEXT NOT NULL,
    "wbsNumber" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" VARCHAR(200) NOT NULL,
    "itemType" "WbsItemType" NOT NULL DEFAULT 'GROUP',
    "uom" TEXT,
    "qty" DECIMAL(18,4),
    "unitBudget" DECIMAL(18,2),
    "totalBudget" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "weightPct" DECIMAL(7,4),
    "startDate" DATE,
    "endDate" DATE,
    "picId" TEXT,
    "vendorId" TEXT,
    "predecessorId" TEXT,
    "notes" VARCHAR(500),
    "isQcRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WbsItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WbsBaseline" (
    "id" TEXT NOT NULL,
    "wbsItemId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "wbsNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "itemType" "WbsItemType" NOT NULL,
    "qty" DECIMAL(18,4),
    "unitBudget" DECIMAL(18,2),
    "totalBudget" DECIMAL(18,2) NOT NULL,
    "weightPct" DECIMAL(7,4),
    "startDate" DATE,
    "endDate" DATE,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WbsBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionRecord" (
    "id" TEXT NOT NULL,
    "wbsItemId" TEXT NOT NULL,
    "actualQty" DECIMAL(18,4),
    "progressPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "actualStart" DATE,
    "actualEnd" DATE,
    "picId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostActual" (
    "id" TEXT NOT NULL,
    "executionRecordId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "referenceNo" TEXT,
    "attachmentUrl" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostActual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcRecord" (
    "id" TEXT NOT NULL,
    "wbsItemId" TEXT NOT NULL,
    "qcStatus" "QcStatus" NOT NULL DEFAULT 'BELUM_DIPERIKSA',
    "inspectionDate" DATE,
    "inspectorId" TEXT,
    "findings" TEXT,
    "correctiveAction" TEXT,
    "remediationDue" DATE,
    "remediationStatus" "RemediationStatus",
    "attachmentUrls" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRisk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "RiskCategory" NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "mitigationStrategy" "MitigationStrategy",
    "mitigationPlan" TEXT,
    "ownerId" TEXT,
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "affectedWbsIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "DocumentStatus" NOT NULL DEFAULT 'BELUM',
    "fileUrl" TEXT,
    "documentNo" TEXT,
    "documentDate" DATE,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "waiverReason" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "projectId" TEXT,
    "actorId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_deletedAt_idx" ON "User"("role", "deletedAt");

-- CreateIndex
CREATE INDEX "Contact_type_deletedAt_idx" ON "Contact"("type", "deletedAt");

-- CreateIndex
CREATE INDEX "Contact_name_idx" ON "Contact"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "Project_status_deletedAt_idx" ON "Project"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE INDEX "Project_picId_idx" ON "Project"("picId");

-- CreateIndex
CREATE INDEX "ProjectLocation_projectId_idx" ON "ProjectLocation"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_role_key" ON "ProjectMember"("projectId", "userId", "role");

-- CreateIndex
CREATE INDEX "ProjectAttachment_projectId_idx" ON "ProjectAttachment"("projectId");

-- CreateIndex
CREATE INDEX "ProjectStage_projectId_idx" ON "ProjectStage"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStage_projectId_stageType_key" ON "ProjectStage"("projectId", "stageType");

-- CreateIndex
CREATE UNIQUE INDEX "InitiatingForm_stageId_key" ON "InitiatingForm"("stageId");

-- CreateIndex
CREATE INDEX "InitiatingDeliverable_formId_idx" ON "InitiatingDeliverable"("formId");

-- CreateIndex
CREATE INDEX "InitiatingStakeholder_formId_idx" ON "InitiatingStakeholder"("formId");

-- CreateIndex
CREATE INDEX "InitiatingRisk_formId_idx" ON "InitiatingRisk"("formId");

-- CreateIndex
CREATE INDEX "InitiatingChecklist_stageId_idx" ON "InitiatingChecklist"("stageId");

-- CreateIndex
CREATE INDEX "WbsItem_projectId_parentId_sortOrder_idx" ON "WbsItem"("projectId", "parentId", "sortOrder");

-- CreateIndex
CREATE INDEX "WbsItem_locationId_idx" ON "WbsItem"("locationId");

-- CreateIndex
CREATE INDEX "WbsItem_predecessorId_idx" ON "WbsItem"("predecessorId");

-- CreateIndex
CREATE INDEX "WbsBaseline_wbsItemId_version_idx" ON "WbsBaseline"("wbsItemId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionRecord_wbsItemId_key" ON "ExecutionRecord"("wbsItemId");

-- CreateIndex
CREATE INDEX "ExecutionRecord_status_idx" ON "ExecutionRecord"("status");

-- CreateIndex
CREATE INDEX "CostActual_executionRecordId_date_idx" ON "CostActual"("executionRecordId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "QcRecord_wbsItemId_key" ON "QcRecord"("wbsItemId");

-- CreateIndex
CREATE INDEX "QcRecord_qcStatus_idx" ON "QcRecord"("qcStatus");

-- CreateIndex
CREATE INDEX "ProjectRisk_projectId_status_idx" ON "ProjectRisk"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRisk_projectId_code_key" ON "ProjectRisk"("projectId", "code");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_projectId_createdAt_idx" ON "AuditLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_picId_fkey" FOREIGN KEY ("picId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocation" ADD CONSTRAINT "ProjectLocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocation" ADD CONSTRAINT "ProjectLocation_picId_fkey" FOREIGN KEY ("picId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAttachment" ADD CONSTRAINT "ProjectAttachment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStage" ADD CONSTRAINT "ProjectStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStage" ADD CONSTRAINT "ProjectStage_picId_fkey" FOREIGN KEY ("picId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStage" ADD CONSTRAINT "ProjectStage_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiatingForm" ADD CONSTRAINT "InitiatingForm_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ProjectStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiatingDeliverable" ADD CONSTRAINT "InitiatingDeliverable_formId_fkey" FOREIGN KEY ("formId") REFERENCES "InitiatingForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiatingStakeholder" ADD CONSTRAINT "InitiatingStakeholder_formId_fkey" FOREIGN KEY ("formId") REFERENCES "InitiatingForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiatingRisk" ADD CONSTRAINT "InitiatingRisk_formId_fkey" FOREIGN KEY ("formId") REFERENCES "InitiatingForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiatingChecklist" ADD CONSTRAINT "InitiatingChecklist_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ProjectStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsItem" ADD CONSTRAINT "WbsItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsItem" ADD CONSTRAINT "WbsItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WbsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsItem" ADD CONSTRAINT "WbsItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ProjectLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsItem" ADD CONSTRAINT "WbsItem_picId_fkey" FOREIGN KEY ("picId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsItem" ADD CONSTRAINT "WbsItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsItem" ADD CONSTRAINT "WbsItem_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "WbsItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsBaseline" ADD CONSTRAINT "WbsBaseline_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES "WbsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRecord" ADD CONSTRAINT "ExecutionRecord_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES "WbsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRecord" ADD CONSTRAINT "ExecutionRecord_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRecord" ADD CONSTRAINT "ExecutionRecord_picId_fkey" FOREIGN KEY ("picId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostActual" ADD CONSTRAINT "CostActual_executionRecordId_fkey" FOREIGN KEY ("executionRecordId") REFERENCES "ExecutionRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcRecord" ADD CONSTRAINT "QcRecord_wbsItemId_fkey" FOREIGN KEY ("wbsItemId") REFERENCES "WbsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QcRecord" ADD CONSTRAINT "QcRecord_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
