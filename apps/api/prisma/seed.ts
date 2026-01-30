import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const roles: RoleName[] = [RoleName.ADMIN, RoleName.ANALYST, RoleName.VIEWER];

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const email = process.env.ADMIN_SEED_EMAIL ?? 'admin@sistemacadastro.local';
  const password = process.env.ADMIN_SEED_PASSWORD ?? 'Admin123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      name: 'Admin',
      passwordHash,
      roles: {
        create: [
          {
            role: {
              connect: { name: RoleName.ADMIN },
            },
          },
        ],
      },
    },
    include: { roles: { include: { role: true } } },
  });

  if (admin.roles.length === 0) {
    await prisma.adminUserRole.create({
      data: {
        adminUserId: admin.id,
        roleId: (await prisma.role.findUnique({
          where: { name: RoleName.ADMIN },
        }))!.id,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
