import { Queue, QueueScheduler, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { DocumentType, SignatureProvider, SignatureStatus } from '@prisma/client';

import { prisma } from '../prisma';
import { StorageClient } from '../services/storage-client';
import { ClicksignClient } from './clicksign.client';
import { PdfJobPayload, SignatureJobPayload } from './signature.types';

export class SignatureWorker {
  private readonly connection: IORedis;
  private readonly worker: Worker;
  private readonly scheduler: QueueScheduler;
  private readonly queue: Queue;
  private readonly storage: StorageClient;
  private readonly clicksign: ClicksignClient;

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    const concurrency = parseNumber(process.env.SIGNATURE_CONCURRENCY, 2);

    this.scheduler = new QueueScheduler('signature-jobs', {
      connection: this.connection,
    });
    this.queue = new Queue('signature-jobs', { connection: this.connection });
    this.storage = new StorageClient();
    this.clicksign = new ClicksignClient();

    this.worker = new Worker('signature-jobs', (job) => this.handleJob(job), {
      connection: this.connection,
      concurrency,
    });

    this.worker.on('failed', (job, err) => {
      console.error({ jobId: job?.id, jobName: job?.name, err: err.message }, 'signature.failed');
    });
  }

  async shutdown() {
    await this.worker.close();
    await this.queue.close();
    await this.scheduler.close();
    await this.connection.quit();
    await prisma.$disconnect();
  }

  private async handleJob(job: Job) {
    if (job.name === 'pdf.generate') {
      return this.handlePdfJob(job as Job<PdfJobPayload>);
    }

    if (job.name === 'signature.create') {
      return this.handleSignatureJob(job as Job<SignatureJobPayload>);
    }

    console.info({ jobId: job.id, jobName: job.name }, 'signature.skip');
  }

  private async handlePdfJob(job: Job<PdfJobPayload>) {
    const { proposalId, protocol, candidate, requestId } = job.data;

    const pdfBuffer = await buildPdfContract({
      protocol,
      candidateName: candidate.name,
    });

    const storageKey = `contracts/${proposalId}/${Date.now()}-contrato.pdf`;
    const fileName = `contrato-${protocol}.pdf`;

    await this.storage.upload({
      key: storageKey,
      buffer: pdfBuffer,
      contentType: 'application/pdf',
    });

    const document = await prisma.documentFile.create({
      data: {
        proposalId,
        type: DocumentType.OUTROS,
        storageKey,
        fileName,
        contentType: 'application/pdf',
        size: pdfBuffer.length,
      },
    });

    await this.queue.add(
      'signature.create',
      {
        proposalId,
        protocol,
        documentFileId: document.id,
        candidate,
        requestId,
      } satisfies SignatureJobPayload,
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }

  private async handleSignatureJob(job: Job<SignatureJobPayload>) {
    const { proposalId, protocol, documentFileId, candidate } = job.data;

    const documentFile = await prisma.documentFile.findUnique({
      where: { id: documentFileId },
    });
    if (!documentFile) {
      throw new Error('Document file not found');
    }

    const deadlineDays = parseNumber(process.env.SIGNATURE_DEADLINE_DAYS, 7);
    const deadline = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000);

    const envelopeResponse = await this.clicksign.createEnvelope({
      name: `Contrato ${protocol}`,
      deadlineAt: deadline.toISOString(),
      status: 'draft',
    });

    const envelopeId = envelopeResponse?.data?.id as string | undefined;
    if (!envelopeId) {
      throw new Error('Envelope ID not returned');
    }

    const buffer = await this.storage.download(documentFile.storageKey);
    const base64 = buffer.toString('base64');

    const documentResponse = await this.clicksign.uploadDocument(envelopeId, {
      filename: documentFile.fileName,
      contentBase64: base64,
    });
    const documentId = documentResponse?.data?.id as string | undefined;
    if (!documentId) {
      throw new Error('Document ID not returned');
    }

    const signerResponse = await this.clicksign.createSigner(envelopeId, {
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
    });
    const signerId = signerResponse?.data?.id as string | undefined;
    if (!signerId) {
      throw new Error('Signer ID not returned');
    }

    const authMethod =
      (process.env.CLICKSIGN_AUTH_METHOD as 'email' | 'sms' | 'whatsapp' | undefined) ?? 'email';
    const resolvedAuth =
      (authMethod === 'sms' || authMethod === 'whatsapp') && !candidate.phone
        ? 'email'
        : authMethod;

    await this.clicksign.createRequirement(envelopeId, {
      action: 'agree',
      role: 'sign',
      documentId,
      signerId,
    });

    await this.clicksign.createRequirement(envelopeId, {
      action: 'provide_evidence',
      role: 'sign',
      auth: resolvedAuth,
      documentId,
      signerId,
    });

    const internal = buildInternalSigner();
    let internalSignerId: string | undefined;
    if (internal) {
      const internalSigner = await this.clicksign.createSigner(envelopeId, {
        name: internal.name,
        email: internal.email,
        phone: internal.phone,
      });
      internalSignerId = internalSigner?.data?.id as string | undefined;

      if (internalSignerId) {
        await this.clicksign.createRequirement(envelopeId, {
          action: 'agree',
          role: 'sign',
          documentId,
          signerId: internalSignerId,
        });

        await this.clicksign.createRequirement(envelopeId, {
          action: 'provide_evidence',
          role: 'sign',
          auth: resolvedAuth,
          documentId,
          signerId: internalSignerId,
        });
      }
    }

    await this.clicksign.updateEnvelope(envelopeId, 'running');

    await this.clicksign.notifyEnvelope(envelopeId);

    const signerDetails = await this.clicksign.getSigner(envelopeId, signerId);
    const signerLink = extractSignerLink(signerDetails);

    await prisma.signatureEnvelope.create({
      data: {
        proposalId,
        provider: SignatureProvider.CLICKSIGN,
        envelopeId,
        status: SignatureStatus.SENT,
        deadline: deadline,
        signerName: candidate.name,
        signerEmail: candidate.email,
        signerPhone: candidate.phone ?? undefined,
        link: signerLink,
      },
    });

    await sendNotifications({
      email: candidate.email,
      phone: candidate.phone,
      link: signerLink,
    });
  }
}

const buildPdfContract = async (input: { protocol: string; candidateName: string }) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText('Contrato de Associacao', {
    x: 50,
    y: 780,
    size: 22,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(`Protocolo: ${input.protocol}`, {
    x: 50,
    y: 740,
    size: 12,
    font,
  });

  page.drawText(`Associado: ${input.candidateName}`, {
    x: 50,
    y: 720,
    size: 12,
    font,
  });

  page.drawText('Este documento foi gerado automaticamente para fins de assinatura eletronica.', {
    x: 50,
    y: 680,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

const buildInternalSigner = () => {
  const required = process.env.SIGNATURE_INTERNAL_REQUIRED?.toLowerCase() === 'true';
  if (!required) return null;

  const name = process.env.SIGNATURE_INTERNAL_SIGNER_NAME;
  const email = process.env.SIGNATURE_INTERNAL_SIGNER_EMAIL;
  if (!name || !email) return null;

  return {
    name,
    email,
    phone: process.env.SIGNATURE_INTERNAL_SIGNER_PHONE,
  };
};

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = value ? Number(value) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
};

const extractSignerLink = (response: any) => {
  return (
    response?.data?.attributes?.signature_url ??
    response?.data?.attributes?.sign_url ??
    response?.data?.attributes?.url ??
    response?.data?.links?.self
  );
};

const sendNotifications = async (input: { email?: string; phone?: string; link?: string }) => {
  if (!input.link) return;

  await Promise.all([
    sendSendgridEmail(input.email, input.link),
    sendTwilioWhatsapp(input.phone, input.link),
  ]);
};

const sendSendgridEmail = async (email?: string, link?: string) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM ?? 'no-reply@sistemacadastro.local';
  if (!apiKey || !email || !link) return;

  const payload = {
    personalizations: [{ to: [{ email }] }],
    from: { email: from },
    subject: 'Assinatura do contrato',
    content: [
      {
        type: 'text/plain',
        value: `Olá! Assine seu contrato aqui: ${link}`,
      },
    ],
  };

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
};

const sendTwilioWhatsapp = async (phone?: string, link?: string) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;

  if (!accountSid || !authToken || !from || !phone || !link) return;

  const body = new URLSearchParams({
    From: `whatsapp:${from}`,
    To: `whatsapp:${phone}`,
    Body: `Assine seu contrato: ${link}`,
  });

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
};
