import { z } from 'zod';
import { ProposalType } from '@prisma/client';

const digitsOnly = (value: string) => value.replace(/\D/g, '');

export const isValidCpf = (value: string) => {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(cpf[i]) * (10 - i);
  }
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(cpf[i]) * (11 - i);
  }
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(cpf[10]);
};

export const isValidPhone = (value: string) => {
  const phone = digitsOnly(value);
  return phone.length === 10 || phone.length === 11;
};

export const isValidCep = (value: string) => {
  const cep = digitsOnly(value);
  return cep.length === 8;
};

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
    email: z.string().email().optional(),
    phone: z.string().min(8).optional(),
    birthDate: z.string().optional(),
    type: z.nativeEnum(ProposalType).optional(),
    address: addressSchema.optional(),
  })
  .strict();

export type DraftData = z.infer<typeof draftDataSchema>;

export const normalizeDraftData = (data: DraftData) => {
  const normalized: DraftData = { ...data };

  if (normalized.cpf) normalized.cpf = digitsOnly(normalized.cpf);
  if (normalized.phone) normalized.phone = digitsOnly(normalized.phone);
  if (normalized.address?.cep) {
    normalized.address = {
      ...normalized.address,
      cep: digitsOnly(normalized.address.cep),
    };
  }

  return normalized;
};

export const validateDraftData = (payload: unknown, required = false) => {
  const parsed = draftDataSchema.parse(payload);
  const normalized = normalizeDraftData(parsed);

  if (normalized.cpf && !isValidCpf(normalized.cpf)) {
    throw new Error('CPF invalido');
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

    if (missing.length > 0) {
      throw new Error(`Campos obrigatorios: ${missing.join(', ')}`);
    }
  }

  return normalized;
};
