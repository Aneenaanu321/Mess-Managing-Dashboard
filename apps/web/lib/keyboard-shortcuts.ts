"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth";
import { canAccessNavHref } from "@/lib/nav-labels";

const SHORTCUTS: Record<string, string> = {
  l: "/new-inquiries",
  c: "/customers",
  o: "/active-deals",
  q: "/orders",
  d: "/dashboard",
  p: "/deal-board",
  r: "/reports",
  s: "/settings",
};

export function useKeyboardShortcuts() {
  const router = useRouter();
  const { data: user } = useCurrentUser();

  useEffect(() => {
    let pendingG = false;

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT" || target?.isContentEditable) {
        return;
      }

      if (e.key === "g") {
        pendingG = true;
        window.setTimeout(() => {
          pendingG = false;
        }, 1000);
        return;
      }

      if (pendingG) {
        const path = SHORTCUTS[e.key];
        if (path && canAccessNavHref(user?.permissions, path)) {
          e.preventDefault();
          pendingG = false;
          router.push(path);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, user]);
}
