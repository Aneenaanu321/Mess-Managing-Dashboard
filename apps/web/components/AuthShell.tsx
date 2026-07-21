"use client";

import Image from "next/image";
import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      {/* Full-bleed atmosphere — ibTech green (ibtechintl.com) */}
      <div className="pointer-events-none absolute inset-0 auth-sheen bg-[linear-gradient(135deg,#0a1f14_0%,#0b1220_42%,#123528_100%)]" />
      <div className="pointer-events-none absolute -left-32 top-[-10%] h-[28rem] w-[28rem] rounded-full bg-[#44b86b]/30 blur-[100px] auth-orb" />
      <div className="pointer-events-none absolute -right-24 bottom-[-15%] h-[32rem] w-[32rem] rounded-full bg-[#48bb78]/20 blur-[110px] auth-orb-delayed" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/35 to-transparent" />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="mb-8 text-center auth-fade-in">
          <Link href="/login" className="inline-flex flex-col items-center gap-3" aria-label="ibTech home">
            <Image
              src="/ibtech-logo-dark.png"
              alt="ibTech"
              width={240}
              height={84}
              className="h-14 w-auto drop-shadow-[0_8px_24px_rgba(68,184,107,0.35)]"
              priority
            />
            <p className="font-display text-[13px] font-medium tracking-[0.04em] text-[#b7debd]/90">
              Sales Operation Managing Dashboard
            </p>
          </Link>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.07] p-7 shadow-[0_30px_80px_-28px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-8 auth-rise">
          <div className="mb-7 text-center">
            <h1 className="font-display text-[1.7rem] font-semibold tracking-tight text-white sm:text-[1.85rem]">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-slate-300/90">{subtitle}</p>}
          </div>
          <div className="auth-form-dark">{children}</div>
        </div>

        {footer && (
          <div className="mt-7 text-center text-sm text-slate-300/80 auth-rise-delayed">{footer}</div>
        )}
      </div>
    </main>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-red-400/30 bg-red-500/15 px-3.5 py-2.5 text-sm text-red-100" role="alert">
      {message}
    </p>
  );
}

export function AuthSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3.5 py-2.5 text-sm text-emerald-100"
      role="status"
    >
      {message}
    </p>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-[#7ddea0] transition-colors hover:text-[#b7debd]">
      {children}
    </Link>
  );
}
