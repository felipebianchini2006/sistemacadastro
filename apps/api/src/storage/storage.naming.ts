import { randomUUID } from 'crypto';
import path from 'path';
import type { DocumentType } from '@prisma/client';

export type DocumentOwner =
  | {
      kind: 'draft';
      id: string;
    }
  | {
      kind: 'proposal';
      id: string;
    };

const SAFE_FILE_REGEX = /[^a-zA-Z0-9.\-_]/g;

export const sanitizeFileName = (fileName: string) => {
  const base = fileName.split(/[\\/]/).pop() ?? 'document';
  return base.replace(SAFE_FILE_REGEX, '_');
};

export const getExtensionForContentType = (contentType: string) => {
  switch (contentType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
};

export const buildDocumentStorageKey = ({
  env,
  owner,
  docType,
  fileName,
  contentType,
}: {
  env: string;
  owner: DocumentOwner;
  docType: DocumentType;
  fileName: string;
  contentType: string;
}) => {
  const safeName = sanitizeFileName(fileName);
  const stem = path.basename(safeName, path.extname(safeName)) || 'document';
  const extension = getExtensionForContentType(contentType);
  const objectName = `${stem}-${randomUUID()}.${extension}`;
  const ownerPrefix =
    owner.kind === 'draft' ? `drafts/${owner.id}` : `proposals/${owner.id}`;

  return `uploads/${env}/${ownerPrefix}/${docType}/${objectName}`;
};
