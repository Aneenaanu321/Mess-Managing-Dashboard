import ExcelJS from "exceljs";
import { prisma } from "../../config/prisma";

function sheet(wb: ExcelJS.Workbook, name: string, columns: string[], rows: Record<string, unknown>[]) {
  const ws = wb.addWorksheet(name.slice(0, 31));
  ws.columns = columns.map((key) => ({ header: key, key, width: Math.min(28, Math.max(12, key.length + 2)) }));
  for (const row of rows) {
    ws.addRow(row);
  }
  ws.getRow(1).font = { bold: true };
}

function money(value: unknown) {
  if (value == null) return "";
  return Number(value);
}

function iso(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString();
}

/** Full company workbook for client backup / offline processing. */
export async function buildCompanyDataWorkbook(companyId: string): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ibTech Sales Operations";
  wb.created = new Date();

  const [
    company,
    users,
    customers,
    leads,
    opportunities,
    quotations,
    customerPos,
    salesOrders,
    invoices,
    products,
    warehouses,
    tasks,
    projects,
    tickets,
  ] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      include: { branches: true },
    }),
    prisma.user.findMany({
      where: { companyId },
      include: { role: true, branch: true },
      orderBy: { email: "asc" },
    }),
    prisma.customer.findMany({
      where: { companyId },
      include: { contacts: true },
      orderBy: { code: "asc" },
    }),
    prisma.lead.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
    prisma.opportunity.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
    prisma.quotation.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
    prisma.customerPO.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
    prisma.salesOrder.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
    prisma.invoice.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ where: { companyId }, orderBy: { sku: "asc" } }),
    prisma.warehouse.findMany({
      where: { companyId },
      include: { stockItems: { include: { product: true } } },
    }),
    prisma.engineerTask.findMany({
      where: { companyId },
      include: { assignee: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
    prisma.ticket.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
  ]);

  sheet(wb, "Company", ["name", "legalName", "taxId", "currency", "timezone"], [
    {
      name: company?.name ?? "",
      legalName: company?.legalName ?? "",
      taxId: company?.taxId ?? "",
      currency: company?.currency ?? "",
      timezone: company?.timezone ?? "",
    },
  ]);

  sheet(
    wb,
    "Branches",
    ["code", "name", "city", "country"],
    (company?.branches ?? []).map((b) => ({
      code: b.code,
      name: b.name,
      city: b.city ?? "",
      country: b.country ?? "",
    })),
  );

  sheet(
    wb,
    "Users",
    ["email", "firstName", "lastName", "role", "branch", "status", "lastLoginAt"],
    users.map((u) => ({
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role.name,
      branch: u.branch?.name ?? "",
      status: u.status,
      lastLoginAt: iso(u.lastLoginAt),
    })),
  );

  sheet(
    wb,
    "Customers",
    ["code", "name", "industry", "website", "primaryContact", "email", "phone"],
    customers.map((c) => {
      const contact = c.contacts[0];
      return {
        code: c.code,
        name: c.name,
        industry: c.industry ?? "",
        website: c.website ?? "",
        primaryContact: contact ? `${contact.firstName} ${contact.lastName}` : "",
        email: contact?.email ?? "",
        phone: contact?.phone ?? "",
      };
    }),
  );

  sheet(
    wb,
    "Leads",
    ["code", "companyName", "contactName", "email", "phone", "source", "status", "score", "createdAt"],
    leads.map((l) => ({
      code: l.code,
      companyName: l.companyName,
      contactName: l.contactName,
      email: l.email ?? "",
      phone: l.phone ?? "",
      source: l.source,
      status: l.status,
      score: l.score ?? "",
      createdAt: iso(l.createdAt),
    })),
  );

  sheet(
    wb,
    "Opportunities",
    ["code", "title", "stage", "estimatedValue", "currency", "createdAt", "wonAt", "lostAt"],
    opportunities.map((o) => ({
      code: o.code,
      title: o.title,
      stage: o.stage,
      estimatedValue: money(o.estimatedValue),
      currency: o.currency,
      createdAt: iso(o.createdAt),
      wonAt: iso(o.wonAt),
      lostAt: iso(o.lostAt),
    })),
  );

  sheet(
    wb,
    "Quotations",
    ["code", "status", "grandTotal", "currency", "version", "sentAt", "createdAt"],
    quotations.map((q) => ({
      code: q.code,
      status: q.status,
      grandTotal: money(q.grandTotal),
      currency: q.currency,
      version: q.version,
      sentAt: iso(q.sentAt),
      createdAt: iso(q.createdAt),
    })),
  );

  sheet(
    wb,
    "CustomerPOs",
    ["code", "poNumber", "amount", "currency", "status", "createdAt"],
    customerPos.map((p) => ({
      code: p.code,
      poNumber: p.poNumber,
      amount: money(p.amount),
      currency: p.currency,
      status: p.status,
      createdAt: iso(p.createdAt),
    })),
  );

  sheet(
    wb,
    "SalesOrders",
    ["code", "status", "totalAmount", "currency", "createdAt"],
    salesOrders.map((s) => ({
      code: s.code,
      status: s.status,
      totalAmount: money(s.totalAmount),
      currency: s.currency,
      createdAt: iso(s.createdAt),
    })),
  );

  sheet(
    wb,
    "Invoices",
    ["code", "status", "totalAmount", "amountPaid", "currency", "dueDate", "createdAt"],
    invoices.map((i) => ({
      code: i.code,
      status: i.status,
      totalAmount: money(i.totalAmount),
      amountPaid: money(i.amountPaid),
      currency: i.currency,
      dueDate: iso(i.dueDate),
      createdAt: iso(i.createdAt),
    })),
  );

  sheet(
    wb,
    "Products",
    ["sku", "name", "category", "basePrice", "costPrice", "unit", "isActive"],
    products.map((p) => ({
      sku: p.sku,
      name: p.name,
      category: p.category,
      basePrice: money(p.basePrice),
      costPrice: money(p.costPrice),
      unit: p.unit,
      isActive: p.isActive,
    })),
  );

  const stockRows: Record<string, unknown>[] = [];
  for (const wh of warehouses) {
    for (const item of wh.stockItems) {
      stockRows.push({
        warehouse: wh.name,
        sku: item.product.sku,
        product: item.product.name,
        onHand: money(item.onHandQty),
        reserved: money(item.reservedQty),
      });
    }
  }
  sheet(wb, "Stock", ["warehouse", "sku", "product", "onHand", "reserved"], stockRows);

  sheet(
    wb,
    "FieldJobs",
    ["title", "jobType", "status", "assignee", "dueDate", "submittedAt", "completedAt"],
    tasks.map((t) => ({
      title: t.title,
      jobType: t.jobType,
      status: t.status,
      assignee: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "",
      dueDate: iso(t.dueDate),
      submittedAt: iso(t.submittedAt),
      completedAt: iso(t.completedAt),
    })),
  );

  sheet(
    wb,
    "Projects",
    ["code", "name", "status", "createdAt"],
    projects.map((p) => ({
      code: p.code,
      name: p.name,
      status: p.status,
      createdAt: iso(p.createdAt),
    })),
  );

  sheet(
    wb,
    "SupportTickets",
    ["code", "subject", "priority", "status", "createdAt", "resolvedAt"],
    tickets.map((t) => ({
      code: t.code,
      subject: t.subject,
      priority: t.priority,
      status: t.status,
      createdAt: iso(t.createdAt),
      resolvedAt: iso(t.resolvedAt),
    })),
  );

  return wb.xlsx.writeBuffer();
}
