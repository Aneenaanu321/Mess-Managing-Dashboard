import { PrismaClient, RoleKey } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from "../src/config/permissions";
import { assertDefined } from "../src/utils/assert";

const prisma = new PrismaClient();

const ROLE_LABELS: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGING_DIRECTOR: "Managing Director",
  SALES_DIRECTOR: "Sales Director",
  SALES_MANAGER: "Sales Manager",
  SALES_EXECUTIVE: "Sales Executive",
  PRE_SALES_ENGINEER: "Pre-Sales Engineer",
  TECHNICAL_CONSULTANT: "Technical Consultant",
  PROJECT_MANAGER: "Project Manager",
  IMPLEMENTATION_ENGINEER: "Implementation Engineer",
  SUPPORT_ENGINEER: "Support Engineer",
  FINANCE: "Finance",
  ACCOUNTS: "Accounts",
  WAREHOUSE: "Warehouse",
  PROCUREMENT: "Procurement",
  CUSTOMER_PORTAL_USER: "Customer Portal User",
};

const DEMO_PASSWORD = "Password123!";

async function main() {
  console.log("Seeding: permissions...");
  const allPermissionKeys = new Set<string>();
  Object.values(PERMISSIONS).forEach((k) => allPermissionKeys.add(k));
  Object.values(DEFAULT_ROLE_PERMISSIONS).forEach((keys) => keys.forEach((k) => allPermissionKeys.add(k)));
  allPermissionKeys.delete(PERMISSIONS.ALL); // "*:*" is a wildcard sentinel, not a real seeded permission row

  for (const key of allPermissionKeys) {
    const module = key.split(":")[0] ?? "unknown";
    await prisma.permission.upsert({ where: { key }, create: { key, module }, update: {} });
  }

  console.log("Seeding: roles + role-permission matrix...");
  const roleRecords = new Map<RoleKey, { id: string }>();
  for (const roleKey of Object.values(RoleKey)) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      create: { key: roleKey, name: ROLE_LABELS[roleKey] },
      update: { name: ROLE_LABELS[roleKey] },
    });
    roleRecords.set(roleKey, role);

    const permKeys = DEFAULT_ROLE_PERMISSIONS[roleKey].filter((k) => k !== PERMISSIONS.ALL);
    const grantedPermissionIds: string[] = [];
    for (const permKey of permKeys) {
      const permission = await prisma.permission.findUnique({ where: { key: permKey } });
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
      grantedPermissionIds.push(permission.id);
    }
    // Upsert only ever adds — a permission removed from DEFAULT_ROLE_PERMISSIONS
    // since the last seed run would otherwise stay granted in the DB forever.
    // Super Admin is handled separately below (it always gets every permission).
    if (roleKey !== RoleKey.SUPER_ADMIN) {
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id, permissionId: { notIn: grantedPermissionIds } },
      });
    }
  }
  // Super Admin gets every seeded permission (its "*:*" wildcard is also honored directly by the
  // authorize() middleware, but granting real rows too keeps the Settings > Roles UI accurate).
  const superAdminRole = assertDefined(roleRecords.get(RoleKey.SUPER_ADMIN), "SUPER_ADMIN role was not seeded");
  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: permission.id } },
      create: { roleId: superAdminRole.id, permissionId: permission.id },
      update: {},
    });
  }

  console.log("Seeding: company + branch...");
  const company = await prisma.company.upsert({
    where: { id: "demo-company" },
    create: {
      id: "demo-company",
      name: "Falcon RFID Systems LLC",
      legalName: "Falcon RFID Systems LLC",
      currency: "AED",
      timezone: "Asia/Dubai",
    },
    update: {},
  });

  const branch = await prisma.branch.upsert({
    where: { companyId_code: { companyId: company.id, code: "HQ" } },
    create: { companyId: company.id, name: "Dubai HQ", code: "HQ", city: "Dubai", country: "UAE" },
    update: {},
  });

  console.log("Seeding: SLA policies...");
  const slaDefaults: Array<[string, number, number]> = [
    ["CRITICAL", 30, 240],
    ["HIGH", 60, 480],
    ["MEDIUM", 240, 1440],
    ["LOW", 480, 4320],
  ];
  for (const [priority, responseMins, resolutionMins] of slaDefaults) {
    await prisma.slaPolicy.upsert({
      where: { companyId_priority: { companyId: company.id, priority: priority as never } },
      create: { companyId: company.id, priority: priority as never, responseMins, resolutionMins },
      update: {},
    });
  }

  console.log("Seeding: demo users (one per role, password: Password123!)...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const demoUsers: Array<{ role: RoleKey; first: string; last: string; email: string }> = [
    { role: "SUPER_ADMIN", first: "Admin", last: "User", email: "admin@falconrfid.demo" },
    { role: "MANAGING_DIRECTOR", first: "Anil", last: "Kapoor", email: "md@falconrfid.demo" },
    { role: "SALES_DIRECTOR", first: "Sara", last: "Al Farsi", email: "sales.director@falconrfid.demo" },
    { role: "SALES_MANAGER", first: "Omar", last: "Hassan", email: "sales.manager@falconrfid.demo" },
    { role: "SALES_EXECUTIVE", first: "Ravi", last: "Menon", email: "ravi@falconrfid.demo" },
    { role: "PRE_SALES_ENGINEER", first: "Lina", last: "Choudhury", email: "presales@falconrfid.demo" },
    { role: "TECHNICAL_CONSULTANT", first: "Karim", last: "Idris", email: "techconsultant@falconrfid.demo" },
    { role: "PROJECT_MANAGER", first: "Fatima", last: "Zahra", email: "pm@falconrfid.demo" },
    { role: "IMPLEMENTATION_ENGINEER", first: "John", last: "Dsouza", email: "engineer@falconrfid.demo" },
    { role: "SUPPORT_ENGINEER", first: "Deepa", last: "Nair", email: "support@falconrfid.demo" },
    { role: "FINANCE", first: "Yusuf", last: "Rahman", email: "finance@falconrfid.demo" },
    { role: "ACCOUNTS", first: "Priya", last: "Suresh", email: "accounts@falconrfid.demo" },
    { role: "WAREHOUSE", first: "Ahmed", last: "Saleh", email: "warehouse@falconrfid.demo" },
    { role: "PROCUREMENT", first: "Noor", last: "Aziz", email: "procurement@falconrfid.demo" },
    { role: "CUSTOMER_PORTAL_USER", first: "Client", last: "Contact", email: "client@customer.demo" },
  ];

  const userIds = new Map<RoleKey, string>();
  for (const u of demoUsers) {
    const role = assertDefined(roleRecords.get(u.role), `Role ${u.role} was not seeded`);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      create: {
        companyId: company.id,
        branchId: branch.id,
        roleId: role.id,
        firstName: u.first,
        lastName: u.last,
        email: u.email,
        passwordHash,
      },
      update: {},
    });
    userIds.set(u.role, user.id);
  }

  console.log("Seeding: ibTech super admin (aneena.antony@ibtechintl.com)...");
  const aneenaPasswordHash = await bcrypt.hash("AneenaAntony@123", 12);
  await prisma.user.upsert({
    where: { email: "aneena.antony@ibtechintl.com" },
    create: {
      companyId: company.id,
      branchId: branch.id,
      roleId: superAdminRole.id,
      firstName: "Aneena",
      lastName: "Antony",
      email: "aneena.antony@ibtechintl.com",
      passwordHash: aneenaPasswordHash,
    },
    update: {
      roleId: superAdminRole.id,
      firstName: "Aneena",
      lastName: "Antony",
      passwordHash: aneenaPasswordHash,
      status: "ACTIVE",
    },
  });

  console.log("Seeding: product catalog...");
  const products = [
    { sku: "RFID-RDR-100", name: "UHF Fixed Reader RX-100", category: "RFID_READER", basePrice: 1200, costPrice: 850 },
    { sku: "RFID-ANT-200", name: "Circular Polarized Antenna AX-200", category: "RFID_ANTENNA", basePrice: 320, costPrice: 210 },
    { sku: "RFID-GATE-300", name: "RFID Security Gate GX-300 (Pair)", category: "RFID_GATE", basePrice: 4800, costPrice: 3400 },
    { sku: "RFID-HH-400", name: "Handheld Reader HX-400", category: "RFID_HANDHELD", basePrice: 950, costPrice: 640 },
    { sku: "RFID-PRT-500", name: "RFID Label Printer PX-500", category: "RFID_PRINTER", basePrice: 1450, costPrice: 1050 },
    { sku: "RFID-TAG-600", name: "UHF Apparel Tag (roll of 1000)", category: "RFID_TAG", basePrice: 85, costPrice: 45, isSerialized: false },
    { sku: "RFID-SW-700", name: "RFIDCore Inventory Cloud License (per site/yr)", category: "CLOUD_LICENSE", basePrice: 2400, costPrice: 0 },
    { sku: "SVC-INSTALL-01", name: "Standard Installation Service", category: "SERVICE_INSTALLATION", basePrice: 1800, costPrice: 900 },
  ] as const;

  for (const p of products) {
    await prisma.product.upsert({
      where: { companyId_sku: { companyId: company.id, sku: p.sku } },
      create: {
        companyId: company.id,
        sku: p.sku,
        name: p.name,
        category: p.category as never,
        basePrice: p.basePrice,
        costPrice: p.costPrice,
        isSerialized: "isSerialized" in p ? (p as any).isSerialized : true,
      },
      update: {},
    });
  }

  console.log("Seeding: warehouse + stock...");
  const warehouse = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: "WH-DXB" } },
    create: { companyId: company.id, branchId: branch.id, name: "Dubai Central Warehouse", code: "WH-DXB" },
    update: {},
  });

  const allProducts = await prisma.product.findMany({ where: { companyId: company.id } });
  for (const product of allProducts) {
    await prisma.stockItem.upsert({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: product.id } },
      create: { warehouseId: warehouse.id, productId: product.id, onHandQty: 50 },
      update: {},
    });
  }

  console.log("Seeding: campaign + demo leads...");
  const campaign = await prisma.campaign.upsert({
    where: { id: "demo-campaign-gitex" },
    create: { id: "demo-campaign-gitex", companyId: company.id, name: "GITEX 2026", channel: "Exhibition" },
    update: {},
  });

  const demoLeads = [
    { companyName: "Al Noor Retail Group", contactName: "Yasmin Ali", email: "yasmin@alnoorretail.demo", phone: "+971501234567", source: "EXHIBITION", industry: "RETAIL", score: 78 },
    { companyName: "MedLife Pharmaceuticals", contactName: "Dr. Rashid Khan", email: "rashid@medlife.demo", phone: "+971502345678", source: "REFERRAL", industry: "PHARMACEUTICALS", score: 82 },
    { companyName: "Silk Road Logistics", contactName: "Chen Wei", email: "chen@silkroadlog.demo", phone: "+971503456789", source: "WEBSITE", industry: "LOGISTICS", score: 55 },
  ] as const;

  for (const [i, lead] of demoLeads.entries()) {
    const code = `LEAD-2026-${String(i + 1).padStart(4, "0")}`;
    await prisma.lead.upsert({
      where: { companyId_code: { companyId: company.id, code } },
      create: {
        companyId: company.id,
        branchId: branch.id,
        code,
        campaignId: campaign.id,
        companyName: lead.companyName,
        contactName: lead.contactName,
        email: lead.email,
        phone: lead.phone,
        source: lead.source as never,
        industry: lead.industry as never,
        score: lead.score,
        ownerId: userIds.get("SALES_EXECUTIVE"),
      },
      update: {},
    });
  }

  console.log("Seeding: customers + opportunities + quotations...");
  const raviId = userIds.get("SALES_EXECUTIVE");
  const pmId = userIds.get("PROJECT_MANAGER");
  const engineerId = userIds.get("IMPLEMENTATION_ENGINEER");

  const customerSpecs = [
    { code: "CUST-2026-0001", name: "Al Noor Retail Group", industry: "RETAIL", contact: { firstName: "Yasmin", lastName: "Ali", email: "yasmin@alnoorretail.demo", phone: "+971501234567" }, site: { label: "Dubai Mall Flagship", city: "Dubai", country: "UAE" } },
    { code: "CUST-2026-0002", name: "MedLife Pharmaceuticals", industry: "PHARMACEUTICALS", contact: { firstName: "Rashid", lastName: "Khan", email: "rashid@medlife.demo", phone: "+971502345678" }, site: { label: "Jebel Ali Warehouse", city: "Dubai", country: "UAE" } },
    { code: "CUST-2026-0003", name: "Silk Road Logistics", industry: "LOGISTICS", contact: { firstName: "Chen", lastName: "Wei", email: "chen@silkroadlog.demo", phone: "+971503456789" }, site: { label: "Main Hub", city: "Sharjah", country: "UAE" } },
  ] as const;

  const customers: Array<{ id: string; code: string; siteId: string }> = [];
  for (const spec of customerSpecs) {
    const customer = await prisma.customer.upsert({
      where: { companyId_code: { companyId: company.id, code: spec.code } },
      create: {
        companyId: company.id,
        branchId: branch.id,
        code: spec.code,
        name: spec.name,
        industry: spec.industry as never,
        ownerId: raviId,
        contacts: {
          create: { ...spec.contact, isPrimary: true, title: "Primary Contact" },
        },
        sites: {
          create: { label: spec.site.label, city: spec.site.city, country: spec.site.country },
        },
      },
      update: {},
      include: { sites: true },
    });
    const siteId = customer.sites[0]?.id ?? (await prisma.site.create({ data: { customerId: customer.id, label: spec.site.label, city: spec.site.city, country: spec.site.country } })).id;
    customers.push({ id: customer.id, code: customer.code, siteId });
  }

  // Link the demo portal user to the first seeded customer now that customers
  // exist — CUSTOMER_PORTAL_USER was created earlier (users are seeded before
  // customers) without a customerId, so it needs a follow-up update here.
  const portalUserId = userIds.get("CUSTOMER_PORTAL_USER");
  if (portalUserId && customers[0]) {
    await prisma.user.update({ where: { id: portalUserId }, data: { customerId: customers[0].id } });
  }

  const oppStages = ["REQUIREMENT_GATHERING", "DEMO", "QUOTATION_SENT", "NEGOTIATION"] as const;
  const opportunities: Array<{ id: string; customerId: string }> = [];
  for (const [i, cust] of customers.entries()) {
    const code = `OPP-2026-${String(i + 1).padStart(4, "0")}`;
    const opp = await prisma.opportunity.upsert({
      where: { companyId_code: { companyId: company.id, code } },
      create: {
        companyId: company.id,
        branchId: branch.id,
        code,
        title: `${customerSpecs[i]!.name} — RFID rollout`,
        customerId: cust.id,
        ownerId: raviId,
        stage: oppStages[i] ?? "REQUIREMENT_GATHERING",
        probability: 20 + i * 20,
        estimatedValue: 85000 + i * 40000,
        currency: "AED",
        expectedCloseDate: new Date(Date.now() + (30 + i * 15) * 86400000),
      },
      update: {},
    });
    opportunities.push({ id: opp.id, customerId: cust.id });
  }

  const reader = allProducts.find((p) => p.sku === "RFID-RDR-100");
  const antenna = allProducts.find((p) => p.sku === "RFID-ANT-200");
  const gate = allProducts.find((p) => p.sku === "RFID-GATE-300");

  if (reader && antenna && gate && opportunities[0]) {
    const qtCode = "QT-2026-0001";
    const existingQt = await prisma.quotation.findFirst({ where: { companyId: company.id, code: qtCode, version: 1 } });
    if (!existingQt) {
      const line1 = { description: reader.name, quantity: 4, unitPrice: 1200, discountPct: 5, taxPct: 5, lineTotal: 4 * 1200 * 0.95 * 1.05 };
      const line2 = { description: antenna.name, quantity: 8, unitPrice: 320, discountPct: 0, taxPct: 5, lineTotal: 8 * 320 * 1.05 };
      const line3 = { description: gate.name, quantity: 2, unitPrice: 4800, discountPct: 10, taxPct: 5, lineTotal: 2 * 4800 * 0.9 * 1.05 };
      const subtotal = 4 * 1200 + 8 * 320 + 2 * 4800;
      const discountTotal = 4 * 1200 * 0.05 + 2 * 4800 * 0.1;
      const taxable = subtotal - discountTotal;
      const taxTotal = taxable * 0.05;
      await prisma.quotation.create({
        data: {
          companyId: company.id,
          branchId: branch.id,
          code: qtCode,
          version: 1,
          opportunityId: opportunities[0].id,
          customerId: opportunities[0].customerId,
          status: "SENT",
          currency: "AED",
          subtotal,
          discountTotal,
          taxTotal,
          grandTotal: taxable + taxTotal,
          paymentTerms: "40% advance / 40% on delivery / 20% on go-live",
          createdById: raviId!,
          sentAt: new Date(),
          lineItems: {
            create: [
              { productId: reader.id, description: line1.description, quantity: line1.quantity, unitPrice: line1.unitPrice, discountPct: line1.discountPct, taxPct: line1.taxPct, lineTotal: line1.lineTotal, sortOrder: 0 },
              { productId: antenna.id, description: line2.description, quantity: line2.quantity, unitPrice: line2.unitPrice, discountPct: line2.discountPct, taxPct: line2.taxPct, lineTotal: line2.lineTotal, sortOrder: 1 },
              { productId: gate.id, description: line3.description, quantity: line3.quantity, unitPrice: line3.unitPrice, discountPct: line3.discountPct, taxPct: line3.taxPct, lineTotal: line3.lineTotal, sortOrder: 2 },
            ],
          },
        },
      });
    }
  }

  console.log("Seeding: vendors + support tickets + AMC...");
  const existingVendor = await prisma.vendor.findFirst({
    where: { companyId: company.id, name: "Impinj Middle East Distribution" },
  });
  if (!existingVendor) {
    await prisma.vendor.create({
      data: {
        companyId: company.id,
        name: "Impinj Middle East Distribution",
        contactName: "Sales Desk",
        email: "orders@impinj-me.demo",
        phone: "+97144123456",
        leadTimeDays: 21,
      },
    });
  }

  if (customers[0] && gate) {
    const device = await prisma.device.upsert({
      where: { companyId_serialNumber: { companyId: company.id, serialNumber: "GX300-DEMO-001" } },
      create: {
        companyId: company.id,
        productId: gate.id,
        serialNumber: "GX300-DEMO-001",
        type: "GATE",
        status: "INSTALLED",
        siteId: customers[0].siteId,
        location: "Entrance Gate 1",
        firmwareVersion: "2.4.1",
        installedAt: new Date(Date.now() - 120 * 86400000),
      },
      update: {},
    });

    await prisma.ticket.upsert({
      where: { companyId_code: { companyId: company.id, code: "TKT-2026-0001" } },
      create: {
        companyId: company.id,
        code: "TKT-2026-0001",
        subject: "Gate reader intermittent disconnects",
        description: "Customer reports GX-300 drops offline every few hours.",
        priority: "HIGH",
        status: "ASSIGNED",
        customerId: customers[0].id,
        deviceId: device.id,
        assigneeId: userIds.get("SUPPORT_ENGINEER"),
      },
      update: {},
    });

    const amcEnd = new Date(Date.now() + 45 * 86400000);
    await prisma.amcContract.upsert({
      where: { companyId_code: { companyId: company.id, code: "AMC-2026-0001" } },
      create: {
        companyId: company.id,
        code: "AMC-2026-0001",
        customerId: customers[0].id,
        startDate: new Date(Date.now() - 320 * 86400000),
        endDate: amcEnd,
        contractValue: 18000,
        status: "ACTIVE",
        currency: "AED",
        devices: { create: [{ deviceId: device.id }] },
      },
      update: {},
    });
  }

  // Soft-reference unused vars so TS stays quiet if roles missing
  void pmId;
  void engineerId;

  console.log("\nSeed complete.");
  console.log("ibTech super admin: aneena.antony@ibtechintl.com / AneenaAntony@123");
  console.log(`Demo login (any role): <email> / ${DEMO_PASSWORD}`);
  console.log("e.g. admin@falconrfid.demo, ravi@falconrfid.demo, pm@falconrfid.demo ...");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
