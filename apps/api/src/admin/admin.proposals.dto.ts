import { ProposalStatus, ProposalType } from '@prisma/client';
import { z } from 'zod';

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

export const listProposalsQuerySchema = z.object({
  status: z.nativeEnum(ProposalStatus).optional(),
  type: z.nativeEnum(ProposalType).optional(),
  sla: z.enum(['BREACHED', 'DUE_SOON', 'OK']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  text: z.string().optional(),
});

export const assignProposalSchema = z.object({
  analystId: z.string().uuid(),
});

export const requestChangesSchema = z.object({
  missingItems: z.array(z.string().min(1)).min(1),
  message: z.string().optional(),
});

export const rejectProposalSchema = z.object({
  reason: z.string().min(3),
});
