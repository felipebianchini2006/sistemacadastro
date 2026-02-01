-- AlterEnum
DO $$ BEGIN
  ALTER TYPE "DocumentType" ADD VALUE 'CONTRATO_GERADO';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "DocumentType" ADD VALUE 'CONTRATO_ASSINADO';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "DocumentType" ADD VALUE 'CERTIFICADO_ASSINATURA';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "SignatureEnvelope"
  ADD COLUMN "documentFileId" TEXT,
  ADD COLUMN "signedAt" TIMESTAMP(3),
  ADD COLUMN "signerIp" TEXT,
  ADD COLUMN "signerUserAgent" TEXT,
  ADD COLUMN "signerMethod" TEXT,
  ADD COLUMN "signerGeo" TEXT,
  ADD COLUMN "originalFileHash" TEXT,
  ADD COLUMN "signedFileKey" TEXT,
  ADD COLUMN "signedFileHash" TEXT,
  ADD COLUMN "certificateFileKey" TEXT,
  ADD COLUMN "certificateFileHash" TEXT;

-- CreateIndex
CREATE INDEX "SignatureEnvelope_documentFileId_idx" ON "SignatureEnvelope"("documentFileId");

-- AddForeignKey
ALTER TABLE "SignatureEnvelope"
  ADD CONSTRAINT "SignatureEnvelope_documentFileId_fkey"
  FOREIGN KEY ("documentFileId") REFERENCES "DocumentFile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
