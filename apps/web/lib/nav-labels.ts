/** Canonical dashboard routes — URLs match sidebar tab names. */
export const ROUTES = {
  dashboard: "/dashboard",
  coordinator: "/coordinator",
  handoffs: "/handoffs",
  hygiene: "/sales-ops/hygiene",
  leads: "/new-inquiries",
  customers: "/customers",
  opportunities: "/active-deals",
  pipeline: "/deal-board",
  quotations: "/orders",
  approvals: "/pending-approvals",
  calendar: "/calendar",
  customerOrders: "/customer-orders",
  salesOrders: "/order-completed",
  inventory: "/products-stock",
  warehouse: "/stock-locations",
  procurement: "/purchase-orders",
  vendors: "/vendors",
  projects: "/customer-projects",
  installations: "/site-installations",
  devices: "/installed-equipment",
  tasks: "/team-tasks",
  fieldOps: "/field-ops",
  sopCompliance: "/sop-compliance",
  finance: "/invoices-payments",
  reports: "/reports",
  aiAssistant: "/sales-assistant",
  settings: "/settings",
  support: "/customer-support",
  amc: "/service-contracts",
  campaigns: "/campaigns",
} as const;

export type RouteKey = keyof typeof ROUTES;

/**
 * View permissions required to show a nav tab / open a page.
 * Multiple entries = OR (same as API `authorize(...)`).
 * UI-only — the API remains the real boundary.
 */
export const NAV_PERMISSIONS: Record<string, readonly string[]> = {
  [ROUTES.dashboard]: ["reports:view", "reports:executive"],
  [ROUTES.coordinator]: ["lead:view", "approval:view"],
  [ROUTES.leads]: ["lead:view"],
  [ROUTES.customers]: ["customer:view"],
  [ROUTES.opportunities]: ["opportunity:view"],
  [ROUTES.pipeline]: ["opportunity:view"],
  [ROUTES.quotations]: ["quotation:view"],
  [ROUTES.approvals]: ["approval:view"],
  [ROUTES.handoffs]: ["opportunity:view", "customer_po:view"],
  [ROUTES.calendar]: ["calendar:view"],
  [ROUTES.customerOrders]: ["customer_po:view"],
  [ROUTES.salesOrders]: ["sales_order:view"],
  [ROUTES.inventory]: ["inventory:view"],
  [ROUTES.warehouse]: ["inventory:view"],
  [ROUTES.procurement]: ["procurement:view"],
  [ROUTES.vendors]: ["procurement:view"],
  [ROUTES.projects]: ["project:view"],
  [ROUTES.installations]: ["project:view"],
  [ROUTES.devices]: ["device:view"],
  [ROUTES.tasks]: ["task:view"],
  [ROUTES.fieldOps]: ["task:view"],
  [ROUTES.sopCompliance]: ["reports:view", "lead:assign"],
  [ROUTES.finance]: ["finance:view"],
  [ROUTES.reports]: ["reports:view", "reports:executive"],
  [ROUTES.aiAssistant]: ["ai_assistant:use"],
  [ROUTES.settings]: ["settings:manage_org", "settings:manage_roles", "settings:manage_catalog", "lead:assign"],
  [ROUTES.hygiene]: ["lead:view", "customer:view"],
  [ROUTES.support]: ["support:view"],
  [ROUTES.amc]: ["amc:view"],
  [ROUTES.campaigns]: ["campaign:view"],
};

export const NAV_GROUPS = [
  {
    section: "Home",
    items: [{ href: ROUTES.dashboard, label: "Dashboard" }],
  },
  {
    section: "Sales",
    items: [
      { href: ROUTES.coordinator, label: "Coordinator" },
      { href: ROUTES.leads, label: "New Inquiries" },
      { href: ROUTES.customers, label: "Customers" },
      { href: ROUTES.opportunities, label: "Active Deals" },
      { href: ROUTES.pipeline, label: "Deal Board" },
      { href: ROUTES.quotations, label: "Orders" },
      { href: ROUTES.approvals, label: "Pending Approvals" },
      { href: ROUTES.handoffs, label: "Handoffs" },
      { href: ROUTES.calendar, label: "Calendar" },
    ],
  },
  {
    section: "Orders & Stock",
    items: [
      { href: ROUTES.customerOrders, label: "Customer Orders" },
      { href: ROUTES.salesOrders, label: "Order Completed" },
      { href: ROUTES.inventory, label: "Products & Stock" },
      { href: ROUTES.warehouse, label: "Stock Locations" },
      { href: ROUTES.procurement, label: "Purchase Orders" },
      { href: ROUTES.vendors, label: "Vendors" },
    ],
  },
  {
    section: "Projects & Field Work",
    items: [
      { href: ROUTES.projects, label: "Customer Projects" },
      { href: ROUTES.installations, label: "Site Installations" },
      { href: ROUTES.devices, label: "Installed Equipment" },
      { href: ROUTES.tasks, label: "Team Tasks" },
      { href: ROUTES.fieldOps, label: "Field Ops" },
      { href: ROUTES.sopCompliance, label: "SOP Compliance" },
    ],
  },
  {
    section: "Sales & Billing",
    items: [{ href: ROUTES.finance, label: "Invoices & Payments" }],
  },
  {
    section: "Reports & Tools",
    items: [
      { href: ROUTES.reports, label: "Reports" },
      { href: ROUTES.aiAssistant, label: "Sales Assistant" },
    ],
  },
  {
    section: "Admin",
    items: [{ href: ROUTES.settings, label: "Settings" }],
  },
] as const;

export function getNavPermissions(href: string): readonly string[] | undefined {
  const exact = NAV_PERMISSIONS[href];
  if (exact) return exact;
  // Match nested paths (e.g. /new-inquiries/abc → lead:view)
  const base = Object.keys(NAV_PERMISSIONS)
    .filter((route) => href === route || href.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];
  return base ? NAV_PERMISSIONS[base] : undefined;
}

/** UI-only: whether a route should appear / be used as a home landing for this permission set. */
export function canAccessNavHref(userPermissions: string[] | undefined, href: string): boolean {
  if (!userPermissions) return false;
  if (userPermissions.includes("*:*")) return true;
  const required = getNavPermissions(href);
  if (!required) return true;
  return required.some((permission) => userPermissions.includes(permission));
}

/** First sidebar tab the user can open — used after login and for the logo home link. */
export function getHomeHref(userPermissions: string[] | undefined): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (canAccessNavHref(userPermissions, item.href)) return item.href;
    }
  }
  return ROUTES.dashboard;
}

const HIDDEN_PAGE_LABELS: Record<string, string> = {
  [ROUTES.hygiene]: "Data Hygiene",
  [ROUTES.support]: "Customer Support",
  [ROUTES.amc]: "Service Contracts",
  [ROUTES.campaigns]: "Campaigns",
};

export const NEW_ITEM_LABELS: Record<string, string> = {
  [ROUTES.leads]: "New Inquiry",
  [ROUTES.customers]: "New Customer",
  [ROUTES.opportunities]: "New Deal",
  [ROUTES.quotations]: "New Order",
  [ROUTES.customerOrders]: "New Customer Order",
  [ROUTES.procurement]: "New Purchase Order",
  [ROUTES.projects]: "New Customer Project",
  [ROUTES.devices]: "New Equipment",
  [ROUTES.calendar]: "New Calendar Event",
  [ROUTES.finance]: "New Invoice",
  [ROUTES.tasks]: "Assign Team Task",
  [ROUTES.inventory]: "New Product",
  [ROUTES.support]: "New Support Ticket",
  [ROUTES.amc]: "New Service Contract",
  [ROUTES.campaigns]: "New Campaign",
};

export function getPageLabel(href: string): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href === href) return item.label;
    }
  }
  return HIDDEN_PAGE_LABELS[href] ?? href;
}

export function getSectionForPage(pathname: string): string | undefined {
  for (const group of NAV_GROUPS) {
    if (group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      return group.section;
    }
  }
}

export function getNewItemLabel(listHref: string): string {
  return NEW_ITEM_LABELS[listHref] ?? `New ${getPageLabel(listHref)}`;
}

export function getQuickActionLabel(listHref: string): string {
  return NEW_ITEM_LABELS[listHref] ?? getPageLabel(listHref);
}
