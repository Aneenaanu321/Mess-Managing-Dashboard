"use client";

import { Bell, Building2, ChevronDown, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCurrentUser, useLogout, useUpdateEmailNotifications } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { NotificationBell } from "@/components/NotificationBell";
import { useTheme } from "@/lib/ThemeProvider";

type TopbarProps = {
  sidebarOpen: boolean;
  onMenuClick: () => void;
};

export function Topbar({ sidebarOpen, onMenuClick }: TopbarProps) {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const updateEmailNotifications = useUpdateEmailNotifications();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    await logout.mutateAsync();
    router.push("/login");
  }

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/90">
      {!sidebarOpen && (
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden"
          aria-label="Open menu"
          aria-expanded={false}
        >
          <Menu size={20} />
        </button>
      )}

      {user?.company && (
        <div
          className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 md:flex dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          title="Multi-branch/multi-company switching is a Settings feature planned for a later pass — this shows your assigned context."
        >
          <Building2 size={13} className="text-slate-400" />
          <span className="text-slate-800 dark:text-slate-100">{user.company.name}</span>
          {user.branch && (
            <>
              <span className="text-slate-300">/</span>
              <span>{user.branch.name}</span>
            </>
          )}
          <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600">
            {user.company.currency}
          </span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <NotificationBell />

        {user && (
          <div className="relative ml-1 border-l border-slate-200 pl-2 dark:border-slate-700 sm:pl-3" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2.5 rounded-2xl py-1 pl-1 pr-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold tracking-wide text-white shadow-sm ring-2 ring-brand-100">
                {initials}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-100">
                  {user.firstName} {user.lastName}
                </p>
                <p className="mt-1 text-xs leading-none text-slate-500">{user.role.name}</p>
              </div>
              <ChevronDown
                size={14}
                className={`hidden text-slate-400 transition-transform sm:block ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-soft dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="border-b border-slate-100 px-3.5 py-3 sm:hidden">
                  <p className="text-sm font-semibold text-slate-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{user.role.name}</p>
                </div>
                <div className="px-3.5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Signed in as</p>
                  <p className="mt-1 truncate text-sm text-slate-700">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateEmailNotifications.mutate(!user.emailNotifications)}
                  disabled={updateEmailNotifications.isPending}
                  className="flex w-full items-center justify-between border-t border-slate-100 px-3.5 py-2.5 text-left text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  <span className="flex items-center gap-2">
                    <Bell size={14} className="text-slate-400" />
                    Email notifications
                  </span>
                  <span
                    className={`relative h-5 w-9 rounded-full transition-colors ${user.emailNotifications ? "bg-brand-600" : "bg-slate-200"}`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${user.emailNotifications ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </span>
                </button>
                <div className="border-t border-slate-100 p-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    disabled={logout.isPending}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                  >
                    <LogOut size={15} />
                    {logout.isPending ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
