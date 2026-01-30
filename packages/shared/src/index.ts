import { z } from 'zod';
import { isValidCpf } from './validators/cpf';

export * from './validators';

export const cpfSchema = z.string().refine(isValidCpf, 'CPF invalido');

export type Cpf = z.infer<typeof cpfSchema>;

export const isCpf = (value: string): value is Cpf => cpfSchema.safeParse(value).success;
