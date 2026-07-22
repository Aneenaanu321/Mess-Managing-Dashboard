"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Users,
  Building2,
  Target,
  Kanban,
  FileText,
  ShoppingCart,
  ClipboardCheck,
  Package,
  Warehouse,
  Truck,
  Handshake,
  FolderKanban,
  Wrench,
  Cpu,
  ListChecks,
  Receipt,
  LifeBuoy,
  ShieldCheck,
  BarChart3,
  Sparkles,
  Settings,
  Menu,
  Megaphone,
  CalendarDays,
  CheckSquare,
} from "lucide-react";

const NAV = [
  { section: "Overview", items: [{ href: "/dashboard", label: "Executive Dashboard", icon: LayoutDashboard }] },
  {
    section: "Sales",
    items: [
      { href: "/leads", label: "Leads", icon: Users },
      { href: "/customers", label: "Customers", icon: Building2 },
      { href: "/opportunities", label: "Opportunities", icon: Target },
      { href: "/pipeline", label: "Pipeline", icon: Kanban },
      { href: "/quotations", label: "Quotations", icon: FileText },
      { href: "/approvals", label: "Approvals", icon: CheckSquare },
      { href: "/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    section: "Fulfillment",
    items: [
      { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
      { href: "/sales-orders", label: "Sales Orders", icon: ClipboardCheck },
      { href: "/inventory", label: "Inventory & Catalog", icon: Package },
      { href: "/warehouse", label: "Warehouse", icon: Warehouse },
      { href: "/procurement", label: "Procurement", icon: Truck },
      { href: "/vendors", label: "Vendors", icon: Handshake },
    ],
  },
  {
    section: "Delivery",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/installations", label: "Installations", icon: Wrench },
      { href: "/devices", label: "Devices", icon: Cpu },
      { href: "/tasks", label: "Engineer Tasks", icon: ListChecks },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/finance", label: "Finance", icon: Receipt },
      { href: "/support", label: "Support Tickets", icon: LifeBuoy },
      { href: "/amc", label: "AMC & Contracts", icon: ShieldCheck },
    ],
  },
  {
    section: "Insights",
    items: [
      { href: "/reports", label: "Reports & Analytics", icon: BarChart3 },
      { href: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
    ],
  },
  { section: "System", items: [{ href: "/settings", label: "Settings", icon: Settings }] },
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
};

export function Sidebar({ open, onClose, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = useState(false);
  const collapsed = !open && isDesktop;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    function onChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function closeIfMobile() {
    if (window.matchMedia("(max-width: 1023px)").matches) onClose();
  }

  useEffect(() => {
    if (!open || isDesktop) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, isDesktop]);

  return (
    <>
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-slate-200/80 bg-white transition-[width,transform] duration-200 ease-out dark:border-slate-700/80 dark:bg-slate-900 lg:static lg:z-auto",
          open ? "w-[17rem] translate-x-0" : "-translate-x-full w-[17rem] lg:translate-x-0 lg:w-[4.5rem]",
        )}
        aria-hidden={!open && !isDesktop}
      >
        <div
          className={clsx(
            "flex items-start border-b border-slate-200/80 dark:border-slate-700/80",
            collapsed ? "h-16 items-center justify-center px-2" : "gap-2 px-4 py-3",
          )}
        >
          {!collapsed && (
            <Link
              href="/leads"
              className="min-w-0 flex-1"
              aria-label="ibTech home"
              onClick={closeIfMobile}
            >
              <Image src="/ibtech-logo.png" alt="ibTech" width={140} height={49} className="h-8 w-auto" priority />
              <p className="mt-1.5 text-[11px] font-medium leading-snug tracking-wide text-slate-500 dark:text-slate-400">
                Sales Operations Dashboard
              </p>
            </Link>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={open ? "Collapse menu" : "Expand menu"}
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className={clsx("flex-1 overflow-y-auto", collapsed ? "space-y-2 p-2" : "space-y-5 p-3")}>
          {NAV.map((group) => (
            <div key={group.section}>
              {!collapsed && (
                <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {group.section}
                </p>
              )}
              {collapsed && group.section !== "Overview" && (
                <div className="mx-auto mb-2 h-px w-6 bg-slate-200 dark:bg-slate-700" aria-hidden />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeIfMobile}
                      title={item.label}
                      aria-label={item.label}
                      className={clsx(
                        "group flex items-center rounded-xl text-sm font-medium transition-colors",
                        collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-2.5 py-2",
                        active
                          ? "bg-brand-50 text-brand-800 shadow-sm ring-1 ring-brand-100 dark:bg-brand-900/30 dark:text-brand-200 dark:ring-brand-800"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                      )}
                    >
                      <Icon
                        size={collapsed ? 18 : 16}
                        className={clsx(active ? "text-brand-700" : "text-slate-400 group-hover:text-slate-600")}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
