import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserDto, UpdateUserDto } from './admin.users.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.adminUser.findMany({
      include: {
        roles: {
          include: { role: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map((r) => r.role.name),
    }));
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email ja cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const roles = await this.prisma.role.findMany({
      where: { name: { in: dto.roles } },
    });

    if (roles.length !== dto.roles.length) {
      throw new BadRequestException('Uma ou mais roles invalidas');
    }

    const user = await this.prisma.adminUser.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        roles: {
          create: roles.map((role) => ({
            roleId: role.id,
          })),
        },
      },
      include: {
        roles: { include: { role: true } },
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
      roles: user.roles.map((r) => r.role.name),
    };
  }

  async update(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.adminUser.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email ja cadastrado');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.newPassword) {
      data.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.roles) {
        const roles = await tx.role.findMany({
          where: { name: { in: dto.roles } },
        });
        if (roles.length !== dto.roles.length) {
          throw new BadRequestException('Uma ou mais roles invalidas');
        }

        await tx.adminUserRole.deleteMany({
          where: { adminUserId: userId },
        });
        await tx.adminUserRole.createMany({
          data: roles.map((role) => ({
            adminUserId: userId,
            roleId: role.id,
          })),
        });
      }

      return tx.adminUser.update({
        where: { id: userId },
        data,
        include: {
          roles: { include: { role: true } },
        },
      });
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      roles: updated.roles.map((r) => r.role.name),
    };
  }

  async deactivate(userId: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    await this.prisma.adminUser.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return { ok: true };
  }
}
