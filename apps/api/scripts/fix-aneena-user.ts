import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "aneena.antony@ibtechintl.com";
  const password = "AneenaAntony@123";
  const passwordHash = await bcrypt.hash(password, 12);

  const role = await prisma.role.findUnique({ where: { key: "SUPER_ADMIN" } });
  if (!role) throw new Error("SUPER_ADMIN role missing — run seed first");

  const company = await prisma.company.findFirst();
  if (!company) throw new Error("No company — run seed first");

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      companyId: company.id,
      email,
      firstName: "Aneena",
      lastName: "Antony",
      passwordHash,
      roleId: role.id,
      status: "ACTIVE",
    },
    update: {
      passwordHash,
      roleId: role.id,
      status: "ACTIVE",
    },
    include: { role: true },
  });

  const all = await prisma.permission.findMany();
  for (const p of all) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
      create: { roleId: role.id, permissionId: p.id },
      update: {},
    });
  }

  console.log(
    JSON.stringify(
      {
        email: user.email,
        role: user.role.key,
        status: user.status,
        permissionsLinked: all.length,
        password,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
