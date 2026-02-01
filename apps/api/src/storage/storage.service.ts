import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type PresignPutObjectInput = {
  key: string;
  contentType: string;
  metadata?: Record<string, string>;
  expiresIn?: number;
};

export type PresignPutObjectResult = {
  url: string;
  bucket: string;
  key: string;
  expiresIn: number;
};

type StorageConfig = {
  bucket: string;
  endpoint?: string;
  region: string;
  accessKey?: string;
  secretKey?: string;
  forcePathStyle: boolean;
  presignTtlSeconds: number;
};

@Injectable()
export class StorageService {
  private client?: S3Client;
  private config?: StorageConfig;

  constructor(private readonly configService: ConfigService) {}

  async presignPutObject(
    input: PresignPutObjectInput,
  ): Promise<PresignPutObjectResult> {
    const config = this.getConfig();
    const expiresIn = input.expiresIn ?? config.presignTtlSeconds;
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      ContentType: input.contentType,
      Metadata: input.metadata,
    });

    const url = await getSignedUrl(this.getClient(), command, { expiresIn });

    return {
      url,
      bucket: config.bucket,
      key: input.key,
      expiresIn,
    };
  }

  async presignGetObject(
    key: string,
    expiresIn?: number,
  ): Promise<{ url: string; expiresIn: number }> {
    const config = this.getConfig();
    const ttl = expiresIn ?? config.presignTtlSeconds;
    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });
    const url = await getSignedUrl(this.getClient(), command, {
      expiresIn: ttl,
    });
    return { url, expiresIn: ttl };
  }

  async uploadObject(input: {
    key: string;
    contentType: string;
    body: Buffer;
    metadata?: Record<string, string>;
  }) {
    const config = this.getConfig();
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata,
      }),
    );
  }

  async deleteObject(key: string) {
    const config = this.getConfig();
    await this.getClient().send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
  }

  private getClient() {
    if (!this.client) {
      const config = this.getConfig();
      const credentials =
        config.accessKey && config.secretKey
          ? {
              accessKeyId: config.accessKey,
              secretAccessKey: config.secretKey,
            }
          : undefined;

      this.client = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle,
        credentials,
      });
    }

    return this.client;
  }

  private getConfig(): StorageConfig {
    if (this.config) {
      return this.config;
    }

    const bucket = this.configService.get<string>('S3_BUCKET', {
      infer: true,
    });
    if (!bucket) {
      throw new Error('S3_BUCKET not set');
    }

    const endpoint = this.configService.get<string>('S3_ENDPOINT', {
      infer: true,
    });
    const region =
      this.configService.get<string>('S3_REGION', { infer: true }) ??
      'us-east-1';
    const accessKey = this.configService.get<string>('S3_ACCESS_KEY', {
      infer: true,
    });
    const secretKey = this.configService.get<string>('S3_SECRET_KEY', {
      infer: true,
    });
    const presignTtlSeconds =
      this.configService.get<number>('UPLOAD_PRESIGN_TTL_SECONDS', {
        infer: true,
      }) ?? 300;
    const forcePathStyle =
      this.configService.get<boolean>('S3_FORCE_PATH_STYLE', {
        infer: true,
      }) ?? Boolean(endpoint);

    this.config = {
      bucket,
      endpoint,
      region,
      accessKey,
      secretKey,
      forcePathStyle,
      presignTtlSeconds,
    };

    return this.config;
  }
}
