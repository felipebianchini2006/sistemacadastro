import { z } from 'zod';

export const cpfSchema = z.string().regex(/^\d{11}$/, 'CPF deve ter 11 digitos');

export type Cpf = z.infer<typeof cpfSchema>;

export const isCpf = (value: string): value is Cpf => cpfSchema.safeParse(value).success;
