import { randomUUID } from 'crypto';
import { Worker, QueueScheduler, Job } from 'bullmq';
import IORedis from 'ioredis';
import { DocumentType, ProposalStatus } from '@prisma/client';

import { prisma } from '../prisma';
import { VisionOcrService } from '../services/vision-ocr.service';
import { StorageClient } from '../services/storage-client';
import { preprocessImage } from '../services/image-preprocessor';
import { parseDocumentText } from './ocr-parser';
import { compareOcrWithProposal } from './ocr-compare';
import { OcrJobPayload } from './ocr.types';

const OCR_DOC_TYPES = new Set<DocumentType>([DocumentType.RG_FRENTE, DocumentType.CNH]);

export class OcrWorker {
  private readonly connection: IORedis;
  private readonly worker: Worker<OcrJobPayload>;
  private readonly scheduler: QueueScheduler;
  private readonly vision: VisionOcrService;
  private readonly storage: StorageClient;

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    const limiterMax = parseNumber(process.env.OCR_LIMITER_MAX, 10);
    const limiterDuration = parseNumber(process.env.OCR_LIMITER_DURATION_MS, 60000);
    const concurrency = parseNumber(process.env.OCR_CONCURRENCY, 2);

    this.scheduler = new QueueScheduler('public-jobs', {
      connection: this.connection,
    });

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
    await this.scheduler.close();
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
      },
    });

    if (!documentFile) {
      throw new Error('DocumentFile not found');
    }

    if (documentFile.proposalId !== job.data.proposalId) {
      throw new Error('DocumentFile does not match proposal');
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

    const originalBuffer = await this.storage.download(documentFile.storageKey);
    let buffer = originalBuffer;
    let preprocessInfo: { resized: boolean; rotated: boolean } | undefined;

    if (documentFile.contentType.startsWith('image/')) {
      const processed = await preprocessImage(originalBuffer);
      buffer = processed.buffer;
      preprocessInfo = {
        resized: processed.resized,
        rotated: processed.rotated,
      };
    }

    const visionResult = await this.vision.documentTextDetection(buffer);
    const parsed = parseDocumentText(visionResult.rawText);

    const proposal = documentFile.proposal;
    const comparison = compareOcrWithProposal({
      fields: parsed.fields,
      proposalName: proposal?.person?.fullName,
      proposalCpfHash: proposal?.person?.cpfHash,
    });

    await prisma.ocrResult.create({
      data: {
        proposalId: job.data.proposalId,
        documentFileId: documentFile.id,
        rawText: visionResult.rawText,
        structuredData: {
          document_type: parsed.documentType,
          fields: {
            nome: parsed.fields.nome,
            cpf: parsed.fields.cpf,
            rg_cnh: parsed.fields.rgCnh,
            data_emissao: parsed.fields.dataEmissao,
            data_validade: parsed.fields.dataValidade,
            orgao_emissor: parsed.fields.orgaoEmissor,
            uf: parsed.fields.uf,
          },
        },
        score: comparison.nameSimilarity,
        heuristics: {
          ...parsed.heuristics,
          preprocess: preprocessInfo,
          comparison,
          requestId,
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
        documentFileId: job.data.documentFileId,
        durationMs,
      },
      'ocr.done',
    );
  }

  private async flagMismatch(proposalId: string, currentStatus: ProposalStatus, reasons: string[]) {
    if (currentStatus === ProposalStatus.PENDING_DOCS) {
      return;
    }

    if (![ProposalStatus.SUBMITTED, ProposalStatus.UNDER_REVIEW].includes(currentStatus)) {
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
}

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = value ? Number(value) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
};
