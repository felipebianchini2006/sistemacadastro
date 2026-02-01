import { createDecipheriv } from 'crypto';

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

const getMasterKey = () => {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('DATA_ENCRYPTION_KEY not set');
  }
  const buffer = Buffer.from(key, 'base64');
  if (buffer.length !== 32) {
    throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes (base64)');
  }
  return buffer;
};

export const decryptValue = (ciphertext: string) => {
  if (ciphertext.startsWith(ENVELOPE_PREFIX)) {
    return decryptEnvelope(ciphertext);
  }
  return decryptLegacy(ciphertext);
};

const decryptEnvelope = (ciphertext: string) => {
  const encoded = ciphertext.slice(ENVELOPE_PREFIX.length);
  const json = Buffer.from(encoded, 'base64').toString('utf8');
  const payload = JSON.parse(json) as EnvelopePayload;

  if (payload.ek === 'kms') {
    throw new Error('KMS envelope not supported in worker');
  }

  if (!payload.ekIv || !payload.ekTag) {
    throw new Error('Invalid envelope payload');
  }

  const masterKey = getMasterKey();
  const wrapIv = Buffer.from(payload.ekIv, 'base64');
  const wrapTag = Buffer.from(payload.ekTag, 'base64');
  const edk = Buffer.from(payload.edk, 'base64');

  const wrapDecipher = createDecipheriv('aes-256-gcm', masterKey, wrapIv);
  wrapDecipher.setAuthTag(wrapTag);
  const dataKey = Buffer.concat([wrapDecipher.update(edk), wrapDecipher.final()]);

  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ct = Buffer.from(payload.ct, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', dataKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);
  return decrypted.toString('utf8');
};

const decryptLegacy = (value: string) => {
  const masterKey = getMasterKey();
  const buffer = Buffer.from(value, 'base64');
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);

  const decipher = createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};
