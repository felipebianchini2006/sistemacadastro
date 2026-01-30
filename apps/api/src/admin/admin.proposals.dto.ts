import { ProposalStatus, ProposalType } from '@prisma/client';

export type ProposalListSlaFilter = 'BREACHED' | 'DUE_SOON' | 'OK';

export type ListProposalsQuery = {
  status?: ProposalStatus;
  type?: ProposalType;
  sla?: ProposalListSlaFilter;
  dateFrom?: string;
  dateTo?: string;
  text?: string;
};

export type AssignProposalDto = {
  analystId: string;
};

export type RequestChangesDto = {
  missingItems: string[];
  message?: string;
};

export type RejectProposalDto = {
  reason: string;
};
