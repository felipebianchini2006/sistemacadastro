import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  DocumentType,
  NotificationChannel,
  NotificationStatus,
  Prisma,
  SignatureProvider,
  SignatureStatus,
} from '@prisma/client';
import { createHash } from 'crypto';

import { prisma } from '../prisma';
import { StorageClient } from '../services/storage-client';
import { decryptValue } from '../services/crypto';
import { ClicksignClient } from './clicksign.client';
import {
  PdfJobPayload,
  DossierJobPayload,
  SignatureJobPayload,
  SignatureCancelJobPayload,
  SignatureAuditJobPayload,
} from './signature.types';

export class SignatureWorker {
  private readonly connection: IORedis;
  private readonly worker: Worker;
  private readonly queue: Queue;
  private readonly notificationQueue: Queue;
  private readonly storage: StorageClient;
  private readonly clicksign: ClicksignClient;

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    const concurrency = parseNumber(process.env.SIGNATURE_CONCURRENCY, 2);

    this.queue = new Queue('signature-jobs', { connection: this.connection });
    this.notificationQueue = new Queue('notification-jobs', {
      connection: this.connection,
    });
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
    await this.notificationQueue.close();
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

    if (job.name === 'dossier.generate') {
      return this.handleDossierJob(job as Job<DossierJobPayload>);
    }

    if (job.name === 'signature.cancel') {
      return this.handleCancelJob(job as Job<SignatureCancelJobPayload>);
    }

    if (job.name === 'signature.audit') {
      return this.handleAuditJob(job as Job<SignatureAuditJobPayload>);
    }

    console.info({ jobId: job.id, jobName: job.name }, 'signature.skip');
  }

  private async handlePdfJob(job: Job<PdfJobPayload>) {
    const { proposalId, protocol, candidate, requestId } = job.data;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        person: true,
        address: true,
        documents: true,
      },
    });

    const cpf = proposal?.person?.cpfEncrypted
      ? decryptValue(proposal.person.cpfEncrypted)
      : undefined;
    const email = proposal?.person?.emailEncrypted
      ? decryptValue(proposal.person.emailEncrypted)
      : undefined;
    const phone = proposal?.person?.phoneEncrypted
      ? decryptValue(proposal.person.phoneEncrypted)
      : undefined;

    const pdfBuffer = await buildPdfContract({
      protocol,
      candidateName: candidate.name,
      proposal,
      cpf,
      email,
      phone,
    });
    const checksum = createHash('sha256').update(pdfBuffer).digest('hex');

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
        type: DocumentType.CONTRATO_GERADO,
        storageKey,
        fileName,
        contentType: 'application/pdf',
        size: pdfBuffer.length,
        checksum,
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
    const originalHash = documentFile.checksum ?? createHash('sha256').update(buffer).digest('hex');
    if (!documentFile.checksum) {
      await prisma.documentFile.update({
        where: { id: documentFile.id },
        data: { checksum: originalHash },
      });
    }

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
        documentFileId,
        provider: SignatureProvider.CLICKSIGN,
        envelopeId,
        status: SignatureStatus.SENT,
        deadline: deadline,
        signerName: candidate.name,
        signerEmail: candidate.email,
        signerPhone: candidate.phone ?? undefined,
        link: signerLink,
        originalFileHash: originalHash,
      },
    });

    await this.queueNotification({
      proposalId,
      channel: NotificationChannel.EMAIL,
      to: candidate.email,
      template: 'proposal_approved',
      data: { signatureLink: signerLink },
    });

    if (candidate.phone) {
      await this.queueNotification({
        proposalId,
        channel: NotificationChannel.SMS,
        to: candidate.phone,
        template: 'proposal_approved',
        data: { signatureLink: signerLink },
      });
      await this.queueNotification({
        proposalId,
        channel: NotificationChannel.WHATSAPP,
        to: candidate.phone,
        template: 'proposal_approved',
        data: { signatureLink: signerLink },
        optIn: true,
      });
    }
  }

  private async handleCancelJob(job: Job<SignatureCancelJobPayload>) {
    const { proposalId, envelopeId } = job.data;
    if (!envelopeId) return;

    try {
      await this.clicksign.cancelEnvelope(envelopeId);
      await prisma.signatureEnvelope.updateMany({
        where: { envelopeId },
        data: { status: SignatureStatus.CANCELED },
      });
      console.info({ proposalId, envelopeId }, 'signature.canceled');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'cancel_failed';
      console.warn({ proposalId, envelopeId, message }, 'signature.cancel_failed');
    }
  }

  private async handleDossierJob(job: Job<DossierJobPayload>) {
    const { proposalId, protocol } = job.data;

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        person: {
          include: {
            socialAccounts: true,
            bankAccounts: true,
          },
        },
        address: true,
        documents: true,
        ocrResults: { orderBy: { createdAt: 'desc' } },
        signatures: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    const cpf = proposal.person?.cpfEncrypted
      ? decryptValue(proposal.person.cpfEncrypted)
      : undefined;
    const email = proposal.person?.emailEncrypted
      ? decryptValue(proposal.person.emailEncrypted)
      : undefined;
    const phone = proposal.person?.phoneEncrypted
      ? decryptValue(proposal.person.phoneEncrypted)
      : undefined;

    const bankAccount = proposal.person?.bankAccounts?.[0] ?? null;
    const bank = bankAccount
      ? {
          bankCode: bankAccount.bankCode ?? undefined,
          bankName: bankAccount.bankName ?? undefined,
          agency: bankAccount.agencyEncrypted
            ? decryptValue(bankAccount.agencyEncrypted)
            : undefined,
          account: bankAccount.accountEncrypted
            ? decryptValue(bankAccount.accountEncrypted)
            : undefined,
          accountType: bankAccount.accountType ?? undefined,
          holderName: bankAccount.holderName ?? undefined,
          holderDocument: bankAccount.holderDocumentEncrypted
            ? decryptValue(bankAccount.holderDocumentEncrypted)
            : undefined,
          pixKey: bankAccount.pixKeyEncrypted
            ? decryptValue(bankAccount.pixKeyEncrypted)
            : undefined,
          pixKeyType: bankAccount.pixKeyType ?? undefined,
        }
      : null;

    const pdfBuffer = await buildDossierPdf({
      protocol,
      proposal,
      cpf,
      email,
      phone,
      bank,
    });
    const checksum = createHash('sha256').update(pdfBuffer).digest('hex');

    const storageKey = `dossiers/${proposalId}/${Date.now()}-dossie.pdf`;
    const fileName = `dossie-${protocol}.pdf`;

    await this.storage.upload({
      key: storageKey,
      buffer: pdfBuffer,
      contentType: 'application/pdf',
    });

    await prisma.documentFile.create({
      data: {
        proposalId,
        type: DocumentType.OUTROS,
        storageKey,
        fileName,
        contentType: 'application/pdf',
        size: pdfBuffer.length,
        checksum,
      },
    });
  }

  private async handleAuditJob(job: Job<SignatureAuditJobPayload>) {
    const { proposalId, envelopeId } = job.data;

    const envelope = await prisma.signatureEnvelope.findFirst({
      where: { envelopeId },
      include: {
        proposal: {
          include: {
            person: true,
            address: true,
          },
        },
      },
    });

    if (!envelope || !envelope.proposal) {
      throw new Error('Signature envelope not found');
    }

    const pdfBuffer = await buildAuditPdf({
      proposal: envelope.proposal,
      envelope,
    });
    const checksum = createHash('sha256').update(pdfBuffer).digest('hex');

    const storageKey = `audit/${proposalId}/${Date.now()}-trilha-assinatura.pdf`;
    const fileName = `trilha-assinatura-${envelope.proposal.protocol}.pdf`;

    await this.storage.upload({
      key: storageKey,
      buffer: pdfBuffer,
      contentType: 'application/pdf',
    });

    await prisma.documentFile.create({
      data: {
        proposalId,
        type: DocumentType.TRILHA_ASSINATURA,
        storageKey,
        fileName,
        contentType: 'application/pdf',
        size: pdfBuffer.length,
        checksum,
      },
    });
  }

  private async queueNotification(input: {
    proposalId: string;
    channel: NotificationChannel;
    to: string;
    template: string;
    data: Record<string, unknown>;
    optIn?: boolean;
  }) {
    const notification = await prisma.notification.create({
      data: {
        proposalId: input.proposalId,
        channel: input.channel,
        status: NotificationStatus.PENDING,
        payloadRedacted: {
          toHash: hashValue(input.to),
          toMasked: maskContact(input.to),
          template: input.template,
          dataKeys: Object.keys(input.data ?? {}),
          optIn: input.optIn ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    const jobName =
      input.channel === NotificationChannel.EMAIL
        ? 'notify.email'
        : input.channel === NotificationChannel.SMS
          ? 'notify.sms'
          : 'notify.whatsapp';

    await this.notificationQueue.add(
      jobName,
      {
        notificationId: notification.id,
        to: input.to,
        template: input.template,
        data: input.data,
        requestId: notification.id,
        optIn: input.optIn,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }
}

const hashValue = (value: string) => createHash('sha256').update(value).digest('hex');

const maskContact = (value: string) => {
  if (value.includes('@')) {
    const [user, domain] = value.split('@');
    if (!domain) return '***';
    return `${user?.slice(0, 2) ?? '**'}***@${domain}`;
  }
  const digits = value.replace(/\D+/g, '');
  if (digits.length <= 4) return '***';
  return `***${digits.slice(-4)}`;
};

const buildPdfContract = async (input: {
  protocol: string;
  candidateName: string;
  proposal?: {
    person?: {
      birthDate?: Date | null;
    } | null;
    address?: {
      street?: string | null;
      number?: string | null;
      complement?: string | null;
      district?: string | null;
      city?: string | null;
      state?: string | null;
      cep?: string | null;
    } | null;
    profileRoles?: unknown | null;
    profileRoleOther?: string | null;
    documents?: Array<{ type: DocumentType; storageKey: string }> | null;
  } | null;
  cpf?: string;
  email?: string;
  phone?: string;
}) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let page = pdfDoc.addPage([595.28, 841.89]);
  let y = 780;

  const addLine = (text: string, size = 11, gap = 16) => {
    if (y < 60) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 780;
    }
    page.drawText(text, {
      x: 50,
      y,
      size,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= gap;
  };

  const addSection = (title: string) => {
    addLine(title, 13, 20);
  };

  addLine('Contrato de Associacao', 20, 26);
  addLine(`Protocolo: ${input.protocol}`, 12, 18);
  addLine(`Associado: ${input.candidateName}`, 12, 18);

  addSection('Dados pessoais');
  if (input.cpf) addLine(`CPF: ${input.cpf}`);
  if (input.email) addLine(`Email: ${input.email}`);
  if (input.phone) addLine(`Telefone: ${input.phone}`);
  if (input.proposal?.person?.birthDate) {
    addLine(`Data nascimento: ${input.proposal.person.birthDate.toLocaleDateString('pt-BR')}`);
  }

  const rolesRaw = Array.isArray(input.proposal?.profileRoles)
    ? (input.proposal?.profileRoles as string[])
    : [];
  const roles = [
    ...rolesRaw,
    input.proposal?.profileRoleOther ? `Outro: ${input.proposal.profileRoleOther}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  if (roles) {
    addSection('Perfil artistico');
    addLine(roles);
  }

  if (input.proposal?.address) {
    addSection('Endereco');
    const address = input.proposal.address;
    const line1 = [address.street, address.number].filter(Boolean).join(', ');
    const line2 = [address.district, address.city, address.state].filter(Boolean).join(' - ');
    if (line1) addLine(line1);
    if (line2) addLine(line2);
    if (address.cep) addLine(`CEP: ${address.cep}`);
    if (address.complement) addLine(`Complemento: ${address.complement}`);
  }

  if (input.proposal?.documents?.length) {
    addSection('Documentos enviados');
    input.proposal.documents.forEach((doc) => addLine(`${doc.type}`));
  }

  addLine('Este documento foi gerado automaticamente para fins de assinatura eletronica.', 10, 14);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

const buildAuditPdf = async (input: {
  proposal: {
    protocol: string;
    person?: { fullName: string } | null;
  };
  envelope: {
    envelopeId: string;
    signedAt?: Date | null;
    signerIp?: string | null;
    signerUserAgent?: string | null;
    signerMethod?: string | null;
    signerGeo?: string | null;
    originalFileHash?: string | null;
    signedFileHash?: string | null;
    certificateFileHash?: string | null;
  };
}) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let page = pdfDoc.addPage([595.28, 841.89]);
  let y = 780;

  const addLine = (text: string, size = 11, gap = 16) => {
    if (y < 60) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 780;
    }
    page.drawText(text, {
      x: 50,
      y,
      size,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= gap;
  };

  const addSection = (title: string) => {
    addLine(title, 13, 20);
  };

  addLine('Trilha de Auditoria da Assinatura', 18, 24);
  addLine(`Protocolo: ${input.proposal.protocol}`, 12, 18);
  if (input.proposal.person?.fullName) {
    addLine(`Associado: ${input.proposal.person.fullName}`, 12, 18);
  }

  addSection('Detalhes da assinatura');
  addLine(`Envelope ID: ${input.envelope.envelopeId}`);
  if (input.envelope.signedAt) {
    addLine(`Assinado em: ${input.envelope.signedAt.toLocaleString('pt-BR')}`);
  }
  if (input.envelope.signerMethod) {
    addLine(`Metodo: ${input.envelope.signerMethod}`);
  }
  if (input.envelope.signerIp) {
    addLine(`IP: ${input.envelope.signerIp}`);
  }
  if (input.envelope.signerUserAgent) {
    addLine(`User-Agent: ${input.envelope.signerUserAgent}`);
  }
  if (input.envelope.signerGeo) {
    addLine(`Geolocalizacao: ${input.envelope.signerGeo}`);
  }

  addSection('Hashes');
  if (input.envelope.originalFileHash) {
    addLine(`Original: ${input.envelope.originalFileHash}`);
  }
  if (input.envelope.signedFileHash) {
    addLine(`Assinado: ${input.envelope.signedFileHash}`);
  }
  if (input.envelope.certificateFileHash) {
    addLine(`Certificado: ${input.envelope.certificateFileHash}`);
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

const buildDossierPdf = async (input: {
  protocol: string;
  proposal: {
    profileRoles?: unknown | null;
    profileRoleOther?: string | null;
    person?: {
      fullName: string;
      birthDate?: Date | null;
      socialAccounts?: Array<{
        provider: string;
        createdAt: Date;
        tokenMeta?: Prisma.JsonValue | null;
      }>;
      bankAccounts?: Array<{
        bankCode?: string | null;
        bankName?: string | null;
        accountType?: string | null;
      }>;
    } | null;
    address?: {
      street?: string | null;
      number?: string | null;
      complement?: string | null;
      district?: string | null;
      city?: string | null;
      state?: string | null;
      cep?: string | null;
    } | null;
    documents?: Array<{ type: DocumentType; fileName: string }> | null;
    ocrResults?: Array<{
      createdAt: Date;
      structuredData?: Prisma.JsonValue | null;
    }>;
    signatures?: Array<{
      status: string;
      envelopeId: string;
      deadline?: Date | null;
      signedAt?: Date | null;
      signerIp?: string | null;
      signerMethod?: string | null;
      signerUserAgent?: string | null;
      signerGeo?: string | null;
      originalFileHash?: string | null;
      signedFileHash?: string | null;
      certificateFileHash?: string | null;
    }>;
    statusHistory?: Array<{
      fromStatus?: string | null;
      toStatus: string;
      createdAt: Date;
      reason?: string | null;
    }>;
    auditLogs?: Array<{
      action: string;
      createdAt: Date;
    }>;
  };
  cpf?: string;
  email?: string;
  phone?: string;
  bank?: {
    bankCode?: string;
    bankName?: string;
    agency?: string;
    account?: string;
    accountType?: string;
    holderName?: string;
    holderDocument?: string;
    pixKey?: string;
    pixKeyType?: string;
  } | null;
}) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let page = pdfDoc.addPage([595.28, 841.89]);
  let y = 780;

  const addLine = (text: string, size = 11, gap = 16) => {
    if (y < 60) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 780;
    }
    page.drawText(text, {
      x: 50,
      y,
      size,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= gap;
  };

  const addSection = (title: string) => {
    addLine(title, 13, 20);
  };

  const addWrapped = (text: string, size = 11, gap = 16) => {
    wrapText(text, 90).forEach((line) => addLine(line, size, gap));
  };

  const addKeyValue = (label: string, value?: string | null) => {
    if (!value) return;
    addWrapped(`${label}: ${value}`);
  };

  addLine('Dossie completo da proposta', 18, 24);
  addKeyValue('Protocolo', input.protocol);
  addKeyValue('Gerado em', formatDateTime(new Date()));

  addSection('Dados pessoais');
  addKeyValue('Nome', input.proposal.person?.fullName);
  addKeyValue('CPF', input.cpf);
  addKeyValue('Email', input.email);
  addKeyValue('Telefone', input.phone);
  if (input.proposal.person?.birthDate) {
    addKeyValue('Data nascimento', formatDate(input.proposal.person.birthDate));
  }

  addSection('Perfil artistico');
  const roles = formatProfileRoles(input.proposal.profileRoles, input.proposal.profileRoleOther);
  addWrapped(roles || 'Nao informado');

  if (input.proposal.address) {
    addSection('Endereco');
    const address = input.proposal.address;
    const line1 = [address.street, address.number].filter(Boolean).join(', ');
    const line2 = [address.district, address.city, address.state].filter(Boolean).join(' - ');
    if (line1) addWrapped(line1);
    if (line2) addWrapped(line2);
    if (address.cep) addKeyValue('CEP', address.cep);
    if (address.complement) addKeyValue('Complemento', address.complement);
  }

  addSection('Documentos enviados');
  if (input.proposal.documents?.length) {
    input.proposal.documents.forEach((doc) =>
      addWrapped(`- ${doc.type} (${doc.fileName})`, 10, 14),
    );
  } else {
    addWrapped('Nenhum documento enviado.');
  }

  addSection('OCR extraido');
  const latestOcr = input.proposal.ocrResults?.[0];
  if (latestOcr?.structuredData && typeof latestOcr.structuredData === 'object') {
    const data = latestOcr.structuredData as Record<string, any>;
    addKeyValue('Tipo documento', data.document_type ?? 'N/A');
    const fields = (data.fields ?? {}) as Record<string, any>;
    addKeyValue('Nome', fields.nome);
    addKeyValue('CPF', fields.cpf);
    addKeyValue('RG/CNH', fields.rg_cnh);
    addKeyValue('Data emissao', fields.data_emissao);
    addKeyValue('Data validade', fields.data_validade);
    addKeyValue('Orgao emissor', fields.orgao_emissor);
    addKeyValue('UF', fields.uf);
    addKeyValue('CEP', fields.cep);
    addKeyValue('Endereco', fields.endereco);
    addKeyValue('Processado em', formatDateTime(latestOcr.createdAt));
  } else {
    addWrapped('OCR nao processado.');
  }

  addSection('Redes sociais');
  const social = input.proposal.person?.socialAccounts ?? [];
  if (social.length === 0) {
    addWrapped('Nenhuma rede conectada.');
  } else {
    social.forEach((account) => {
      addWrapped(`${account.provider} - conectado em ${formatDateTime(account.createdAt)}`, 10, 14);
      const profile = extractProfile(account.tokenMeta);
      const summary = summarizeProfile(profile);
      if (summary.length) {
        summary.forEach((line) => addWrapped(`  ${line}`, 10, 14));
      }
    });
  }

  addSection('Dados bancarios');
  if (input.bank) {
    const bankName = [input.bank.bankCode, input.bank.bankName].filter(Boolean).join(' - ');
    addKeyValue('Banco', bankName);
    addKeyValue('Agencia', maskDigits(input.bank.agency));
    addKeyValue('Conta', maskDigits(input.bank.account));
    addKeyValue('Tipo', input.bank.accountType);
    addKeyValue('Titular', input.bank.holderName);
    addKeyValue('Documento titular', maskDigits(input.bank.holderDocument));
    addKeyValue('PIX', maskDigits(input.bank.pixKey));
    addKeyValue('Tipo PIX', input.bank.pixKeyType);
  } else {
    addWrapped('Dados bancarios nao informados.');
  }

  addSection('Assinatura digital');
  const signature = input.proposal.signatures?.[0];
  if (signature) {
    addKeyValue('Status', signature.status);
    addKeyValue('Envelope', signature.envelopeId);
    if (signature.deadline) addKeyValue('Prazo', formatDate(signature.deadline));
    if (signature.signedAt) addKeyValue('Assinado em', formatDateTime(signature.signedAt));
    addKeyValue('IP', signature.signerIp);
    addKeyValue('Metodo', signature.signerMethod);
    addKeyValue('User-Agent', signature.signerUserAgent);
    addKeyValue('Geo', signature.signerGeo);
    addKeyValue('Hash original', signature.originalFileHash);
    addKeyValue('Hash assinado', signature.signedFileHash);
    addKeyValue('Hash certificado', signature.certificateFileHash);
  } else {
    addWrapped('Assinatura nao solicitada.');
  }

  addSection('Timeline');
  if (input.proposal.statusHistory?.length) {
    input.proposal.statusHistory.forEach((entry) => {
      const from = entry.fromStatus ?? 'inicio';
      const reason = entry.reason ? ` - ${entry.reason}` : '';
      addWrapped(
        `${formatDateTime(entry.createdAt)} - ${from} -> ${entry.toStatus}${reason}`,
        10,
        14,
      );
    });
  } else {
    addWrapped('Sem historico.');
  }

  addSection('Auditoria');
  if (input.proposal.auditLogs?.length) {
    input.proposal.auditLogs.forEach((log) => {
      addWrapped(`${formatDateTime(log.createdAt)} - ${log.action}`, 10, 14);
    });
  } else {
    addWrapped('Sem auditoria registrada.');
  }

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

const wrapText = (value: string, maxLength: number) => {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if ((current + ' ' + word).length > maxLength) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const formatDate = (value: Date) => value.toLocaleDateString('pt-BR');

const formatDateTime = (value: Date) => value.toLocaleString('pt-BR');

const maskDigits = (value?: string | null, keep = 4) => {
  if (!value) return undefined;
  const digits = value.replace(/\D+/g, '');
  if (!digits) return undefined;
  if (digits.length <= keep) return `***${digits}`;
  return `***${digits.slice(-keep)}`;
};

const formatProfileRoles = (roles: unknown, other?: string | null) => {
  const list = Array.isArray(roles) ? roles.filter(Boolean).map(String) : [];
  if (other) list.push(`Outro: ${other}`);
  return list.join(', ');
};

const extractProfile = (tokenMeta: unknown) => {
  if (!tokenMeta || typeof tokenMeta !== 'object') return null;
  const profile = (tokenMeta as Record<string, unknown>).profile;
  if (!profile || typeof profile !== 'object') return null;
  return profile as Record<string, unknown>;
};

const summarizeProfile = (profile: Record<string, unknown> | null) => {
  if (!profile) return [];
  const keys = ['name', 'username', 'title', 'followers', 'subscribers', 'views', 'videos'];
  return keys.filter((key) => key in profile).map((key) => `${key}: ${String(profile[key] ?? '')}`);
};

const extractSignerLink = (response: any) => {
  return (
    response?.data?.attributes?.signature_url ??
    response?.data?.attributes?.sign_url ??
    response?.data?.attributes?.url ??
    response?.data?.links?.self
  );
};
