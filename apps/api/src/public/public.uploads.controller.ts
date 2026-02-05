import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { PublicUploadsService } from './public.uploads.service';
import type { UploadPresignDto } from './public.dto';

@Controller('public/uploads')
export class PublicUploadsController {
  constructor(private readonly uploadsService: PublicUploadsService) {}

  @Post('presign')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  createPresign(
    @Body() body: UploadPresignDto,
    @Headers('x-draft-token') draftToken?: string,
    @Headers('x-proposal-token') proposalToken?: string,
  ) {
    return this.uploadsService.createPresign(body ?? {}, {
      draftToken,
      proposalToken,
    });
  }

  @Post('direct')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadDirect(
    @UploadedFile()
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
    @Body() body: Record<string, string>,
    @Headers('x-draft-token') draftToken?: string,
    @Headers('x-proposal-token') proposalToken?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo ausente');
    }

    const toNumber = (value?: string) => {
      if (!value) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const payload: UploadPresignDto = {
      draftId: body?.draftId,
      draftToken: body?.draftToken,
      proposalId: body?.proposalId,
      proposalToken: body?.proposalToken,
      docType: body?.docType as UploadPresignDto['docType'],
      fileName: file.originalname,
      contentType: file.mimetype,
      size: file.size,
      imageWidth: toNumber(body?.imageWidth),
      imageHeight: toNumber(body?.imageHeight),
      checksum: body?.checksum,
    };

    return this.uploadsService.uploadDirect(payload, file, {
      draftToken,
      proposalToken,
    });
  }
}
