import { RoleName } from '@prisma/client';
import { z } from 'zod';

export type CreateUserDto = {
  name: string;
  email: string;
  password: string;
  roles: RoleName[];
};

export type UpdateUserDto = {
  name?: string;
  email?: string;
  newPassword?: string;
  roles?: RoleName[];
  isActive?: boolean;
};

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  roles: z.array(z.nativeEnum(RoleName)).min(1, 'Selecione ao menos uma role'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  newPassword: z.string().min(6).optional(),
  roles: z.array(z.nativeEnum(RoleName)).min(1).optional(),
  isActive: z.boolean().optional(),
});
