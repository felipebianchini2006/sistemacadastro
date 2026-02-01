-- AlterEnum
DO $$ BEGIN
  ALTER TYPE "DocumentType" ADD VALUE 'COMPROVANTE_RESIDENCIA';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "profileRoles" JSONB,
ADD COLUMN     "profileRoleOther" TEXT,
ADD COLUMN     "migrationEntity" TEXT,
ADD COLUMN     "migrationConfirmed" BOOLEAN;

-- AlterTable
ALTER TABLE "OcrResult" ADD COLUMN     "draftId" TEXT,
ALTER COLUMN "proposalId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "OcrResult_draftId_createdAt_idx" ON "OcrResult"("draftId", "createdAt");

-- AddForeignKey
ALTER TABLE "OcrResult" ADD CONSTRAINT "OcrResult_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
