"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { FileText, ShoppingCart, FolderKanban, Receipt, LifeBuoy, LogOut } from "lucide-react";
import { useCurrentUser, useLogout } from "@/lib/auth";

const NAV = [
  { href: "/portal/quotations", label: "Quotations", icon: FileText },
  { href: "/portal/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { href: "/portal/projects", label: "Projects", icon: FolderKanban },
  { href: "/portal/invoices", label: "Invoices", icon: Receipt },
  { href: "/portal/support", label: "Support", icon: LifeBuoy },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !user) {
      router.replace("/login");
    } else if (!user.portalCustomer) {
      // An internal-staff account has no portal data to see — send it back
      // to the real app instead of an empty portal shell.
      router.replace("/dashboard");
    }
  }, [isLoading, isError, user, router]);

  if (isLoading || !user?.portalCustomer) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  }

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-800/50">
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-700 bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Link href="/portal/quotations" className="flex items-center">
            <Image src="/ibtech-logo.png" alt="ibTech" width={120} height={42} className="h-7 w-auto" priority />
          </Link>
          <span className="hidden text-sm text-slate-400 sm:block">Customer Portal</span>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-primary">{user.portalCustomer.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-primary",
                )}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
