import { ProposalStatus, ProposalType } from '@prisma/client';
import { z } from 'zod';

export type ProposalListSlaFilter = 'BREACHED' | 'DUE_SOON' | 'OK';

export type ListProposalsSortField =
  | 'createdAt'
  | 'protocol'
  | 'status'
  | 'type'
  | 'fullName';

export type ListProposalsQuery = {
  status?: ProposalStatus | ProposalStatus[];
  type?: ProposalType;
  sla?: ProposalListSlaFilter;
  dateFrom?: string;
  dateTo?: string;
  text?: string;
  profileRoles?: string[];
  sortBy?: ListProposalsSortField;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export type AssignProposalDto = {
  analystId: string;
};

export type BulkAssignProposalDto = {
  proposalIds: string[];
  analystId: string;
};

export type BulkStatusProposalDto = {
  proposalIds: string[];
  status: ProposalStatus;
  reason?: string;
  missingItems?: string[];
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

export type UpdateOcrDto = {
  documentType?: string;
  fields?: {
    nome?: string;
    cpf?: string;
    rg_cnh?: string;
    data_emissao?: string;
    data_validade?: string;
    orgao_emissor?: string;
    uf?: string;
    cep?: string;
    endereco?: string;
  };
};

const proposalStatusValues = Object.values(ProposalStatus);

const statusFilterSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    const raw = Array.isArray(value) ? value.join(',') : value;
    const values = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .filter((entry) =>
        proposalStatusValues.includes(entry as ProposalStatus),
      );
    if (values.length === 0) return undefined;
    return values.length === 1
      ? (values[0] as ProposalStatus)
      : (values as ProposalStatus[]);
  });

const profileRolesFilterSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    const raw = Array.isArray(value) ? value.join(',') : value;
    const values = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    return values.length === 0 ? undefined : values;
  });

export const listProposalsQuerySchema = z.object({
  status: statusFilterSchema,
  type: z.nativeEnum(ProposalType).optional(),
  sla: z.enum(['BREACHED', 'DUE_SOON', 'OK']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  text: z.string().optional(),
  profileRoles: profileRolesFilterSchema,
  sortBy: z
    .enum(['createdAt', 'protocol', 'status', 'type', 'fullName'])
    .optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const assignProposalSchema = z.object({
  analystId: z.string().uuid(),
});

const proposalIdsSchema = z.array(z.string().uuid()).min(1);

export const bulkAssignProposalSchema = z.object({
  proposalIds: proposalIdsSchema,
  analystId: z.string().uuid(),
});

export const bulkStatusProposalSchema = z
  .object({
    proposalIds: proposalIdsSchema,
    status: z.nativeEnum(ProposalStatus),
    reason: z.string().min(3).optional(),
    missingItems: z.array(z.string().min(1)).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === ProposalStatus.REJECTED && !value.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Motivo obrigatorio para reprovar',
        path: ['reason'],
      });
    }
    if (
      value.status === ProposalStatus.PENDING_DOCS &&
      (!value.missingItems || value.missingItems.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe os documentos pendentes',
        path: ['missingItems'],
      });
    }
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

export const updateOcrSchema = z
  .object({
    documentType: z.string().min(1).optional(),
    fields: z
      .object({
        nome: z.string().min(1).optional(),
        cpf: z.string().min(1).optional(),
        rg_cnh: z.string().min(1).optional(),
        data_emissao: z.string().min(1).optional(),
        data_validade: z.string().min(1).optional(),
        orgao_emissor: z.string().min(1).optional(),
        uf: z.string().min(1).optional(),
        cep: z.string().min(1).optional(),
        endereco: z.string().min(1).optional(),
      })
      .partial()
      .optional(),
  })
  .strict();
