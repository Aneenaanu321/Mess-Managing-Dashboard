"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRegister } from "@/lib/auth";
import { getHomeHref } from "@/lib/nav-labels";
import { AuthError, AuthLink, AuthShell } from "@/components/AuthShell";

export default function SignupPage() {
  const router = useRouter();
  const register = useRegister();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await register.mutateAsync({ firstName, lastName, email, password });
      router.push(getHomeHref(result.permissions));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    }
  }

  const field =
    "block w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm text-white shadow-sm placeholder:text-slate-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-400/25";
  const label = "mb-1.5 block text-sm font-medium text-slate-200";

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join the ibTech sales workspace in a minute."
      footer={
        <>
          Already have an account? <AuthLink href="/login">Sign in</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className={label}>
              First name
            </label>
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
              className={field}
            />
          </div>
          <div>
            <label htmlFor="lastName" className={label}>
              Last name
            </label>
            <input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
              className={field}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={label}>
            Work email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@company.com"
            required
            className={field}
          />
        </div>

        <div>
          <label htmlFor="password" className={label}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Min. 8 chars, upper, lower, number"
              required
              className={`${field} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 transition-colors hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <AuthError message={error} />

        <button
          type="submit"
          disabled={register.isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(68,184,107,0.75)] transition hover:bg-brand-400 disabled:pointer-events-none disabled:opacity-60"
        >
          {register.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
