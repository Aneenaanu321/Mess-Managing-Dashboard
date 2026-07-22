"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Button } from "@/components/ui";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type DialogState = ConfirmOptions & { open: true };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDialog({ ...options, open: true });
    });
  }, []);

  function close(result: boolean) {
    setDialog(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] dark:bg-black/60"
            aria-label="Close dialog"
            onClick={() => close(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {dialog.title}
            </h2>
            <p id="confirm-dialog-message" className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {dialog.message}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => close(false)}>
                {dialog.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant={dialog.variant === "danger" ? "danger" : "primary"}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx.confirm;
}
