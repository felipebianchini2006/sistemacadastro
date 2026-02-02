export type PdfJobPayload = {
  proposalId: string;
  protocol: string;
  candidate: {
    name: string;
    email: string;
    phone?: string;
  };
  requestId: string;
};

export type DossierJobPayload = {
  proposalId: string;
  protocol: string;
  requestId: string;
};

export type SignatureJobPayload = {
  proposalId: string;
  protocol: string;
  documentFileId: string;
  candidate: {
    name: string;
    email: string;
    phone?: string;
  };
  requestId: string;
};

export type SignatureCancelJobPayload = {
  proposalId: string;
  envelopeId: string;
  requestId: string;
};

export type SignatureAuditJobPayload = {
  proposalId: string;
  envelopeId: string;
  requestId: string;
};
