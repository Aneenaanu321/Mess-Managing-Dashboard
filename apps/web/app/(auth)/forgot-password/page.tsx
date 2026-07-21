"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useForgotPassword } from "@/lib/auth";
import { AuthError, AuthLink, AuthShell, AuthSuccess } from "@/components/AuthShell";

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setResetUrl(null);
    try {
      const result = await forgot.mutateAsync({ email });
      setMessage(result.message);
      setResetUrl(result.resetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset link");
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we’ll send a reset link."
      footer={
        <>
          Remembered it? <AuthLink href="/login">Back to sign in</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-200">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@company.com"
            required
            className="block w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm text-white shadow-sm placeholder:text-slate-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/25"
          />
        </div>

        <AuthError message={error} />
        <AuthSuccess message={message} />

        {resetUrl && (
          <p className="rounded-xl border border-brand-400/30 bg-brand-500/15 px-3.5 py-2.5 text-sm text-brand-100">
            Dev reset link:{" "}
            <Link href={resetUrl} className="font-semibold underline underline-offset-2">
              Reset password
            </Link>
          </p>
        )}

        <button
          type="submit"
          disabled={forgot.isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(68,184,107,0.75)] transition hover:bg-brand-400 disabled:pointer-events-none disabled:opacity-60"
        >
          {forgot.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sending...
            </>
          ) : (
            "Send reset link"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
