import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

const configService = {
  get: (key: string) => {
    const map: Record<string, string> = {
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
    };
    return map[key];
  },
};

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    adminUser: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: new JwtService({}) },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('validates admin with correct password', async () => {
    const passwordHash = await bcrypt.hash('secret', 10);

    prisma.adminUser.findUnique = jest.fn().mockResolvedValue({
      id: '1',
      email: 'admin@test.com',
      passwordHash,
      roles: [{ role: { name: 'ADMIN' } }],
    });

    const user = await service.validateAdmin('admin@test.com', 'secret');

    expect(user).toEqual({
      id: '1',
      email: 'admin@test.com',
      roles: ['ADMIN'],
    });
  });

  it('returns null when password is invalid', async () => {
    const passwordHash = await bcrypt.hash('secret', 10);

    prisma.adminUser.findUnique = jest.fn().mockResolvedValue({
      id: '1',
      email: 'admin@test.com',
      passwordHash,
      roles: [{ role: { name: 'ADMIN' } }],
    });

    const user = await service.validateAdmin('admin@test.com', 'wrong');

    expect(user).toBeNull();
  });
});
