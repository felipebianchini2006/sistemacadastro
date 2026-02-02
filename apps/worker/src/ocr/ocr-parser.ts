import { OcrParseResult, OcrDocumentType, OcrFields } from './ocr.types';

const RG_KEYWORDS = ['REGISTRO GERAL', 'CARTEIRA DE IDENTIDADE', 'IDENTIDADE', 'RG'];

const CNH_KEYWORDS = ['CARTEIRA NACIONAL DE HABILITACAO', 'HABILITACAO', 'CNH', 'DETRAN'];

const NAME_LABELS = ['NOME', 'NOME COMPLETO'];
const CPF_LABELS = ['CPF'];
const RG_LABELS = ['RG', 'REGISTRO GERAL', 'IDENTIDADE'];
const CNH_LABELS = ['CNH', 'REGISTRO', 'REGISTRO NACIONAL'];
const ISSUER_LABELS = ['ORGAO EMISSOR', 'EMISSOR'];
const ISSUE_DATE_LABELS = [
  'DATA DE EXPEDICAO',
  'DATA EXPEDICAO',
  'DATA EMISSAO',
  'EXPEDICAO',
  'EMISSAO',
];
const VALID_DATE_LABELS = ['VALIDADE', 'VALIDO ATE', 'VALIDO ATE'];
const UF_LABELS = ['UF'];
const CEP_REGEX = /\b\d{5}-?\d{3}\b/;

export const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\t\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeUpper = (value: string) => normalizeText(value).toUpperCase();

const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const digitsOnly = (value: string) => value.replace(/\D+/g, '');

const normalizeDate = (value?: string) => {
  if (!value) return undefined;
  const match = value.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
};

const findLineWithLabel = (lines: string[], labels: string[]) => {
  const labelsUpper = labels.map((label) => normalizeUpper(label));
  for (let i = 0; i < lines.length; i += 1) {
    const lineUpper = normalizeUpper(lines[i]);
    if (labelsUpper.some((label) => lineUpper.includes(label))) {
      return { line: lines[i], index: i };
    }
  }
  return undefined;
};

const extractValueAfterLabel = (line: string, label: string) => {
  const index = normalizeUpper(line).indexOf(label);
  if (index < 0) return '';
  const raw = line.slice(index + label.length);
  return raw.replace(/^[:\-\s]+/, '').trim();
};

const extractName = (lines: string[]) => {
  for (let i = 0; i < lines.length; i += 1) {
    const lineUpper = normalizeUpper(lines[i]);
    if (!NAME_LABELS.some((label) => lineUpper.includes(label))) {
      continue;
    }
    if (lineUpper.includes('MAE') || lineUpper.includes('PAI')) {
      continue;
    }

    const label = NAME_LABELS.find((candidate) => lineUpper.includes(normalizeUpper(candidate)));
    if (!label) continue;

    const value = extractValueAfterLabel(lines[i], normalizeUpper(label));
    if (value && value.length > 2) {
      return value;
    }

    if (lines[i + 1]) {
      const next = lines[i + 1].trim();
      if (next.length > 2) {
        return next;
      }
    }
  }

  return undefined;
};

const extractCpf = (lines: string[], text: string) => {
  for (const line of lines) {
    const lineUpper = normalizeUpper(line);
    if (!CPF_LABELS.some((label) => lineUpper.includes(label))) {
      continue;
    }
    const cpfMatch = line.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
    if (cpfMatch) {
      const digits = digitsOnly(cpfMatch[0]);
      if (digits.length === 11) return digits;
    }
  }

  const match = text.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/);
  if (match) {
    const digits = digitsOnly(match[0]);
    if (digits.length === 11) return digits;
  }

  return undefined;
};

const extractRg = (lines: string[], text: string) => {
  for (const line of lines) {
    const upper = normalizeUpper(line);
    if (!RG_LABELS.some((label) => upper.includes(label))) continue;
    const cleaned = line.replace(/[^0-9X]/gi, '');
    if (cleaned.length >= 4) return cleaned;
  }

  const fallback = text.match(/\bRG[^0-9]*([0-9]{4,10}[0-9X]{0,2})/i);
  return fallback?.[1];
};

const extractCnh = (lines: string[], text: string) => {
  for (const line of lines) {
    const upper = normalizeUpper(line);
    if (!CNH_LABELS.some((label) => upper.includes(label))) continue;
    const cleaned = digitsOnly(line);
    if (cleaned.length >= 9) return cleaned;
  }

  const fallback = text.match(/\bREGISTRO[^0-9]*([0-9]{9,11})/i);
  return fallback?.[1];
};

const extractDateNearKeywords = (text: string, keywords: string[]) => {
  for (const keyword of keywords) {
    const pattern = new RegExp(`${keyword}[^0-9]{0,20}(\\d{2}[\\/\\-]\\d{2}[\\/\\-]\\d{4})`);
    const match = text.match(pattern);
    if (match) return normalizeDate(match[1]);
  }

  return undefined;
};

const extractIssuer = (lines: string[]) => {
  const match = findLineWithLabel(lines, ISSUER_LABELS);
  if (match) {
    const label = ISSUER_LABELS.find((candidate) =>
      normalizeUpper(match.line).includes(normalizeUpper(candidate)),
    );
    if (!label) return undefined;
    const value = extractValueAfterLabel(match.line, normalizeUpper(label));
    if (value) return value;
    if (lines[match.index + 1]) {
      return lines[match.index + 1].trim();
    }
  }

  return undefined;
};

const extractUf = (text: string, issuer?: string) => {
  if (issuer) {
    const issuerUpper = normalizeUpper(issuer);
    const slashMatch = issuerUpper.match(/\/([A-Z]{2})/);
    if (slashMatch) return slashMatch[1];
    const dashMatch = issuerUpper.match(/-([A-Z]{2})/);
    if (dashMatch) return dashMatch[1];
  }

  const ufMatch = text.match(/\bUF[^A-Z0-9]{0,5}([A-Z]{2})/);
  if (ufMatch) return ufMatch[1];

  return undefined;
};

const extractCep = (lines: string[], text: string) => {
  for (const line of lines) {
    const match = line.match(CEP_REGEX);
    if (match) {
      return digitsOnly(match[0]);
    }
  }
  const match = text.match(CEP_REGEX);
  return match ? digitsOnly(match[0]) : undefined;
};

const extractAddressLine = (lines: string[], cep?: string) => {
  if (!lines.length) return undefined;
  const cepIndex = lines.findIndex((line) => CEP_REGEX.test(line));
  if (cepIndex >= 0) {
    const before = lines[cepIndex - 1]?.trim();
    const current = lines[cepIndex]?.trim();
    const combined = [before, current].filter(Boolean).join(' ');
    return combined || current;
  }

  const keywords = ['RUA', 'AV', 'AVENIDA', 'TRAVESSA', 'ALAMEDA', 'PRACA', 'RODOVIA'];
  for (const line of lines) {
    const upper = normalizeUpper(line);
    if (keywords.some((keyword) => upper.includes(keyword))) {
      return line.trim();
    }
  }

  return undefined;
};

export const detectDocumentType = (rawText: string) => {
  const text = normalizeUpper(rawText);
  let rgScore = 0;
  let cnhScore = 0;
  const matchedKeywords: string[] = [];

  for (const keyword of RG_KEYWORDS) {
    if (text.includes(keyword)) {
      rgScore += 1;
      matchedKeywords.push(keyword);
    }
  }
  for (const keyword of CNH_KEYWORDS) {
    if (text.includes(keyword)) {
      cnhScore += 1;
      matchedKeywords.push(keyword);
    }
  }

  let type: OcrDocumentType = 'UNKNOWN';
  if (rgScore > cnhScore && rgScore > 0) type = 'RG';
  if (cnhScore > rgScore && cnhScore > 0) type = 'CNH';

  return { type, rgScore, cnhScore, matchedKeywords };
};

export const parseDocumentText = (rawText: string): OcrParseResult => {
  const lines = splitLines(rawText);
  const normalized = normalizeUpper(rawText);
  const detection = detectDocumentType(rawText);

  const fields: OcrFields = {
    nome: extractName(lines),
    cpf: extractCpf(lines, normalized),
    dataEmissao: extractDateNearKeywords(normalized, ISSUE_DATE_LABELS),
    dataValidade: extractDateNearKeywords(normalized, VALID_DATE_LABELS),
  };

  const issuer = extractIssuer(lines);
  if (issuer) {
    fields.orgaoEmissor = issuer;
  }

  const uf = extractUf(normalized, issuer);
  if (uf) {
    fields.uf = uf;
  }

  if (detection.type === 'CNH') {
    fields.rgCnh = extractCnh(lines, normalized);
  } else if (detection.type === 'RG') {
    fields.rgCnh = extractRg(lines, normalized);
  } else {
    fields.rgCnh = extractRg(lines, normalized) ?? extractCnh(lines, normalized);
  }

  return {
    documentType: detection.type,
    fields,
    heuristics: {
      rgScore: detection.rgScore,
      cnhScore: detection.cnhScore,
      matchedKeywords: detection.matchedKeywords,
    },
  };
};

export const parseAddressText = (rawText: string) => {
  const lines = splitLines(rawText);
  const normalized = normalizeUpper(rawText);
  const cep = extractCep(lines, normalized);
  const endereco = extractAddressLine(lines, cep);

  // Extrai cidade e estado (geralmente aparecem juntos)
  let cidade: string | undefined;
  let estado: string | undefined;
  for (const line of lines) {
    const upper = normalizeUpper(line);
    // Procura por padrões: CIDADE - UF, CIDADE/UF, CIDADE UF
    const match = upper.match(
      /([A-Z\s]+?)[\s\-\/]+(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/,
    );
    if (match) {
      cidade = match[1].trim();
      estado = match[2];
      break;
    }
  }

  // Extrai bairro (geralmente aparece antes ou depois do CEP)
  let bairro: string | undefined;
  const cepIndex = lines.findIndex((line) => CEP_REGEX.test(line));
  if (cepIndex >= 0) {
    // Tenta linha anterior ao CEP
    const beforeCep = lines[cepIndex - 2]?.trim();
    if (beforeCep && beforeCep.length > 3 && beforeCep.length < 50) {
      const upper = normalizeUpper(beforeCep);
      // Ignora linhas que parecem endereço ou CEP
      if (!upper.match(/^(RUA|AV|AVENIDA|TRAVESSA|ALAMEDA|PRACA|RODOVIA|CEP)/)) {
        bairro = beforeCep;
      }
    }
  }

  return {
    cep,
    endereco,
    cidade,
    estado,
    bairro,
  };
};

const NAME_STOPWORDS = new Set(['DA', 'DE', 'DO', 'DAS', 'DOS', 'E']);

export const normalizeName = (value: string) => {
  const cleaned = normalizeUpper(value)
    .replace(/[^A-Z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .filter((token) => token && !NAME_STOPWORDS.has(token))
    .join(' ');
};

export const levenshteinDistance = (a: string, b: string) => {
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const matrix = Array.from({ length: aLen + 1 }, () => new Array(bLen + 1).fill(0));

  for (let i = 0; i <= aLen; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= bLen; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= aLen; i += 1) {
    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[aLen][bLen];
};

export const stringSimilarity = (a?: string, b?: string) => {
  if (!a || !b) return 0;
  const normalizedA = normalizeName(a);
  const normalizedB = normalizeName(b);
  if (!normalizedA || !normalizedB) return 0;
  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLen = Math.max(normalizedA.length, normalizedB.length);
  if (maxLen === 0) return 1;
  return 1 - distance / maxLen;
};
