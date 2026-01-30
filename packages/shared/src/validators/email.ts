const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const isValidEmailFormat = (value: string) => EMAIL_REGEX.test(value.trim());

export const getEmailDomain = (value: string) => {
  const normalized = normalizeEmail(value);
  const [, domain] = normalized.split('@');
  return domain ?? '';
};
