import { useMemo } from 'react';
import {
  formatCep,
  isValidCep,
  isValidCpf,
  isValidEmailFormat,
  normalizeCep,
  normalizeCpf,
  normalizeEmail,
  normalizePhone,
  normalizePhoneToE164,
} from '@sistemacadastro/shared';

export type ValidationStatus = 'idle' | 'valid' | 'invalid';

const resolveStatus = (value: string, valid: boolean): ValidationStatus => {
  if (!value) return 'idle';
  return valid ? 'valid' : 'invalid';
};

export const useCpfValidation = (value: string) =>
  useMemo(() => {
    const normalized = normalizeCpf(value);
    const valid = normalized.length > 0 && isValidCpf(normalized);

    return {
      normalized,
      isValid: valid,
      status: resolveStatus(normalized, valid),
    };
  }, [value]);

export const useEmailValidation = (value: string) =>
  useMemo(() => {
    const normalized = normalizeEmail(value);
    const valid = normalized.length > 0 && isValidEmailFormat(normalized);

    return {
      normalized,
      isValid: valid,
      status: resolveStatus(normalized, valid),
    };
  }, [value]);

export const usePhoneValidation = (value: string) =>
  useMemo(() => {
    const normalized = normalizePhone(value);
    const phone = normalizePhoneToE164(value);
    const valid = normalized.length > 0 && phone.valid;

    return {
      normalized,
      e164: phone.e164,
      ddd: phone.ddd,
      isValid: valid,
      status: resolveStatus(normalized, valid),
    };
  }, [value]);

export const useCepValidation = (value: string) =>
  useMemo(() => {
    const normalized = normalizeCep(value);
    const masked = formatCep(value);
    const valid = normalized.length > 0 && isValidCep(normalized);

    return {
      normalized,
      masked,
      isValid: valid,
      status: resolveStatus(normalized, valid),
    };
  }, [value]);
