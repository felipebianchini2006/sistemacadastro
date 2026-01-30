import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { StorageService } from './storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('StorageService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('presigns put object with metadata and ttl', async () => {
    const getSignedUrlMock = getSignedUrl as jest.MockedFunction<
      typeof getSignedUrl
    >;
    getSignedUrlMock.mockResolvedValue('https://signed.example');

    const configService = new ConfigService({
      S3_BUCKET: 'sistemacadastro',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY: 'minio',
      S3_SECRET_KEY: 'minio123',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_FORCE_PATH_STYLE: true,
      UPLOAD_PRESIGN_TTL_SECONDS: 120,
    });

    const service = new StorageService(configService);
    const result = await service.presignPutObject({
      key: 'uploads/dev/drafts/123/SELFIE/test.jpg',
      contentType: 'image/jpeg',
      metadata: { docType: 'SELFIE', draftId: '123' },
    });

    expect(result.url).toBe('https://signed.example');
    expect(result.expiresIn).toBe(120);
    expect(result.bucket).toBe('sistemacadastro');
    expect(result.key).toBe('uploads/dev/drafts/123/SELFIE/test.jpg');

    const call = getSignedUrlMock.mock.calls[0];
    const command = call[1];
    expect(command.input.Bucket).toBe('sistemacadastro');
    expect(command.input.Key).toBe('uploads/dev/drafts/123/SELFIE/test.jpg');
    expect(command.input.ContentType).toBe('image/jpeg');
    expect(command.input.Metadata).toEqual({
      docType: 'SELFIE',
      draftId: '123',
    });
    expect(call[2]).toEqual({ expiresIn: 120 });
  });
});
