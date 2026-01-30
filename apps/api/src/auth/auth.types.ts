import { RoleName } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  roles: RoleName[];
}
