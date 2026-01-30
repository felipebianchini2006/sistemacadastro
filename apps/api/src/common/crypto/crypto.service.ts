import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

type EnvelopePayload = {
  v: 1;
  alg: 'AES-256-GCM';
  ek: 'local' | 'kms';
  iv: string;
  tag: string;
  ct: string;
  edk: string;
  ekIv?: string;
  ekTag?: string;
  kid?: string;
};

const ENVELOPE_PREFIX = 'enc:v1:';

@Injectable()
export class CryptoService {
  private readonly masterKey: Buffer;
  private readonly kmsClient?: KMSClient;
  private readonly kmsKeyId?: string;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('DATA_ENCRYPTION_KEY', {
      infer: true,
    });
    if (!key) {
      throw new Error('DATA_ENCRYPTION_KEY not set');
    }

    const buffer = Buffer.from(key, 'base64');
    if (buffer.length !== 32) {
      throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes (base64)');
    }

    this.masterKey = buffer;

    const kmsKeyId = this.configService.get<string>('KMS_KEY_ID', {
      infer: true,
    });
    const kmsRegion = this.configService.get<string>('KMS_REGION', {
      infer: true,
    });
    const kmsEndpoint = this.configService.get<string>('KMS_ENDPOINT', {
      infer: true,
    });

    if (kmsKeyId) {
      this.kmsKeyId = kmsKeyId;
      this.kmsClient = new KMSClient({
        region: kmsRegion ?? 'us-east-1',
        endpoint: kmsEndpoint,
      });
    }
  }

  async encrypt(plaintext: string) {
    const dataKey = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', dataKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    if (this.kmsClient && this.kmsKeyId) {
      const command = new EncryptCommand({
        KeyId: this.kmsKeyId,
        Plaintext: dataKey,
      });
      const response = await this.kmsClient.send(command);
      if (!response.CiphertextBlob) {
        throw new Error('KMS encrypt failed');
      }
      const payload: EnvelopePayload = {
        v: 1,
        alg: 'AES-256-GCM',
        ek: 'kms',
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        ct: encrypted.toString('base64'),
        edk: Buffer.from(response.CiphertextBlob).toString('base64'),
        kid: this.kmsKeyId,
      };
      return `${ENVELOPE_PREFIX}${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')}`;
    }

    const wrapIv = randomBytes(12);
    const wrapCipher = createCipheriv('aes-256-gcm', this.masterKey, wrapIv);
    const wrapped = Buffer.concat([
      wrapCipher.update(dataKey),
      wrapCipher.final(),
    ]);
    const wrapTag = wrapCipher.getAuthTag();

    const payload: EnvelopePayload = {
      v: 1,
      alg: 'AES-256-GCM',
      ek: 'local',
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ct: encrypted.toString('base64'),
      edk: wrapped.toString('base64'),
      ekIv: wrapIv.toString('base64'),
      ekTag: wrapTag.toString('base64'),
    };

    return `${ENVELOPE_PREFIX}${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')}`;
  }

  async decrypt(ciphertext: string) {
    if (!ciphertext.startsWith(ENVELOPE_PREFIX)) {
      return this.decryptLegacy(ciphertext);
    }

    const encoded = ciphertext.slice(ENVELOPE_PREFIX.length);
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    const payload = JSON.parse(json) as EnvelopePayload;

    const dataKey = await this.unwrapDataKey(payload);

    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const ct = Buffer.from(payload.ct, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', dataKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);
    return decrypted.toString('utf8');
  }

  private async unwrapDataKey(payload: EnvelopePayload) {
    if (payload.ek === 'kms') {
      if (!this.kmsClient) {
        throw new Error('KMS client not configured');
      }
      const command = new DecryptCommand({
        CiphertextBlob: Buffer.from(payload.edk, 'base64'),
      });
      const response = await this.kmsClient.send(command);
      if (!response.Plaintext) {
        throw new Error('KMS decrypt failed');
      }
      return Buffer.from(response.Plaintext);
    }

    if (!payload.ekIv || !payload.ekTag) {
      throw new Error('Invalid envelope payload');
    }

    const iv = Buffer.from(payload.ekIv, 'base64');
    const tag = Buffer.from(payload.ekTag, 'base64');
    const edk = Buffer.from(payload.edk, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(edk), decipher.final()]);
  }

  private decryptLegacy(value: string) {
    const buffer = Buffer.from(value, 'base64');
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);

    const decipher = createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}
