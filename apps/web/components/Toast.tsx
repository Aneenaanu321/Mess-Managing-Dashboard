"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import clsx from "clsx";
import { dismiss, subscribe, type ToastMessage } from "@/lib/toast";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const TONES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200",
  error: "border-red-200 bg-red-50 dark:bg-red-950/40 text-red-900 dark:border-red-800 dark:bg-red-950/80 dark:text-red-200",
  info: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/80 dark:text-sky-200",
};

export function ToastContainer() {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => subscribe(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2" aria-live="polite">
      {items.map((item) => {
        const Icon = ICONS[item.type];
        return (
          <div
            key={item.id}
            className={clsx(
              "pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg",
              TONES[item.type],
            )}
            role="status"
          >
            <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
            <p className="flex-1 font-medium">{item.message}</p>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
