"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui";

const STORAGE_KEY = "rfidcore_onboarding_seen";

export function OnboardingTour() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== "1") setOpen(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[90] w-full max-w-sm rounded-2xl border border-slate-200 bg-surface p-5 shadow-soft dark:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Welcome to ibTech</p>
          <p className="mt-1 text-sm text-muted">
            Start with <Link href="/new-inquiries/new" className="font-medium text-brand-700 hover:underline dark:text-brand-400">a new inquiry</Link>, move it through the{" "}
            <Link href="/deal-board" className="font-medium text-brand-700 hover:underline dark:text-brand-400">deal board</Link>, and send an order. Press{" "}
            <kbd className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">g</kbd> then{" "}
            <kbd className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">l</kbd> to jump to new inquiries anytime.
          </p>
        </div>
        <button type="button" onClick={dismiss} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Dismiss welcome tour">
          <X size={16} />
        </button>
      </div>
      <Button size="sm" className="mt-4" onClick={dismiss}>
        Got it
      </Button>
    </div>
  );
}
