-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "BankAccountType" AS ENUM ('CC', 'CP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "bankName" TEXT,
ADD COLUMN IF NOT EXISTS "agencyEncrypted" TEXT,
ADD COLUMN IF NOT EXISTS "accountType" "BankAccountType",
ADD COLUMN IF NOT EXISTS "holderName" TEXT,
ADD COLUMN IF NOT EXISTS "holderDocumentEncrypted" TEXT,
ADD COLUMN IF NOT EXISTS "pixKeyEncrypted" TEXT,
ADD COLUMN IF NOT EXISTS "pixKeyType" TEXT;
