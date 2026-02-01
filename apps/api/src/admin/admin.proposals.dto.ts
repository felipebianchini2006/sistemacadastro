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

export type UpdateProposalDto = {
  profileRoles?: string[];
  profileRoleOther?: string;
  person?: {
    fullName?: string;
    cpf?: string;
    email?: string;
    phone?: string;
    birthDate?: string;
  };
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    state?: string;
  };
};

export type AddNoteDto = {
  note: string;
};

export type SendMessageDto = {
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  subject?: string;
  message: string;
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

const profileRoleSchema = z.enum([
  'AUTOR',
  'COMPOSITOR',
  'INTERPRETE',
  'EDITORA',
  'PRODUTOR',
  'OUTRO',
]);

export const updateProposalSchema = z.object({
  profileRoles: z.array(profileRoleSchema).optional(),
  profileRoleOther: z.string().min(2).optional(),
  person: z
    .object({
      fullName: z.string().min(2).optional(),
      cpf: z.string().min(11).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(8).optional(),
      birthDate: z.string().optional(),
    })
    .optional(),
  address: z
    .object({
      cep: z.string().min(8).optional(),
      street: z.string().min(1).optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      district: z.string().min(1).optional(),
      city: z.string().min(1).optional(),
      state: z.string().min(2).optional(),
    })
    .optional(),
});

export const addNoteSchema = z.object({
  note: z.string().min(3),
});

export const sendMessageSchema = z.object({
  channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP']),
  subject: z.string().optional(),
  message: z.string().min(3),
});
