import type { DocumentType } from '@prisma/client';

export interface DraftResponse {
  draftId: string;
  draftToken: string;
  expiresAt: string;
}

export interface DraftDataPayload {
  fullName?: string;
  cpf?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  type?: 'NOVO' | 'MIGRACAO';
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    state?: string;
  };
  consent?: {
    accepted?: boolean;
    version?: string;
    at?: string;
  };
}

export interface CreateDraftDto {
  data?: DraftDataPayload;
}

export interface UpdateDraftDto {
  draftToken?: string;
  data: DraftDataPayload;
}

export interface SubmitProposalDto {
  draftId: string;
  draftToken: string;
}

export interface UploadPresignDto {
  draftId?: string;
  draftToken?: string;
  proposalId?: string;
  proposalToken?: string;
  docType: DocumentType;
  fileName: string;
  contentType: string;
  size: number;
  imageWidth?: number;
  imageHeight?: number;
  checksum?: string;
}

export interface UploadPresignResponse {
  documentId: string;
  storageKey: string;
  uploadUrl: string;
  expiresIn: number;
  method: 'PUT';
  headers: Record<string, string>;
}
