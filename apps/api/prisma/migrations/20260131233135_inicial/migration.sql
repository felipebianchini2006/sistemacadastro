-- AlterTable
ALTER TABLE "DocumentFile" ADD COLUMN     "draftId" TEXT,
ALTER COLUMN "proposalId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "assignedAnalystId" TEXT,
ADD COLUMN     "draftId" TEXT;

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentLog" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Draft_expiresAt_idx" ON "Draft"("expiresAt");

-- CreateIndex
CREATE INDEX "ConsentLog_proposalId_createdAt_idx" ON "ConsentLog"("proposalId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentFile_draftId_type_idx" ON "DocumentFile"("draftId", "type");

-- CreateIndex
CREATE INDEX "Proposal_assignedAnalystId_idx" ON "Proposal"("assignedAnalystId");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_assignedAnalystId_fkey" FOREIGN KEY ("assignedAnalystId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
