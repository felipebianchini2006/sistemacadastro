import { z } from 'zod';
import { DocumentType } from '@prisma/client';

export const ALLOWED_PUBLIC_DOC_TYPES = new Set<DocumentType>([
  DocumentType.RG_FRENTE,
  DocumentType.RG_VERSO,
  DocumentType.CNH,
  DocumentType.COMPROVANTE_RESIDENCIA,
  DocumentType.SELFIE,
  DocumentType.DESFILIACAO,
  DocumentType.OUTROS,
]);

export const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
export const ALLOWED_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  'application/pdf',
]);

export const uploadPresignSchema = z
  .object({
    draftId: z.string().uuid().optional(),
    draftToken: z.string().optional(),
    proposalId: z.string().uuid().optional(),
    proposalToken: z.string().optional(),
    docType: z.nativeEnum(DocumentType),
    fileName: z.string().min(1),
    contentType: z.string().min(1),
    size: z.number().int().positive(),
    imageWidth: z.number().int().positive().optional(),
    imageHeight: z.number().int().positive().optional(),
    checksum: z.string().optional(),
  })
  .strict();

export type UploadPresignPayload = z.infer<typeof uploadPresignSchema>;
