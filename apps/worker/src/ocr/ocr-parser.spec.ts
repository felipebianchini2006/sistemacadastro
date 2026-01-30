import { parseDocumentText, stringSimilarity } from './ocr-parser';

const RG_SAMPLE = `REPUBLICA FEDERATIVA DO BRASIL
REGISTRO GERAL 12.345.678-9
NOME
JOAO DA SILVA
CPF 123.456.789-09
DATA DE EXPEDICAO 01/02/2015
ORGAO EMISSOR SSP/SC
`;

const CNH_SAMPLE = `CARTEIRA NACIONAL DE HABILITACAO
NOME
MARIA OLIVEIRA
CPF 935.411.347-80
REGISTRO 01234567890
VALIDADE 12/08/2030
DATA EMISSAO 15/03/2020
DETRAN SP
`;

describe('OCR parser', () => {
  it('detects RG fields', () => {
    const result = parseDocumentText(RG_SAMPLE);

    expect(result.documentType).toBe('RG');
    expect(result.fields.nome).toBe('JOAO DA SILVA');
    expect(result.fields.cpf).toBe('12345678909');
    expect(result.fields.rgCnh).toContain('12');
    expect(result.fields.dataEmissao).toBe('2015-02-01');
    expect(result.fields.orgaoEmissor).toContain('SSP');
    expect(result.fields.uf).toBe('SC');
  });

  it('detects CNH fields', () => {
    const result = parseDocumentText(CNH_SAMPLE);

    expect(result.documentType).toBe('CNH');
    expect(result.fields.nome).toBe('MARIA OLIVEIRA');
    expect(result.fields.cpf).toBe('93541134780');
    expect(result.fields.rgCnh).toBe('01234567890');
    expect(result.fields.dataEmissao).toBe('2020-03-15');
    expect(result.fields.dataValidade).toBe('2030-08-12');
  });

  it('computes similarity', () => {
    const similarity = stringSimilarity('Maria da Silva', 'Maria Silva');
    expect(similarity).toBeGreaterThan(0.8);
  });
});
