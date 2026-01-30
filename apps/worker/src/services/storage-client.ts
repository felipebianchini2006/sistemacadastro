import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export type StorageConfig = {
  bucket: string;
  endpoint?: string;
  region: string;
  accessKey?: string;
  secretKey?: string;
  forcePathStyle: boolean;
};

export class StorageClient {
  private readonly client: S3Client;
  private readonly config: StorageConfig;

  constructor() {
    this.config = this.resolveConfig();
    const credentials =
      this.config.accessKey && this.config.secretKey
        ? {
            accessKeyId: this.config.accessKey,
            secretAccessKey: this.config.secretKey,
          }
        : undefined;

    this.client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      forcePathStyle: this.config.forcePathStyle,
      credentials,
    });
  }

  async download(key: string) {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error('S3 response body is empty');
    }

    const buffer = await streamToBuffer(response.Body as AsyncIterable<Buffer>);
    return buffer;
  }

  async upload(input: { key: string; buffer: Buffer; contentType: string }) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.key,
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );
  }

  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );
  }

  private resolveConfig(): StorageConfig {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      throw new Error('S3_BUCKET not set');
    }

    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION ?? 'us-east-1';
    const accessKey = process.env.S3_ACCESS_KEY;
    const secretKey = process.env.S3_SECRET_KEY;
    const forcePathStyle =
      process.env.S3_FORCE_PATH_STYLE?.toLowerCase() === 'true' || Boolean(endpoint);

    return {
      bucket,
      endpoint,
      region,
      accessKey,
      secretKey,
      forcePathStyle,
    };
  }
}

const streamToBuffer = async (stream: AsyncIterable<Buffer>) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};
