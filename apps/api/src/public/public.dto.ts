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
