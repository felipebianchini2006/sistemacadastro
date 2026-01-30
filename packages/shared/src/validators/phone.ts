const digitsOnly = (value: string) => value.replace(/\D+/g, '');

export type PhoneNormalization = {
  e164?: string;
  national?: string;
  ddd?: string;
  valid: boolean;
  reason?: 'length' | 'ddd';
};

const VALID_DDDS = new Set([
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '21',
  '22',
  '24',
  '27',
  '28',
  '31',
  '32',
  '33',
  '34',
  '35',
  '37',
  '38',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
  '47',
  '48',
  '49',
  '51',
  '53',
  '54',
  '55',
  '61',
  '62',
  '64',
  '63',
  '65',
  '66',
  '67',
  '68',
  '69',
  '71',
  '73',
  '74',
  '75',
  '77',
  '79',
  '81',
  '82',
  '83',
  '84',
  '85',
  '88',
  '86',
  '89',
  '91',
  '92',
  '93',
  '94',
  '95',
  '96',
  '97',
  '98',
  '99',
]);

export const normalizePhone = (value: string) => digitsOnly(value);

export const isValidDdd = (ddd: string) => VALID_DDDS.has(ddd);

export const normalizePhoneToE164 = (value: string): PhoneNormalization => {
  let digits = normalizePhone(value);

  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  if (digits.length !== 10 && digits.length !== 11) {
    return { valid: false, reason: 'length', national: digits };
  }

  const ddd = digits.slice(0, 2);
  if (!isValidDdd(ddd)) {
    return { valid: false, reason: 'ddd', national: digits, ddd };
  }

  return {
    valid: true,
    national: digits,
    ddd,
    e164: `+55${digits}`,
  };
};

export const isValidPhone = (value: string) => normalizePhoneToE164(value).valid;
