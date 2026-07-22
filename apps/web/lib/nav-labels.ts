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
  finance: "/invoices-payments",
  reports: "/reports",
  aiAssistant: "/sales-assistant",
  settings: "/settings",
  support: "/customer-support",
  amc: "/service-contracts",
  campaigns: "/campaigns",
} as const;

export type RouteKey = keyof typeof ROUTES;

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
      { href: ROUTES.hygiene, label: "Data Hygiene" },
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

const HIDDEN_PAGE_LABELS: Record<string, string> = {
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
