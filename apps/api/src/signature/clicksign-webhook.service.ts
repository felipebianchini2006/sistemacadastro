import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ProposalStatus, SignatureStatus } from '@prisma/client';

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
      await this.prisma.auditLog.create({
        data: {
          action: 'CLICKSIGN_WEBHOOK',
          entityType: 'SignatureEnvelope',
          entityId: envelopeId ?? 'unknown',
          metadata: {
            eventId,
            payload,
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
      await this.prisma.auditLog.create({
        data: {
          action: 'CLICKSIGN_WEBHOOK',
          entityType: 'SignatureEnvelope',
          entityId: envelopeId,
          metadata: { eventId, payload, note: 'envelope not found' },
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

    if (updates.proposalStatus && envelope.proposal) {
      await this.prisma.proposal.update({
        where: { id: envelope.proposal.id },
        data: {
          status: updates.proposalStatus,
          signedAt:
            updates.proposalStatus === ProposalStatus.SIGNED
              ? new Date()
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

    await this.prisma.auditLog.create({
      data: {
        action: 'CLICKSIGN_WEBHOOK',
        entityType: 'SignatureEnvelope',
        entityId: envelope.id,
        proposalId: envelope.proposalId,
        metadata: { eventId, eventType, payload },
      },
    });

    this.logger.log({ eventId, envelopeId, eventType }, 'clicksign.webhook');

    return { ok: true, eventId } satisfies ClicksignWebhookResult;
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

const safeEqual = (a: string, b: string) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
};
