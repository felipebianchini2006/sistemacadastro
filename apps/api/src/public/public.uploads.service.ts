import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProposalStatus } from '@prisma/client';
import { createHash } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildDocumentStorageKey } from '../storage/storage.naming';
import {
  ALLOWED_MIME_TYPES,
  ALLOWED_PUBLIC_DOC_TYPES,
  IMAGE_MIME_TYPES,
  UploadPresignPayload,
  uploadPresignSchema,
} from './public.uploads.validation';
import type { UploadPresignDto } from './public.dto';

type UploadTokens = {
  draftToken?: string;
  proposalToken?: string;
};

@Injectable()
export class PublicUploadsService {
  private readonly maxSizeBytes: number;
  private readonly minWidth: number;
  private readonly minHeight: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly configService: ConfigService,
    private readonly notifications: NotificationsService,
  ) {
    const maxSizeMb =
      this.configService.get<number>('UPLOAD_MAX_SIZE_MB', {
        infer: true,
      }) ?? 10;
    this.maxSizeBytes = maxSizeMb * 1024 * 1024;
    this.minWidth =
      this.configService.get<number>('UPLOAD_MIN_WIDTH', {
        infer: true,
      }) ?? 600;
    this.minHeight =
      this.configService.get<number>('UPLOAD_MIN_HEIGHT', {
        infer: true,
      }) ?? 600;
  }

  async createPresign(dto: UploadPresignDto, tokens: UploadTokens) {
    const payload = this.validatePayload(dto, tokens);

    const owner = await this.resolveOwner(payload);
    const storageKey = this.buildStorageKey(owner, payload);
    const document = await this.createDocument(owner, payload, storageKey);

    const presign = await this.storage.presignPutObject({
      key: storageKey,
      contentType: payload.contentType,
    });

    return {
      documentId: document.id,
      storageKey,
      uploadUrl: presign.url,
      expiresIn: presign.expiresIn,
      method: 'PUT',
      headers: {
        'Content-Type': payload.contentType,
      },
    };
  }

  async uploadDirect(
    dto: UploadPresignDto,
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
    tokens: UploadTokens,
  ) {
    const payload = this.validatePayload(
      {
        ...dto,
        fileName: file.originalname,
        contentType: file.mimetype,
        size: file.size,
      },
      tokens,
    );

    const owner = await this.resolveOwner(payload);
    const storageKey = this.buildStorageKey(owner, payload);
    const document = await this.createDocument(owner, payload, storageKey);

    await this.storage.uploadObject({
      key: storageKey,
      contentType: payload.contentType,
      body: file.buffer,
      metadata: payload.checksum ? { checksum: payload.checksum } : undefined,
    });

    return {
      documentId: document.id,
      storageKey,
    };
  }

  private validatePayload(dto: UploadPresignDto, tokens: UploadTokens) {
    let payload: UploadPresignPayload;
    try {
      payload = uploadPresignSchema.parse(dto);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Payload invalido';
      throw new BadRequestException(message);
    }

    const draftToken = payload.draftToken ?? tokens.draftToken;
    const proposalToken = payload.proposalToken ?? tokens.proposalToken;
    const contentType = payload.contentType.toLowerCase();
    const fileName = payload.fileName.trim();

    if (!fileName) {
      throw new BadRequestException('Nome do arquivo invalido');
    }

    if (
      (payload.draftId && payload.proposalId) ||
      (!payload.draftId && !payload.proposalId)
    ) {
      throw new BadRequestException('Informe draftId ou proposalId');
    }

    if (payload.draftId && !draftToken) {
      throw new UnauthorizedException('Draft token ausente');
    }

    if (payload.proposalId && !proposalToken) {
      throw new UnauthorizedException('Proposal token ausente');
    }

    if (!ALLOWED_PUBLIC_DOC_TYPES.has(payload.docType)) {
      throw new BadRequestException('Tipo de documento nao permitido');
    }

    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      throw new BadRequestException('Tipo de arquivo nao permitido');
    }

    if (payload.size > this.maxSizeBytes) {
      throw new BadRequestException('Arquivo excede o tamanho maximo');
    }

    if (IMAGE_MIME_TYPES.has(contentType)) {
      if (!payload.imageWidth || !payload.imageHeight) {
        throw new BadRequestException('Resolucao da imagem obrigatoria');
      }
      if (
        payload.imageWidth < this.minWidth ||
        payload.imageHeight < this.minHeight
      ) {
        throw new BadRequestException('Resolucao da imagem insuficiente');
      }
    }

    return {
      ...payload,
      contentType,
      fileName,
      draftToken,
      proposalToken,
    };
  }

  private async resolveOwner(payload: UploadPresignPayload) {
    if (payload.draftId) {
      const draftToken = payload.draftToken!;
      const draft = await this.prisma.draft.findUnique({
        where: { id: payload.draftId },
      });

      if (!draft) {
        throw new NotFoundException('Draft nao encontrado');
      }
      if (draft.expiresAt < new Date()) {
        throw new UnauthorizedException('Draft expirado');
      }
      if (draft.tokenHash !== this.hashToken(draftToken)) {
        throw new UnauthorizedException('Token invalido');
      }

      return { kind: 'draft' as const, id: draft.id };
    }

    const proposal = await this.prisma.proposal.findUnique({
      where: { id: payload.proposalId! },
      select: { id: true, publicToken: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposta nao encontrada');
    }

    if (proposal.publicToken !== payload.proposalToken) {
      throw new UnauthorizedException('Token invalido');
    }

    return { kind: 'proposal' as const, id: proposal.id };
  }

  private buildStorageKey(
    owner: { kind: 'draft' | 'proposal'; id: string },
    payload: UploadPresignPayload,
  ) {
    const env =
      this.configService.get<string>('NODE_ENV', { infer: true }) ??
      'development';
    return buildDocumentStorageKey({
      env,
      owner,
      docType: payload.docType,
      fileName: payload.fileName,
      contentType: payload.contentType,
    });
  }

  private async createDocument(
    owner: { kind: 'draft' | 'proposal'; id: string },
    payload: UploadPresignPayload,
    storageKey: string,
  ) {
    const document = await this.prisma.documentFile.create({
      data: {
        draftId: owner.kind === 'draft' ? owner.id : null,
        proposalId: owner.kind === 'proposal' ? owner.id : null,
        type: payload.docType,
        storageKey,
        fileName: payload.fileName,
        contentType: payload.contentType,
        size: payload.size,
        checksum: payload.checksum,
      },
    });

    if (owner.kind === 'proposal') {
      const proposal = await this.prisma.proposal.findUnique({
        where: { id: owner.id },
        select: { status: true },
      });

      if (proposal?.status === ProposalStatus.PENDING_DOCS) {
        const updated = await this.prisma.proposal.update({
          where: { id: owner.id },
          data: {
            status: ProposalStatus.UNDER_REVIEW,
            statusHistory: {
              create: {
                fromStatus: ProposalStatus.PENDING_DOCS,
                toStatus: ProposalStatus.UNDER_REVIEW,
                reason: 'Documentos complementares enviados pelo candidato',
              },
            },
          },
          include: { person: true },
        });

        if (updated.person) {
          const name = updated.person.fullName;
          await this.notifications.notifyInternalDocsReceived({
            proposalId: updated.id,
            protocol: updated.protocol,
            name,
          });
        }
      }
    }

    return document;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
