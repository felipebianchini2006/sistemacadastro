export const STORAGE_PATH_POLICY = {
  basePrefix: 'uploads',
  draftPrefix: 'uploads/{env}/drafts/{draftId}/{docType}/',
  proposalPrefix: 'uploads/{env}/proposals/{proposalId}/{docType}/',
};

export const STORAGE_LIFECYCLE_POLICY = [
  {
    prefix: 'uploads/{env}/drafts/',
    expirationDays: 7,
    note: 'Remover documentos de drafts expirados.',
  },
  {
    prefix: 'uploads/{env}/tmp/',
    expirationDays: 1,
    note: 'Limpar uploads temporarios/abortados.',
  },
];

export const STORAGE_VERSIONING_POLICY = {
  enableInProduction: true,
  note: 'Ativar versionamento no bucket em producao.',
};
