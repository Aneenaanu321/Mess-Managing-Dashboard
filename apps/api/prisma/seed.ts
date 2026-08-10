import { PrismaClient, RoleKey } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from "../src/config/permissions";
import { assertDefined } from "../src/utils/assert";

const prisma = new PrismaClient();

// Use string keys (not RoleKey.X) so this file typechecks even if the IDE's
// Prisma client cache is briefly stale after adding a new role.
const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  MANAGING_DIRECTOR: "Managing Director",
  SALES_DIRECTOR: "Sales Director",
  SALES_MANAGER: "Sales Manager",
  SALES_EXECUTIVE: "Sales Executive",
  SALES_COORDINATOR: "Sales Coordinator",
  PRE_SALES_ENGINEER: "Pre-Sales Engineer",
  TECHNICAL_CONSULTANT: "Technical Consultant",
  PROJECT_MANAGER: "Project Manager",
  IMPLEMENTATION_ENGINEER: "Implementation Engineer",
  DELIVERY_PERSON: "Delivery Person",
  SUPPORT_ENGINEER: "Support Engineer",
  FINANCE: "Finance",
  ACCOUNTS: "Accounts",
  WAREHOUSE: "Warehouse",
  PROCUREMENT: "Procurement",
  CUSTOMER_PORTAL_USER: "Customer Portal User",
} as Record<RoleKey, string>;

const DEMO_PASSWORD = "Password123!";

type DemoUser = { role: RoleKey; first: string; last: string; email: string };

function demoRole(role: string): RoleKey {
  return role as RoleKey;
}

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

  console.log("Seeding: working users only (Admin, Aneena, Susan, Jeremy, Rakesh)...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Migrate legacy demo domains → ibtechintl.com (idempotent)
  await prisma.$executeRawUnsafe(
    `UPDATE users SET email = REPLACE(email, '@falconrfid.demo', '@ibtechintl.com') WHERE email LIKE '%@falconrfid.demo'`,
  );
  await prisma.$executeRawUnsafe(
    `UPDATE users SET email = REPLACE(email, '@falconrfid.com', '@ibtechintl.com') WHERE email LIKE '%@falconrfid.com'`,
  );

  const demoUsers: DemoUser[] = [
    { role: demoRole("SUPER_ADMIN"), first: "Admin", last: "User", email: "admin@ibtechintl.com" },
    { role: demoRole("SALES_COORDINATOR"), first: "Susan", last: "Coordinator", email: "susan@ibtechintl.com" },
    { role: demoRole("SALES_MANAGER"), first: "Jeremy", last: "Manager", email: "jeremy@ibtechintl.com" },
    { role: demoRole("DELIVERY_PERSON"), first: "Rakesh", last: "Driver", email: "rakesh@ibtechintl.com" },
  ];

  const keepEmails = new Set([
    ...demoUsers.map((u) => u.email.toLowerCase()),
    "aneena.antony@ibtechintl.com",
  ]);

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
        status: "ACTIVE",
      },
      update: {
        roleId: role.id,
        firstName: u.first,
        lastName: u.last,
        passwordHash,
        status: "ACTIVE",
      },
    });
    userIds.set(u.role, user.id);
  }

  console.log("Seeding: ibTech super admin (aneena.antony@ibtechintl.com)...");
  const aneenaPasswordHash = await bcrypt.hash("AneenaAntony@123", 12);
  const aneena = await prisma.user.upsert({
    where: { email: "aneena.antony@ibtechintl.com" },
    create: {
      companyId: company.id,
      branchId: branch.id,
      roleId: superAdminRole.id,
      firstName: "Aneena",
      lastName: "Antony",
      email: "aneena.antony@ibtechintl.com",
      passwordHash: aneenaPasswordHash,
      status: "ACTIVE",
    },
    update: {
      roleId: superAdminRole.id,
      firstName: "Aneena",
      lastName: "Antony",
      passwordHash: aneenaPasswordHash,
      status: "ACTIVE",
    },
  });
  userIds.set(RoleKey.SUPER_ADMIN, userIds.get(RoleKey.SUPER_ADMIN) ?? aneena.id);

  // Deactivate every other login for this company — only the working team stays ACTIVE
  await prisma.user.updateMany({
    where: {
      companyId: company.id,
      status: "ACTIVE",
      email: { notIn: [...keepEmails] },
    },
    data: { status: "INACTIVE" },
  });

  const adminId = assertDefined(userIds.get(RoleKey.SUPER_ADMIN), "Admin user missing");
  const susanId = assertDefined(userIds.get(RoleKey.SALES_COORDINATOR), "Susan user missing");
  const jeremyId = assertDefined(userIds.get(RoleKey.SALES_MANAGER), "Jeremy user missing");
  const rakeshId = assertDefined(userIds.get(RoleKey.DELIVERY_PERSON), "Rakesh user missing");
  void rakeshId;

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
    { companyName: "Al Noor Retail Group", contactName: "Yasmin Ali", email: "yasmin@alnoorretail.com", phone: "+971501234567", source: "EXHIBITION", industry: "RETAIL", score: 78 },
    { companyName: "MedLife Pharmaceuticals", contactName: "Dr. Rashid Khan", email: "rashid@medlife.com", phone: "+971502345678", source: "REFERRAL", industry: "PHARMACEUTICALS", score: 82 },
    { companyName: "Silk Road Logistics", contactName: "Chen Wei", email: "chen@silkroadlog.com", phone: "+971503456789", source: "WEBSITE", industry: "LOGISTICS", score: 55 },
    { companyName: "Desert Crown Hospitality", contactName: "Mariam Saeed", email: "mariam@desertcrown.com", phone: "+971504567891", source: "PARTNER", industry: "HOSPITALITY", score: 66 },
    { companyName: "Vertex Manufacturing LLC", contactName: "Arjun Patel", email: "arjun@vertexmfg.com", phone: "+971505678912", source: "INBOUND_CALL", industry: "MANUFACTURING", score: 73 },
  ] as const;

  for (const [i, lead] of demoLeads.entries()) {
    const code = `LEAD-2026-${String(i + 1).padStart(4, "0")}`;
    const leadStatuses = ["NEW", "CONTACTED", "QUALIFIED", "QUALIFIED", "CONVERTED"] as const;
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
        status: leadStatuses[i] ?? "NEW",
        ownerId: jeremyId,
      },
      update: { status: leadStatuses[i] ?? "NEW" },
    });
  }

  console.log("Seeding: customers + opportunities + quotations...");
  const salesOwnerId = jeremyId;
  const financeRecorderId = adminId;

  function monthsAgo(months: number, day = 15): Date {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(day);
    d.setMonth(d.getMonth() - months);
    return d;
  }

  function daysFromNow(days: number): Date {
    return new Date(Date.now() + days * 86400000);
  }

  const customerSpecs = [
    { code: "CUST-2026-0001", name: "Al Noor Retail Group", industry: "RETAIL", contact: { firstName: "Yasmin", lastName: "Ali", email: "yasmin@alnoorretail.com", phone: "+971501234567" }, site: { label: "Dubai Mall Flagship", city: "Dubai", country: "UAE" } },
    { code: "CUST-2026-0002", name: "MedLife Pharmaceuticals", industry: "PHARMACEUTICALS", contact: { firstName: "Rashid", lastName: "Khan", email: "rashid@medlife.com", phone: "+971502345678" }, site: { label: "Jebel Ali Warehouse", city: "Dubai", country: "UAE" } },
    { code: "CUST-2026-0003", name: "Silk Road Logistics", industry: "LOGISTICS", contact: { firstName: "Chen", lastName: "Wei", email: "chen@silkroadlog.com", phone: "+971503456789" }, site: { label: "Main Hub", city: "Sharjah", country: "UAE" } },
    { code: "CUST-2026-0004", name: "Desert Crown Hospitality", industry: "HOSPITALITY", contact: { firstName: "Mariam", lastName: "Saeed", email: "mariam@desertcrown.com", phone: "+971504567891" }, site: { label: "Palm Resort Central Store", city: "Dubai", country: "UAE" } },
    { code: "CUST-2026-0005", name: "Vertex Manufacturing LLC", industry: "MANUFACTURING", contact: { firstName: "Arjun", lastName: "Patel", email: "arjun@vertexmfg.com", phone: "+971505678912" }, site: { label: "Industrial Zone Plant", city: "Abu Dhabi", country: "UAE" } },
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
        ownerId: salesOwnerId,
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

  // Portal demo user removed — working team only.

  const oppStages = ["REQUIREMENT_GATHERING", "TECHNICAL_DISCUSSION", "QUOTATION_SENT", "NEGOTIATION", "INTERNAL_REVIEW"] as const;
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
        ownerId: salesOwnerId,
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

  // One closed-won deal for revenue KPIs
  await prisma.opportunity.update({
    where: { companyId_code: { companyId: company.id, code: "OPP-2026-0001" } },
    data: { stage: "WON", probability: 100 },
  });

  const reader = allProducts.find((p) => p.sku === "RFID-RDR-100");
  const antenna = allProducts.find((p) => p.sku === "RFID-ANT-200");
  const gate = allProducts.find((p) => p.sku === "RFID-GATE-300");

  if (reader && antenna && gate) {
    const quotationSpecs = [
      { code: "QT-2026-0001", qtyReader: 4, qtyAntenna: 8, qtyGate: 2, discountPct: 7, status: "SENT" },
      { code: "QT-2026-0002", qtyReader: 3, qtyAntenna: 6, qtyGate: 1, discountPct: 5, status: "SENT" },
      { code: "QT-2026-0003", qtyReader: 5, qtyAntenna: 10, qtyGate: 2, discountPct: 12, status: "PENDING_APPROVAL" },
      { code: "QT-2026-0004", qtyReader: 2, qtyAntenna: 4, qtyGate: 1, discountPct: 9, status: "SENT" },
      { code: "QT-2026-0005", qtyReader: 6, qtyAntenna: 12, qtyGate: 3, discountPct: 18, status: "PENDING_APPROVAL" },
    ] as const;

    for (const [i, spec] of quotationSpecs.entries()) {
      const opportunity = opportunities[i];
      if (!opportunity) continue;

      const existingQt = await prisma.quotation.findFirst({
        where: { companyId: company.id, code: spec.code, version: 1 },
      });
      if (existingQt) continue;

      const taxPct = 5;
      const line1Gross = spec.qtyReader * 1200;
      const line2Gross = spec.qtyAntenna * 320;
      const line3Gross = spec.qtyGate * 4800;
      const subtotal = line1Gross + line2Gross + line3Gross;
      const discountTotal = subtotal * (spec.discountPct / 100);
      const taxable = subtotal - discountTotal;
      const taxTotal = taxable * (taxPct / 100);

      const line1Taxable = line1Gross * (1 - spec.discountPct / 100);
      const line2Taxable = line2Gross * (1 - spec.discountPct / 100);
      const line3Taxable = line3Gross * (1 - spec.discountPct / 100);

      await prisma.quotation.create({
        data: {
          companyId: company.id,
          branchId: branch.id,
          code: spec.code,
          version: 1,
          opportunityId: opportunity.id,
          customerId: opportunity.customerId,
          status: spec.status as never,
          currency: "AED",
          subtotal,
          discountTotal,
          taxTotal,
          grandTotal: taxable + taxTotal,
          paymentTerms: "40% advance / 40% on delivery / 20% on go-live",
          createdById: salesOwnerId,
          sentAt: spec.status === "SENT" ? new Date() : null,
          lineItems: {
            create: [
              { productId: reader.id, description: reader.name, quantity: spec.qtyReader, unitPrice: 1200, discountPct: spec.discountPct, taxPct, lineTotal: line1Taxable * (1 + taxPct / 100), sortOrder: 0 },
              { productId: antenna.id, description: antenna.name, quantity: spec.qtyAntenna, unitPrice: 320, discountPct: spec.discountPct, taxPct, lineTotal: line2Taxable * (1 + taxPct / 100), sortOrder: 1 },
              { productId: gate.id, description: gate.name, quantity: spec.qtyGate, unitPrice: 4800, discountPct: spec.discountPct, taxPct, lineTotal: line3Taxable * (1 + taxPct / 100), sortOrder: 2 },
            ],
          },
        },
      });
    }

    // Pending approvals for discount-triggered quotations
    const pendingQuotations = await prisma.quotation.findMany({
      where: { companyId: company.id, status: "PENDING_APPROVAL" },
      select: { id: true, code: true },
    });
    for (const qt of pendingQuotations) {
      const existing = await prisma.approval.findFirst({
        where: { companyId: company.id, quotationId: qt.id, status: "PENDING" },
      });
      if (existing) continue;
      await prisma.approval.create({
        data: {
          companyId: company.id,
          entityType: "Quotation",
          entityId: qt.id,
          quotationId: qt.id,
          requestedById: salesOwnerId,
          status: "PENDING",
          reason: `Discount on ${qt.code} exceeds approval threshold`,
        },
      });
    }
  }

  console.log("Seeding: invoices + payments (collections trend)...");
  const invoiceSpecs = [
    {
      code: "INV-2026-0001",
      customerIdx: 0,
      status: "PAID" as const,
      subtotal: 80952.38,
      taxTotal: 4047.62,
      total: 85000,
      amountPaid: 85000,
      dueDate: monthsAgo(2),
      issuedAt: monthsAgo(3),
      milestone: "Advance",
      payments: [
        { monthsAgo: 3, amount: 34000, method: "BANK_TRANSFER" as const, ref: "TXN-ADV-001" },
        { monthsAgo: 2, amount: 51000, method: "BANK_TRANSFER" as const, ref: "TXN-ADV-002" },
      ],
    },
    {
      code: "INV-2026-0002",
      customerIdx: 1,
      status: "PAID" as const,
      subtotal: 57142.86,
      taxTotal: 2857.14,
      total: 60000,
      amountPaid: 60000,
      dueDate: monthsAgo(1),
      issuedAt: monthsAgo(2),
      milestone: "Delivery",
      payments: [{ monthsAgo: 2, amount: 60000, method: "CHEQUE" as const, ref: "CHQ-88421" }],
    },
    {
      code: "INV-2026-0003",
      customerIdx: 2,
      status: "PAID" as const,
      subtotal: 42857.14,
      taxTotal: 2142.86,
      total: 45000,
      amountPaid: 45000,
      dueDate: monthsAgo(1),
      issuedAt: monthsAgo(1),
      milestone: "Go-Live",
      payments: [{ monthsAgo: 1, amount: 45000, method: "ONLINE" as const, ref: "PG-77219" }],
    },
    {
      code: "INV-2026-0004",
      customerIdx: 3,
      status: "PAID" as const,
      subtotal: 66666.67,
      taxTotal: 3333.33,
      total: 70000,
      amountPaid: 70000,
      dueDate: daysFromNow(-7),
      issuedAt: monthsAgo(0),
      milestone: "Advance",
      payments: [{ monthsAgo: 0, amount: 70000, method: "BANK_TRANSFER" as const, ref: "TXN-JUL-004" }],
    },
    {
      code: "INV-2026-0005",
      customerIdx: 4,
      status: "PARTIALLY_PAID" as const,
      subtotal: 95238.1,
      taxTotal: 4761.9,
      total: 100000,
      amountPaid: 40000,
      dueDate: daysFromNow(14),
      issuedAt: monthsAgo(0),
      milestone: "Delivery",
      payments: [{ monthsAgo: 0, amount: 40000, method: "BANK_TRANSFER" as const, ref: "TXN-PART-005" }],
    },
    {
      code: "INV-2026-0006",
      customerIdx: 0,
      status: "OVERDUE" as const,
      subtotal: 28571.43,
      taxTotal: 1428.57,
      total: 30000,
      amountPaid: 0,
      dueDate: daysFromNow(-45),
      issuedAt: monthsAgo(2),
      milestone: "Support retainer",
      payments: [] as Array<{ monthsAgo: number; amount: number; method: "BANK_TRANSFER"; ref: string }>,
    },
    {
      code: "INV-2026-0007",
      customerIdx: 1,
      status: "SENT" as const,
      subtotal: 38095.24,
      taxTotal: 1904.76,
      total: 40000,
      amountPaid: 0,
      dueDate: daysFromNow(30),
      issuedAt: monthsAgo(0),
      milestone: "Training",
      payments: [] as Array<{ monthsAgo: number; amount: number; method: "BANK_TRANSFER"; ref: string }>,
    },
  ] as const;

  for (const spec of invoiceSpecs) {
    const customer = customers[spec.customerIdx];
    if (!customer) continue;

    const invoice = await prisma.invoice.upsert({
      where: { companyId_code: { companyId: company.id, code: spec.code } },
      create: {
        companyId: company.id,
        branchId: branch.id,
        code: spec.code,
        customerId: customer.id,
        milestoneLabel: spec.milestone,
        status: spec.status,
        currency: "AED",
        subtotal: spec.subtotal,
        taxTotal: spec.taxTotal,
        totalAmount: spec.total,
        amountPaid: spec.amountPaid,
        dueDate: spec.dueDate,
        issuedAt: spec.issuedAt,
        lineItems: {
          create: [
            {
              description: `${spec.milestone} — RFID hardware & services`,
              quantity: 1,
              unitPrice: spec.subtotal,
              taxPct: 5,
              lineTotal: spec.total,
            },
          ],
        },
      },
      update: {
        status: spec.status,
        amountPaid: spec.amountPaid,
        dueDate: spec.dueDate,
        issuedAt: spec.issuedAt,
      },
    });

    const existingPayments = await prisma.payment.count({ where: { invoiceId: invoice.id } });
    if (existingPayments === 0) {
      for (const payment of spec.payments) {
        await prisma.payment.create({
          data: {
            companyId: company.id,
            invoiceId: invoice.id,
            amount: payment.amount,
            currency: "AED",
            method: payment.method,
            reference: payment.ref,
            receivedAt: monthsAgo(payment.monthsAgo),
            recordedById: financeRecorderId,
          },
        });
      }
    }
  }

  // Extra historical payments so the collections chart spans several months
  const extraPayments = [
    { monthsAgo: 5, amount: 32000, customerIdx: 2 },
    { monthsAgo: 4, amount: 48000, customerIdx: 3 },
  ] as const;
  for (const [i, extra] of extraPayments.entries()) {
    const customer = customers[extra.customerIdx];
    if (!customer) continue;
    const code = `INV-2026-HIST-${String(i + 1).padStart(2, "0")}`;
    const total = extra.amount;
    const subtotal = total / 1.05;
    const taxTotal = total - subtotal;

    const invoice = await prisma.invoice.upsert({
      where: { companyId_code: { companyId: company.id, code } },
      create: {
        companyId: company.id,
        branchId: branch.id,
        code,
        customerId: customer.id,
        status: "PAID",
        currency: "AED",
        subtotal,
        taxTotal,
        totalAmount: total,
        amountPaid: total,
        dueDate: monthsAgo(extra.monthsAgo - 1),
        issuedAt: monthsAgo(extra.monthsAgo),
        lineItems: {
          create: [{ description: "Historical demo invoice", quantity: 1, unitPrice: subtotal, taxPct: 5, lineTotal: total }],
        },
      },
      update: { status: "PAID", amountPaid: total },
    });

    const hasPayment = await prisma.payment.count({ where: { invoiceId: invoice.id } });
    if (hasPayment === 0) {
      await prisma.payment.create({
        data: {
          companyId: company.id,
          invoiceId: invoice.id,
          amount: total,
          currency: "AED",
          method: "BANK_TRANSFER",
          reference: `HIST-${code}`,
          receivedAt: monthsAgo(extra.monthsAgo),
          recordedById: financeRecorderId,
        },
      });
    }
  }

  console.log("Seeding: calendar follow-ups...");
  const calendarSpecs = [
    { title: "Follow up — Al Noor quotation review", type: "FOLLOW_UP" as const, daysAhead: 2, oppIdx: 0 },
    { title: "Site visit — MedLife warehouse survey", type: "SITE_VISIT" as const, daysAhead: 5, oppIdx: 1 },
    { title: "Demo — Silk Road dock RFID solution", type: "DEMO" as const, daysAhead: 8, oppIdx: 2 },
    { title: "Negotiation call — Desert Crown pricing", type: "MEETING" as const, daysAhead: 3, oppIdx: 3 },
    { title: "Training session — Vertex plant go-live", type: "TRAINING" as const, daysAhead: 12, oppIdx: 4 },
  ] as const;

  for (const [i, event] of calendarSpecs.entries()) {
    const startAt = daysFromNow(event.daysAhead);
    startAt.setHours(10 + i, 0, 0, 0);
    const existing = await prisma.calendarEvent.findFirst({
      where: { companyId: company.id, title: event.title },
    });
    if (existing) continue;
    await prisma.calendarEvent.create({
      data: {
        companyId: company.id,
        ownerId: salesOwnerId,
        type: event.type,
        title: event.title,
        startAt,
        endAt: new Date(startAt.getTime() + 60 * 60 * 1000),
        opportunityId: opportunities[event.oppIdx]?.id,
      },
    });
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
        email: "orders@impinj-me.com",
        phone: "+97144123456",
        leadTimeDays: 21,
      },
    });
  }

  if (gate && reader) {
    const ticketSpecs = [
      { code: "TKT-2026-0001", priority: "HIGH", status: "ASSIGNED", subject: "Gate reader intermittent disconnects", description: "Customer reports GX-300 drops offline every few hours." },
      { code: "TKT-2026-0002", priority: "MEDIUM", status: "IN_PROGRESS", subject: "Reader not detecting specific tags", description: "Some pallet tags fail to read at dock door 2." },
      { code: "TKT-2026-0003", priority: "LOW", status: "NEW", subject: "Firmware upgrade scheduling request", description: "Customer asks for firmware upgrade window next week." },
      { code: "TKT-2026-0004", priority: "CRITICAL", status: "ESCALATED", subject: "Main gate completely offline", description: "Primary security gate is down during peak hours." },
      { code: "TKT-2026-0005", priority: "HIGH", status: "ASSIGNED", subject: "False alarm events at exit", description: "Exit gate raises false alarms for cleared items." },
    ] as const;

    for (const [i, customer] of customers.slice(0, 5).entries()) {
      const deviceProduct = i % 2 === 0 ? gate : reader;
      const serial = `${deviceProduct.sku === "RFID-GATE-300" ? "GX300" : "RX100"}-DEMO-${String(i + 1).padStart(3, "0")}`;
      const device = await prisma.device.upsert({
        where: { companyId_serialNumber: { companyId: company.id, serialNumber: serial } },
        create: {
          companyId: company.id,
          productId: deviceProduct.id,
          serialNumber: serial,
          type: deviceProduct.sku === "RFID-GATE-300" ? "GATE" : "READER",
          status: "INSTALLED",
          siteId: customer.siteId,
          location: `Zone ${i + 1}`,
          firmwareVersion: i % 2 === 0 ? "2.4.1" : "3.1.0",
          installedAt: new Date(Date.now() - (120 - i * 10) * 86400000),
        },
        update: {},
      });

      const ticket = ticketSpecs[i];
      if (ticket) {
        await prisma.ticket.upsert({
          where: { companyId_code: { companyId: company.id, code: ticket.code } },
          create: {
            companyId: company.id,
            code: ticket.code,
            subject: ticket.subject,
            description: ticket.description,
            priority: ticket.priority as never,
            status: ticket.status as never,
            customerId: customer.id,
            deviceId: device.id,
            assigneeId: susanId,
          },
          update: {},
        });
      }

      const amcCode = `AMC-2026-${String(i + 1).padStart(4, "0")}`;
      const amcEnd = new Date(Date.now() + (45 + i * 20) * 86400000);
      await prisma.amcContract.upsert({
        where: { companyId_code: { companyId: company.id, code: amcCode } },
        create: {
          companyId: company.id,
          code: amcCode,
          customerId: customer.id,
          startDate: new Date(Date.now() - (320 - i * 15) * 86400000),
          endDate: amcEnd,
          contractValue: 18000 + i * 2500,
          status: "ACTIVE",
          currency: "AED",
          devices: { create: [{ deviceId: device.id }] },
        },
        update: {},
      });
    }
  }

  console.log("\nSeed complete.");
  if (process.env.NODE_ENV !== "production") {
    console.log("Working logins:");
    console.log("  aneena.antony@ibtechintl.com / AneenaAntony@123  (Super Admin)");
    console.log(`  admin@ibtechintl.com / ${DEMO_PASSWORD}  (Super Admin)`);
    console.log(`  susan@ibtechintl.com / ${DEMO_PASSWORD}  (Sales Coordinator)`);
    console.log(`  jeremy@ibtechintl.com / ${DEMO_PASSWORD}  (Sales Manager)`);
    console.log(`  rakesh@ibtechintl.com / ${DEMO_PASSWORD}  (Delivery Person)`);
  }

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
