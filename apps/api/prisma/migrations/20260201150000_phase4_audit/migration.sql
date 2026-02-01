-- AlterEnum
DO $$ BEGIN
  ALTER TYPE "DocumentType" ADD VALUE 'TRILHA_ASSINATURA';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
