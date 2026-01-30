import { z } from 'zod';
import { ProposalType } from '@prisma/client';
import {
  getEmailDomain,
  isValidCep,
  isValidCpf,
  isValidEmailFormat,
  isValidPhone,
  normalizeCep,
  normalizeCpf,
  normalizeEmail,
  normalizePhone,
  normalizePhoneToE164,
} from '@sistemacadastro/shared';
import { resolveMx } from 'node:dns/promises';

const addressSchema = z.object({
  cep: z.string().min(1),
  street: z.string().min(1),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2),
});

export const draftDataSchema = z
  .object({
    fullName: z.string().min(2).optional(),
    cpf: z.string().min(11).optional(),
    email: z.string().min(5).optional(),
    phone: z.string().min(8).optional(),
    birthDate: z.string().optional(),
    type: z.nativeEnum(ProposalType).optional(),
    address: addressSchema.optional(),
    consent: z
      .object({
        accepted: z.boolean().optional(),
        version: z.string().optional(),
        at: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export type DraftData = z.infer<typeof draftDataSchema>;

export const normalizeDraftData = (data: DraftData) => {
  const normalized: DraftData = { ...data };

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

  if (required) {
    const missing: string[] = [];
    if (!normalized.fullName) missing.push('fullName');
    if (!normalized.cpf) missing.push('cpf');
    if (!normalized.email) missing.push('email');
    if (!normalized.phone) missing.push('phone');
    if (!normalized.birthDate) missing.push('birthDate');
    if (!normalized.address?.cep) missing.push('address.cep');
    if (!normalized.address?.street) missing.push('address.street');
    if (!normalized.address?.district) missing.push('address.district');
    if (!normalized.address?.city) missing.push('address.city');
    if (!normalized.address?.state) missing.push('address.state');
    if (!normalized.consent?.accepted) missing.push('consent.accepted');

    if (missing.length > 0) {
      throw new Error(`Campos obrigatorios: ${missing.join(', ')}`);
    }
  }

  return normalized;
};
