export type OcrDocumentType = 'RG' | 'CNH' | 'UNKNOWN';

export type OcrFields = {
  nome?: string;
  cpf?: string;
  rgCnh?: string;
  dataEmissao?: string;
  dataValidade?: string;
  orgaoEmissor?: string;
  uf?: string;
  cep?: string;
  endereco?: string;
};

export type OcrParseResult = {
  documentType: OcrDocumentType;
  fields: OcrFields;
  heuristics: {
    rgScore: number;
    cnhScore: number;
    matchedKeywords: string[];
  };
};

export type OcrJobPayload = {
  proposalId?: string;
  draftId?: string;
  documentFileId: string;
  requestId: string;
};
