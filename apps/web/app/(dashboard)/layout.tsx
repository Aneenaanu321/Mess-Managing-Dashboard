"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth";
import { useKeyboardShortcuts } from "@/lib/keyboard-shortcuts";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { OnboardingTour } from "@/components/OnboardingTour";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useCurrentUser();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), []);
  useKeyboardShortcuts();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !user) {
      router.replace("/login");
    } else if (user.portalCustomer) {
      // A portal account has no permissions on any internal route — send it
      // to its own section instead of letting it land on a page that'll
      // just 403 on every request.
      router.replace("/portal");
    }
  }, [isLoading, isError, user, router]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setSidebarOpen(mq.matches);

    function onChange(e: MediaQueryListEvent) {
      setSidebarOpen(e.matches);
    }

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!sidebarOpen || window.matchMedia("(min-width: 1024px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sidebarOpen]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  }

  if (!user || user.portalCustomer) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} onToggle={toggleSidebar} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar sidebarOpen={sidebarOpen} onMenuClick={toggleSidebar} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
          <OnboardingTour />
        </main>
      </div>
    </div>
  );
}
