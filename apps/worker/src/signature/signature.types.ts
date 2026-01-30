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
