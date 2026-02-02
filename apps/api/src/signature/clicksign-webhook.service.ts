import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentType, ProposalStatus, SignatureStatus } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { buildDocumentStorageKey } from '../storage/storage.naming';
import { JobsService } from '../jobs/jobs.service';
import { NotificationsService } from '../notifications/notifications.service';

export type ClicksignWebhookResult = {
  ok: boolean;
  duplicated?: boolean;
  eventId: string;
};

@Injectable()
export class ClicksignWebhookService {
  private readonly logger = new Logger(ClicksignWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly storage: StorageService,
    private readonly jobs: JobsService,
    private readonly notifications: NotificationsService,
  ) {}

  verifySignature(rawBody: Buffer, signatureHeader?: string | string[]) {
    const secret = this.configService.get<string>('CLICKSIGN_WEBHOOK_SECRET', {
      infer: true,
    });
    if (!secret) {
      return true;
    }

    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;
    if (!signature) {
      return false;
    }

    const computedHex = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    const computedBase64 = createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    const normalized = signature
      .replace(/^sha256=/, '')
      .replace(/^v1=/, '')
      .trim();

    return (
      safeEqual(computedHex, normalized) ||
      safeEqual(computedBase64, normalized)
    );
  }

  async handleWebhook(payload: Record<string, unknown>, rawBody: Buffer) {
    const eventId = extractEventId(payload, rawBody);
    if (!eventId) {
      throw new BadRequestException('eventId ausente');
    }

    const exists = await this.prisma.auditLog.findFirst({
      where: {
        action: 'CLICKSIGN_WEBHOOK',
        metadata: {
          path: ['eventId'],
          equals: eventId,
        },
      },
      select: { id: true },
    });

    if (exists) {
      return {
        ok: true,
        duplicated: true,
        eventId,
      } satisfies ClicksignWebhookResult;
    }

    const envelopeId = extractEnvelopeId(payload);
    const eventType = extractEventType(payload);

    if (!envelopeId || !eventType) {
      const payloadHash = createHash('sha256').update(rawBody).digest('hex');
      await this.prisma.auditLog.create({
        data: {
          action: 'CLICKSIGN_WEBHOOK',
          entityType: 'SignatureEnvelope',
          entityId: envelopeId ?? 'unknown',
          metadata: {
            eventId,
            payloadHash,
            note: 'missing envelopeId or eventType',
          },
        },
      });

      return { ok: true, eventId } satisfies ClicksignWebhookResult;
    }

    const envelope = await this.prisma.signatureEnvelope.findFirst({
      where: { envelopeId },
      include: { proposal: true },
    });

    if (!envelope) {
      const payloadHash = createHash('sha256').update(rawBody).digest('hex');
      await this.prisma.auditLog.create({
        data: {
          action: 'CLICKSIGN_WEBHOOK',
          entityType: 'SignatureEnvelope',
          entityId: envelopeId,
          metadata: { eventId, payloadHash, note: 'envelope not found' },
        },
      });

      return { ok: true, eventId } satisfies ClicksignWebhookResult;
    }

    const updates = this.mapEventToUpdates(eventType);

    if (updates.signatureStatus) {
      await this.prisma.signatureEnvelope.update({
        where: { id: envelope.id },
        data: {
          status: updates.signatureStatus,
        },
      });
    }

    const signedAt =
      updates.signatureStatus === SignatureStatus.SIGNED
        ? (extractSignedAt(payload) ?? new Date())
        : undefined;

    if (updates.proposalStatus && envelope.proposal) {
      await this.prisma.proposal.update({
        where: { id: envelope.proposal.id },
        data: {
          status: updates.proposalStatus,
          signedAt:
            updates.proposalStatus === ProposalStatus.SIGNED
              ? (signedAt ?? new Date())
              : undefined,
          rejectedAt:
            updates.proposalStatus === ProposalStatus.REJECTED
              ? new Date()
              : undefined,
          statusHistory: {
            create: {
              fromStatus: envelope.proposal.status,
              toStatus: updates.proposalStatus,
              reason: `Clicksign: ${eventType}`,
            },
          },
        },
      });
    }

    if (updates.signatureStatus === SignatureStatus.SIGNED) {
      await this.handleSignedEnvelope(
        envelope.id,
        payload,
        signedAt ?? new Date(),
      );
      await this.jobs.enqueueSignatureAudit({
        proposalId: envelope.proposalId,
        envelopeId: envelope.envelopeId,
      });
      await this.jobs.enqueueTotvsSync({ proposalId: envelope.proposalId });

      if (envelope.proposal) {
        const person = await this.prisma.person.findUnique({
          where: { proposalId: envelope.proposalId },
          select: { fullName: true },
        });
        await this.notifications.notifyInternalCandidateSigned({
          proposalId: envelope.proposalId,
          protocol: envelope.proposal.protocol,
          name: person?.fullName ?? 'Candidato',
        });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'CLICKSIGN_WEBHOOK',
        entityType: 'SignatureEnvelope',
        entityId: envelope.id,
        proposalId: envelope.proposalId,
        metadata: { eventId, eventType },
      },
    });

    this.logger.log({ eventId, envelopeId, eventType }, 'clicksign.webhook');

    return { ok: true, eventId } satisfies ClicksignWebhookResult;
  }

  private async handleSignedEnvelope(
    envelopeId: string,
    payload: Record<string, unknown>,
    signedAt: Date,
  ) {
    const envelope = await this.prisma.signatureEnvelope.findFirst({
      where: { id: envelopeId },
      include: { proposal: true },
    });

    if (!envelope?.proposal) {
      return;
    }

    const signer = extractSignerInfo(payload);
    const signedFileUrl = extractSignedFileUrl(payload);
    const certificateUrl = extractCertificateUrl(payload);

    const env =
      this.configService.get<string>('NODE_ENV', { infer: true }) ??
      'development';
    const proposalId = envelope.proposalId;

    const updates: Record<string, unknown> = {
      signedAt,
      signerIp: signer.ip,
      signerUserAgent: signer.userAgent,
      signerMethod: signer.method,
      signerGeo: signer.geo,
    };

    if (signedFileUrl) {
      const signedFile = await this.downloadAndStoreFile({
        url: signedFileUrl,
        env,
        proposalId,
        docType: DocumentType.CONTRATO_ASSINADO,
        fileName: `contrato-assinado-${envelope.proposal.protocol}.pdf`,
      });
      updates.signedFileKey = signedFile.storageKey;
      updates.signedFileHash = signedFile.hash;
    }

    if (certificateUrl) {
      const certificate = await this.downloadAndStoreFile({
        url: certificateUrl,
        env,
        proposalId,
        docType: DocumentType.CERTIFICADO_ASSINATURA,
        fileName: `certificado-assinatura-${envelope.proposal.protocol}.pdf`,
      });
      updates.certificateFileKey = certificate.storageKey;
      updates.certificateFileHash = certificate.hash;
    }

    await this.prisma.signatureEnvelope.update({
      where: { id: envelope.id },
      data: updates,
    });
  }

  private async downloadAndStoreFile(input: {
    url: string;
    env: string;
    proposalId: string;
    docType: DocumentType;
    fileName: string;
  }) {
    const accessToken = this.configService.get<string>(
      'CLICKSIGN_ACCESS_TOKEN',
      { infer: true },
    );
    const response = await fetch(input.url, {
      headers: accessToken ? { Authorization: accessToken } : undefined,
    });

    if (!response.ok) {
      throw new Error(`Falha ao baixar arquivo Clicksign (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const hash = createHash('sha256').update(buffer).digest('hex');
    const contentType =
      response.headers.get('content-type') ?? 'application/pdf';

    const storageKey = buildDocumentStorageKey({
      env: input.env,
      owner: { kind: 'proposal', id: input.proposalId },
      docType: input.docType,
      fileName: input.fileName,
      contentType,
    });

    await this.storage.uploadObject({
      key: storageKey,
      contentType,
      body: buffer,
    });

    await this.prisma.documentFile.create({
      data: {
        proposalId: input.proposalId,
        type: input.docType,
        storageKey,
        fileName: input.fileName,
        contentType,
        size: buffer.length,
        checksum: hash,
      },
    });

    return { storageKey, hash };
  }

  private mapEventToUpdates(eventType: string) {
    const normalized = eventType.toLowerCase();

    if (
      ['close', 'document_closed', 'signed', 'completed'].includes(normalized)
    ) {
      return {
        signatureStatus: SignatureStatus.SIGNED,
        proposalStatus: ProposalStatus.SIGNED,
      };
    }

    if (['refusal', 'canceled', 'cancel', 'declined'].includes(normalized)) {
      return {
        signatureStatus: SignatureStatus.CANCELED,
        proposalStatus: ProposalStatus.REJECTED,
      };
    }

    if (['expired', 'deadline'].includes(normalized)) {
      return {
        signatureStatus: SignatureStatus.EXPIRED,
        proposalStatus: ProposalStatus.REJECTED,
      };
    }

    if (['sign', 'running'].includes(normalized)) {
      return { signatureStatus: SignatureStatus.SENT };
    }

    return {};
  }
}

const extractEventId = (payload: Record<string, unknown>, rawBody: Buffer) => {
  const direct =
    (payload.id as string | undefined) ??
    (payload.event_id as string | undefined) ??
    (payload.eventId as string | undefined);
  if (direct) return direct;

  const event = payload.event as Record<string, unknown> | undefined;
  if (event?.id) return String(event.id);

  const data = payload.data as Record<string, unknown> | undefined;
  if (data?.id) return String(data.id);

  const hash = createHash('sha256').update(rawBody).digest('hex');
  return hash;
};

const extractEventType = (payload: Record<string, unknown>) => {
  const event = payload.event as Record<string, unknown> | undefined;
  return (
    (payload.event_type as string | undefined) ??
    (payload.type as string | undefined) ??
    (event?.name as string | undefined) ??
    (event?.type as string | undefined)
  );
};

const extractEnvelopeId = (payload: Record<string, unknown>) => {
  const direct =
    (payload.envelope_id as string | undefined) ??
    (payload.envelopeId as string | undefined);
  if (direct) return direct;

  const envelope = payload.envelope as Record<string, unknown> | undefined;
  if (envelope?.id) return String(envelope.id);

  const data = payload.data as Record<string, unknown> | undefined;
  const attributes = data?.attributes as Record<string, unknown> | undefined;
  return (
    (attributes?.envelope_id as string | undefined) ??
    (attributes?.envelopeId as string | undefined)
  );
};

const extractSignedFileUrl = (payload: Record<string, unknown>) => {
  const document = payload.document as Record<string, unknown> | undefined;
  if (document?.signed_file_url) return String(document.signed_file_url);
  if (document?.signedFileUrl) return String(document.signedFileUrl);
  const data = payload.data as Record<string, unknown> | undefined;
  const attributes = data?.attributes as Record<string, unknown> | undefined;
  if (attributes?.signed_file_url) return String(attributes.signed_file_url);
  if (attributes?.signedFileUrl) return String(attributes.signedFileUrl);
  return undefined;
};

const extractCertificateUrl = (payload: Record<string, unknown>) => {
  const document = payload.document as Record<string, unknown> | undefined;
  if (document?.certificate_url) return String(document.certificate_url);
  if (document?.certificateUrl) return String(document.certificateUrl);
  const data = payload.data as Record<string, unknown> | undefined;
  const attributes = data?.attributes as Record<string, unknown> | undefined;
  if (attributes?.certificate_url) return String(attributes.certificate_url);
  if (attributes?.certificateUrl) return String(attributes.certificateUrl);
  return undefined;
};

const extractSignedAt = (payload: Record<string, unknown>) => {
  const direct =
    (payload.signed_at as string | undefined) ??
    (payload.signedAt as string | undefined);
  if (direct) {
    const parsed = new Date(direct);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const signer = payload.signer as Record<string, unknown> | undefined;
  const signerSignedAt =
    (signer?.signed_at as string | undefined) ??
    (signer?.signedAt as string | undefined);
  if (signerSignedAt) {
    const parsed = new Date(signerSignedAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return undefined;
};

const extractSignerInfo = (payload: Record<string, unknown>) => {
  const signer = payload.signer as Record<string, unknown> | undefined;
  const ip =
    (signer?.ip_address as string | undefined) ??
    (payload.ip_address as string | undefined) ??
    (payload.ip as string | undefined);
  const userAgent =
    (signer?.user_agent as string | undefined) ??
    (payload.user_agent as string | undefined) ??
    (payload.userAgent as string | undefined);
  const method =
    (payload.method as string | undefined) ??
    (payload.signature_method as string | undefined) ??
    (payload.auth as string | undefined);
  const geo =
    (payload.geo as string | undefined) ??
    (payload.geolocation as string | undefined) ??
    (signer?.geo as string | undefined);

  return {
    ip,
    userAgent,
    method,
    geo,
  };
};

const safeEqual = (a: string, b: string) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
};
