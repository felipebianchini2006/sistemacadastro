import { Body, Controller, Headers, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

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
}
