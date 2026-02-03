import { createHash } from 'crypto';
import { stringSimilarity } from './ocr-parser';
import { OcrFields } from './ocr.types';

export type OcrComparison = {
  mismatch: boolean;
  reasons: string[];
  nameSimilarity: number;
  nameDivergence: number;
  nameThreshold: number;
  cpfMatches?: boolean;
};

const hashValue = (value: string) => createHash('sha256').update(value).digest('hex');

export const compareOcrWithProposal = (input: {
  fields: OcrFields;
  proposalName?: string | null;
  proposalCpfHash?: string | null;
  nameDivergenceThreshold?: number;
}): OcrComparison => {
  const reasons: string[] = [];
  const nameSimilarity = stringSimilarity(input.fields.nome, input.proposalName ?? undefined);
  const divergence = 1 - nameSimilarity;
  const threshold = input.nameDivergenceThreshold ?? 0.2;

  if (input.fields.nome && input.proposalName && divergence > threshold) {
    reasons.push('nome');
  }

  let cpfMatches: boolean | undefined;
  if (input.fields.cpf && input.proposalCpfHash) {
    cpfMatches = hashValue(input.fields.cpf) === input.proposalCpfHash;
    if (!cpfMatches) {
      reasons.push('cpf');
    }
  }

  return {
    mismatch: reasons.length > 0,
    reasons,
    nameSimilarity,
    nameDivergence: divergence,
    nameThreshold: threshold,
    cpfMatches,
  };
};
