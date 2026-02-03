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

  const adminRole = (await prisma.role.findUnique({
    where: { name: RoleName.ADMIN },
  }))!;
  const analystRole = (await prisma.role.findUnique({
    where: { name: RoleName.ANALYST },
  }))!;

  const defaultAdminEmail =
    process.env.ADMIN_SEED_EMAIL ?? 'admin@sistemacadastro.local';
  const defaultAdminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'Admin123!';
  const defaultAdminPasswordHash = await bcrypt.hash(defaultAdminPassword, 10);

  const defaultAdmin = await prisma.adminUser.upsert({
    where: { email: defaultAdminEmail },
    update: { passwordHash: defaultAdminPasswordHash },
    create: {
      email: defaultAdminEmail,
      name: 'Admin',
      passwordHash: defaultAdminPasswordHash,
    },
  });

  await prisma.adminUserRole.upsert({
    where: {
      adminUserId_roleId: {
        adminUserId: defaultAdmin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      adminUserId: defaultAdmin.id,
      roleId: adminRole.id,
    },
  });

  const seedUsers = [
    { email: 'admin@email.com', name: 'Admin', roleId: adminRole.id },
    { email: 'analista@email.com', name: 'Analista', roleId: analystRole.id },
  ];

  const seedPasswordHash = await bcrypt.hash('12345678', 10);

  for (const seedUser of seedUsers) {
    const user = await prisma.adminUser.upsert({
      where: { email: seedUser.email },
      update: { passwordHash: seedPasswordHash },
      create: {
        email: seedUser.email,
        name: seedUser.name,
        passwordHash: seedPasswordHash,
      },
    });

    await prisma.adminUserRole.upsert({
      where: {
        adminUserId_roleId: {
          adminUserId: user.id,
          roleId: seedUser.roleId,
        },
      },
      update: {},
      create: {
        adminUserId: user.id,
        roleId: seedUser.roleId,
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
