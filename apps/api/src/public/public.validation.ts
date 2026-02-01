import { z } from 'zod';
import { ProposalType } from '@prisma/client';
import {
  getEmailDomain,
  isValidEmailFormat,
  normalizeEmail,
} from '@sistemacadastro/shared/dist/validators/email.js';
import {
  isValidCep,
  normalizeCep,
} from '@sistemacadastro/shared/dist/validators/cep.js';
import {
  isValidCpf,
  normalizeCpf,
} from '@sistemacadastro/shared/dist/validators/cpf.js';
import {
  isValidPhone,
  normalizePhone,
  normalizePhoneToE164,
} from '@sistemacadastro/shared/dist/validators/phone.js';
import { resolveMx } from 'node:dns/promises';

const addressSchema = z
  .object({
    cep: z.string().min(1),
    street: z.string().min(1),
    number: z.string().optional(),
    complement: z.string().optional(),
    district: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(2),
  })
  .partial();

const bankSchema = z
  .object({
    bankCode: z.string().optional(),
    bankName: z.string().optional(),
    agency: z.string().optional(),
    account: z.string().optional(),
    accountType: z.enum(['CC', 'CP']).optional(),
    holderName: z.string().optional(),
    holderDocument: z.string().optional(),
    pixKey: z.string().optional(),
    pixKeyType: z.string().optional(),
  })
  .partial();

const profileRoleSchema = z.enum([
  'AUTOR',
  'COMPOSITOR',
  'INTERPRETE',
  'EDITORA',
  'PRODUTOR',
  'OUTRO',
]);

const hasFullNameParts = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean).length >= 2;

export const draftDataSchema = z
  .object({
    profileRoles: z.array(profileRoleSchema).optional(),
    profileRoleOther: z.string().min(2).optional(),
    fullName: z.string().min(2).optional(),
    cpf: z.string().min(11).optional(),
    email: z.string().min(5).optional(),
    phone: z.string().min(8).optional(),
    birthDate: z.string().optional(),
    type: z.nativeEnum(ProposalType).optional(),
    documentChoice: z.enum(['RG', 'CNH']).optional(),
    migrationEntity: z.string().min(2).optional(),
    migrationConfirmed: z.boolean().optional(),
    address: addressSchema.optional(),
    bank: bankSchema.optional(),
    consent: z
      .object({
        accepted: z.boolean().optional(),
        version: z.string().optional(),
        at: z.string().optional(),
        privacyAccepted: z.boolean().optional(),
        privacyVersion: z.string().optional(),
        privacyAt: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export type DraftData = z.infer<typeof draftDataSchema>;

const otpSendSchema = z.object({
  protocol: z.string().min(4),
  phone: z.string().min(8),
  channel: z.enum(['sms', 'whatsapp']).optional(),
});

const otpVerifySchema = z.object({
  protocol: z.string().min(4),
  phone: z.string().min(8),
  code: z.string().min(4),
});

const deleteProposalSchema = z.object({
  protocol: z.string().min(4),
  token: z.string().min(6),
});

export const normalizeDraftData = (data: DraftData) => {
  const normalized: DraftData = { ...data };

  if (normalized.profileRoleOther) {
    normalized.profileRoleOther = normalized.profileRoleOther.trim();
  }
  if (normalized.migrationEntity) {
    normalized.migrationEntity = normalized.migrationEntity.trim();
  }
  if (normalized.cpf) normalized.cpf = normalizeCpf(normalized.cpf);
  if (normalized.email) normalized.email = normalizeEmail(normalized.email);
  if (normalized.phone) {
    const phone = normalizePhoneToE164(normalized.phone);
    normalized.phone = phone.e164 ?? normalizePhone(normalized.phone);
  }
  if (normalized.address?.cep) {
    normalized.address = {
      ...normalized.address,
      cep: normalizeCep(normalized.address.cep),
    };
  }
  if (normalized.bank) {
    normalized.bank = {
      ...normalized.bank,
      bankCode: normalized.bank.bankCode?.trim(),
      bankName: normalized.bank.bankName?.trim(),
      agency: normalized.bank.agency?.trim(),
      account: normalized.bank.account?.trim(),
      holderName: normalized.bank.holderName?.trim(),
      holderDocument: normalized.bank.holderDocument?.trim(),
      pixKey: normalized.bank.pixKey?.trim(),
      pixKeyType: normalized.bank.pixKeyType?.trim(),
    };
  }

  return normalized;
};

export const validateEmailMx = async (email: string) => {
  const domain = getEmailDomain(email);
  if (!domain) return false;

  try {
    const records = await resolveMx(domain);
    return records.length > 0;
  } catch (error) {
    return false;
  }
};

export const validateDraftData = (payload: unknown, required = false) => {
  const parsed = draftDataSchema.parse(payload);
  const normalized = normalizeDraftData(parsed);

  if (
    required &&
    normalized.fullName &&
    !hasFullNameParts(normalized.fullName)
  ) {
    throw new Error('Nome completo invalido');
  }

  if (normalized.cpf && !isValidCpf(normalized.cpf)) {
    throw new Error('CPF invalido');
  }

  if (normalized.email && !isValidEmailFormat(normalized.email)) {
    throw new Error('Email invalido');
  }

  if (normalized.phone && !isValidPhone(normalized.phone)) {
    throw new Error('Telefone invalido');
  }

  if (normalized.address?.cep && !isValidCep(normalized.address.cep)) {
    throw new Error('CEP invalido');
  }

  if (normalized.birthDate) {
    const birth = new Date(normalized.birthDate);
    if (Number.isNaN(birth.getTime())) {
      throw new Error('Data de nascimento invalida');
    }
    const now = new Date();
    const age = now.getFullYear() - birth.getFullYear();
    const hasBirthdayPassed =
      now.getMonth() > birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
    const finalAge = hasBirthdayPassed ? age : age - 1;
    if (finalAge < 18) {
      throw new Error('Idade minima de 18 anos');
    }
  }

  if (normalized.profileRoles && normalized.profileRoles.length === 0) {
    throw new Error('Perfil artistico obrigatorio');
  }

  if (normalized.bank) {
    const hasAny = Object.values(normalized.bank).some((value) => value);
    if (hasAny) {
      if (!normalized.bank.account) {
        throw new Error('Conta bancaria obrigatoria');
      }
      if (!normalized.bank.accountType) {
        throw new Error('Tipo de conta obrigatorio');
      }
      if (normalized.bank.pixKey && !normalized.bank.pixKeyType) {
        throw new Error('Tipo de chave PIX obrigatorio');
      }
    }
  }

  if (required) {
    const missing: string[] = [];
    if (!normalized.profileRoles || normalized.profileRoles.length === 0) {
      missing.push('profileRoles');
    }
    if (
      normalized.profileRoles?.includes('OUTRO') &&
      !normalized.profileRoleOther
    ) {
      missing.push('profileRoleOther');
    }
    if (!normalized.fullName) missing.push('fullName');
    if (!normalized.cpf) missing.push('cpf');
    if (!normalized.email) missing.push('email');
    if (!normalized.phone) missing.push('phone');
    if (!normalized.birthDate) missing.push('birthDate');
    if (!normalized.documentChoice) missing.push('documentChoice');
    if (normalized.type === ProposalType.MIGRACAO) {
      if (!normalized.migrationEntity) missing.push('migrationEntity');
      if (!normalized.migrationConfirmed) missing.push('migrationConfirmed');
    }
    if (!normalized.address?.cep) missing.push('address.cep');
    if (!normalized.address?.street) missing.push('address.street');
    if (!normalized.address?.district) missing.push('address.district');
    if (!normalized.address?.city) missing.push('address.city');
    if (!normalized.address?.state) missing.push('address.state');
    if (!normalized.consent?.accepted) missing.push('consent.accepted');
    if (!normalized.consent?.privacyAccepted) {
      missing.push('consent.privacyAccepted');
    }

    if (missing.length > 0) {
      throw new Error(`Campos obrigatorios: ${missing.join(', ')}`);
    }
  }

  return normalized;
};

export const validateOtpSend = (payload: unknown) => {
  const parsed = otpSendSchema.parse(payload);
  const phone = normalizePhoneToE164(parsed.phone);
  const normalized = phone.e164 ?? normalizePhone(parsed.phone);

  if (!isValidPhone(normalized)) {
    throw new Error('Telefone invalido');
  }

  return {
    protocol: parsed.protocol.trim(),
    phone: normalized,
    channel: parsed.channel ?? 'sms',
  };
};

export const validateOtpVerify = (payload: unknown) => {
  const parsed = otpVerifySchema.parse(payload);
  const phone = normalizePhoneToE164(parsed.phone);
  const normalized = phone.e164 ?? normalizePhone(parsed.phone);

  if (!isValidPhone(normalized)) {
    throw new Error('Telefone invalido');
  }

  return {
    protocol: parsed.protocol.trim(),
    phone: normalized,
    code: parsed.code.trim(),
  };
};

export const validateDeleteProposal = (payload: unknown) => {
  const parsed = deleteProposalSchema.parse(payload);
  return {
    protocol: parsed.protocol.trim(),
    token: parsed.token.trim(),
  };
};
