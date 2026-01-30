const digitsOnly = (value: string) => value.replace(/\D+/g, '');

export const normalizeCep = (value: string) => digitsOnly(value);

export const isValidCep = (value: string) => {
  const cep = normalizeCep(value);
  if (cep.length !== 8) return false;
  if (/^([0-9])\1+$/.test(cep)) return false;
  return true;
};

export const formatCep = (value: string) => {
  const cep = normalizeCep(value);
  if (cep.length <= 5) return cep;
  return `${cep.slice(0, 5)}-${cep.slice(5, 8)}`;
};
