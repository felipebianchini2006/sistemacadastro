import { createHash, randomUUID } from 'crypto';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { DocumentType, ProposalStatus } from '@prisma/client';

import { prisma } from '../prisma';
import { VisionOcrService } from '../services/vision-ocr.service';
import { StorageClient } from '../services/storage-client';
import { preprocessImage, type ImagePreprocessResult } from '../services/image-preprocessor';
import { parseAddressText, parseDocumentText } from './ocr-parser';
import { compareOcrWithProposal } from './ocr-compare';
import { OcrJobPayload } from './ocr.types';

const OCR_DOC_TYPES = new Set<DocumentType>([
  DocumentType.RG_FRENTE,
  DocumentType.CNH,
  DocumentType.COMPROVANTE_RESIDENCIA,
]);

export class OcrWorker {
  private readonly connection: IORedis;
  private readonly worker: Worker<OcrJobPayload>;
  private readonly vision: VisionOcrService;
  private readonly storage: StorageClient;

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    const limiterMax = parseNumber(process.env.OCR_LIMITER_MAX, 10);
    const limiterDuration = parseNumber(process.env.OCR_LIMITER_DURATION_MS, 60000);
    const concurrency = parseNumber(process.env.OCR_CONCURRENCY, 2);

    this.vision = new VisionOcrService();
    this.storage = new StorageClient();

    this.worker = new Worker<OcrJobPayload>('public-jobs', (job) => this.handleJob(job), {
      connection: this.connection,
      concurrency,
      limiter: {
        max: limiterMax,
        duration: limiterDuration,
      },
    });

    this.worker.on('failed', (job, err) => {
      const requestId = job?.data?.requestId ?? job?.id ?? 'unknown';
      console.error({ requestId, err: err.message }, 'ocr.failed');
    });
  }

  async shutdown() {
    await this.worker.close();
    await this.connection.quit();
    await prisma.$disconnect();
  }

  private async handleJob(job: Job<OcrJobPayload>) {
    if (job.name !== 'ocr.process') {
      console.info({ jobId: job.id, jobName: job.name }, 'ocr.skipped.non_ocr_job');
      return;
    }

    const requestId = job.data.requestId ?? job.id ?? randomUUID();
    const startedAt = Date.now();

    console.info(
      {
        requestId,
        jobId: job.id,
        proposalId: job.data.proposalId,
        draftId: job.data.draftId,
        documentFileId: job.data.documentFileId,
      },
      'ocr.start',
    );

    const documentFile = await prisma.documentFile.findUnique({
      where: { id: job.data.documentFileId },
      include: {
        proposal: {
          include: {
            person: true,
          },
        },
        draft: true,
      },
    });

    if (!documentFile) {
      throw new Error('DocumentFile not found');
    }

    if (!job.data.proposalId && !job.data.draftId) {
      throw new Error('OCR payload missing proposalId or draftId');
    }

    if (job.data.proposalId && documentFile.proposalId !== job.data.proposalId) {
      throw new Error('DocumentFile does not match proposal');
    }

    if (job.data.draftId && documentFile.draftId !== job.data.draftId) {
      throw new Error('DocumentFile does not match draft');
    }

    if (!OCR_DOC_TYPES.has(documentFile.type)) {
      console.info(
        {
          requestId,
          documentType: documentFile.type,
        },
        'ocr.skipped',
      );
      return;
    }

    if (!this.vision.enabled) {
      console.info(
        {
          requestId,
          reason: 'ocr_disabled',
        },
        'ocr.skipped',
      );
      return;
    }

    const originalBuffer = await this.storage.download(documentFile.storageKey);
    let buffer = Buffer.from(originalBuffer);
    let preprocessInfo: Omit<ImagePreprocessResult, 'buffer'> | undefined;

    if (documentFile.contentType.startsWith('image/')) {
      const processed = await preprocessImage(originalBuffer);
      buffer = Buffer.from(processed.buffer);
      preprocessInfo = {
        resized: processed.resized,
        rotated: processed.rotated,
        originalWidth: processed.originalWidth,
        originalHeight: processed.originalHeight,
      };

      const minWidth = parseNumber(process.env.OCR_MIN_WIDTH, 600);
      const minHeight = parseNumber(process.env.OCR_MIN_HEIGHT, 600);
      const minBytes = parseNumber(process.env.OCR_MIN_BYTES, 20000);
      const width = processed.originalWidth ?? 0;
      const height = processed.originalHeight ?? 0;
      const size = originalBuffer.length;
      const tooSmall =
        (width && width < minWidth) || (height && height < minHeight) || size < minBytes;

      if (tooSmall) {
        await this.recordLegibilityFailure({
          proposalId: job.data.proposalId ?? null,
          draftId: job.data.draftId ?? null,
          documentFileId: documentFile.id,
          documentFileType: documentFile.type,
          requestId,
          preprocessInfo,
          minWidth,
          minHeight,
          minBytes,
          width,
          height,
          size,
        });
        console.info({ requestId, documentFileId: documentFile.id }, 'ocr.skipped.legibility');
        return;
      }
    }

    const visionResult = await this.vision.documentTextDetection(buffer);
    const rawText = visionResult.rawText ?? '';
    const legibilityMin = parseNumber(process.env.OCR_MIN_TEXT_LENGTH, 20);
    const legible = rawText.trim().length >= legibilityMin;

    const parsed =
      documentFile.type === DocumentType.COMPROVANTE_RESIDENCIA ? null : parseDocumentText(rawText);
    const address =
      documentFile.type === DocumentType.COMPROVANTE_RESIDENCIA ? parseAddressText(rawText) : null;

    const proposal = documentFile.proposal;
    let comparison: ReturnType<typeof compareOcrWithProposal> = {
      mismatch: false,
      reasons: [],
      nameSimilarity: 1,
      nameDivergence: 0,
      nameThreshold: 0.2,
    };
    if (parsed) {
      const divergenceThreshold = resolveDivergenceThreshold(process.env.OCR_DIVERGENCE_THRESHOLD);
      if (proposal?.person) {
        comparison = compareOcrWithProposal({
          fields: parsed.fields,
          proposalName: proposal.person.fullName,
          proposalCpfHash: proposal.person.cpfHash,
          nameDivergenceThreshold: divergenceThreshold,
        });
      } else if (documentFile.draftId) {
        const draft = await prisma.draft.findUnique({
          where: { id: documentFile.draftId },
          select: { data: true },
        });
        const draftData = (draft?.data ?? {}) as { fullName?: string; cpf?: string };
        const cpfHash = draftData.cpf
          ? createHash('sha256').update(draftData.cpf).digest('hex')
          : undefined;
        comparison = compareOcrWithProposal({
          fields: parsed.fields,
          proposalName: draftData.fullName,
          proposalCpfHash: cpfHash,
          nameDivergenceThreshold: divergenceThreshold,
        });
      }
    }

    const expired =
      parsed?.fields?.dataValidade &&
      !Number.isNaN(new Date(parsed.fields.dataValidade).getTime()) &&
      new Date(parsed.fields.dataValidade) < new Date();

    const detectedType = parsed?.documentType ?? null;
    const uploadedType = resolveUploadedDocType(documentFile.type);
    const typeMismatch =
      detectedType && detectedType !== 'UNKNOWN' && uploadedType && detectedType !== uploadedType;

    await prisma.ocrResult.create({
      data: {
        proposalId: job.data.proposalId ?? null,
        draftId: job.data.draftId ?? null,
        documentFileId: documentFile.id,
        rawText,
        structuredData: {
          document_type:
            documentFile.type === DocumentType.COMPROVANTE_RESIDENCIA
              ? 'COMPROVANTE_RESIDENCIA'
              : parsed?.documentType,
          fields:
            documentFile.type === DocumentType.COMPROVANTE_RESIDENCIA
              ? {
                  cep: address?.cep,
                  endereco: address?.endereco,
                }
              : {
                  nome: parsed?.fields.nome,
                  cpf: parsed?.fields.cpf,
                  rg_cnh: parsed?.fields.rgCnh,
                  data_emissao: parsed?.fields.dataEmissao,
                  data_validade: parsed?.fields.dataValidade,
                  orgao_emissor: parsed?.fields.orgaoEmissor,
                  uf: parsed?.fields.uf,
                },
        },
        score: comparison.nameSimilarity,
        heuristics: {
          ...(parsed?.heuristics ?? {}),
          preprocess: preprocessInfo,
          comparison,
          docType: {
            detected: detectedType,
            uploaded: uploadedType,
            mismatch: typeMismatch,
          },
          requestId,
          legibility: {
            ok: legible,
            minTextLength: legibilityMin,
            rawLength: rawText.trim().length,
          },
          expired,
        },
      },
    });

    if (comparison.mismatch && proposal) {
      await this.flagMismatch(proposal.id, proposal.status, comparison.reasons);
    }

    const durationMs = Date.now() - startedAt;
    console.info(
      {
        requestId,
        jobId: job.id,
        proposalId: job.data.proposalId,
        draftId: job.data.draftId,
        documentFileId: job.data.documentFileId,
        durationMs,
      },
      'ocr.done',
    );
  }

  private async flagMismatch(proposalId: string, currentStatus: ProposalStatus, reasons: string[]) {
    const allowedStatuses: ProposalStatus[] = [
      ProposalStatus.SUBMITTED,
      ProposalStatus.UNDER_REVIEW,
    ];

    if (currentStatus === ProposalStatus.PENDING_DOCS) {
      return;
    }

    if (!allowedStatuses.includes(currentStatus)) {
      return;
    }

    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: ProposalStatus.PENDING_DOCS,
        statusHistory: {
          create: {
            fromStatus: currentStatus,
            toStatus: ProposalStatus.PENDING_DOCS,
            reason: `Divergencia OCR (${reasons.join(', ')})`,
          },
        },
      },
    });
  }

  private async recordLegibilityFailure(input: {
    proposalId: string | null;
    draftId: string | null;
    documentFileId: string;
    documentFileType: DocumentType;
    requestId: string;
    preprocessInfo?: {
      resized: boolean;
      rotated: boolean;
      originalWidth?: number;
      originalHeight?: number;
    };
    minWidth: number;
    minHeight: number;
    minBytes: number;
    width: number;
    height: number;
    size: number;
  }) {
    await prisma.ocrResult.create({
      data: {
        proposalId: input.proposalId,
        draftId: input.draftId,
        documentFileId: input.documentFileId,
        rawText: '',
        structuredData: {
          document_type:
            input.documentFileType === DocumentType.COMPROVANTE_RESIDENCIA
              ? 'COMPROVANTE_RESIDENCIA'
              : (resolveUploadedDocType(input.documentFileType) ?? 'UNKNOWN'),
          fields: {},
        },
        score: 0,
        heuristics: {
          preprocess: input.preprocessInfo,
          requestId: input.requestId,
          legibility: {
            ok: false,
            reason: 'resolution_or_size',
            minWidth: input.minWidth,
            minHeight: input.minHeight,
            minBytes: input.minBytes,
            width: input.width,
            height: input.height,
            size: input.size,
          },
        },
      },
    });
  }
}

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = value ? Number(value) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
};

const resolveDivergenceThreshold = (value?: string) => {
  if (!value) return 0.2;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.2;
  const ratio = parsed > 1 ? parsed / 100 : parsed;
  if (!Number.isFinite(ratio)) return 0.2;
  return Math.min(0.5, Math.max(0.05, ratio));
};

const resolveUploadedDocType = (type: DocumentType) => {
  if (type === DocumentType.CNH) return 'CNH';
  if (type === DocumentType.RG_FRENTE || type === DocumentType.RG_VERSO) {
    return 'RG';
  }
  return null;
};
