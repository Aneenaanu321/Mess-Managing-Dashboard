"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useLeads } from "@/lib/leads";
import { useCustomers } from "@/lib/customers";
import { useOpportunities } from "@/lib/opportunities";
import { getPageLabel } from "@/lib/nav-labels";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: leadsData } = useLeads({ search: query || undefined, page: 1 });
  const { data: customersData } = useCustomers({ search: query || undefined, pageSize: 5 });
  const { data: opportunitiesData } = useOpportunities({ search: query || undefined, pageSize: 5 });

  const leads = query.length >= 2 ? (leadsData?.data ?? []).slice(0, 5) : [];
  const customers = query.length >= 2 ? (customersData?.data ?? []).slice(0, 5) : [];
  const opportunities = query.length >= 2 ? (opportunitiesData?.data ?? []).slice(0, 5) : [];
  const hasResults = leads.length + customers.length + opportunities.length > 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={ref} className="relative hidden flex-1 max-w-md lg:block">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={`Search ${getPageLabel("/new-inquiries").toLowerCase()}, ${getPageLabel("/customers").toLowerCase()}, ${getPageLabel("/active-deals").toLowerCase()}…`}
        aria-label="Global search"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-primary placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500"
      />
      {open && query.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-soft dark:border-slate-700">
          {!hasResults && <p className="p-4 text-sm text-muted">No results for &ldquo;{query}&rdquo;</p>}
          {leads.length > 0 && (
            <div className="border-b border-slate-100 p-2 dark:border-slate-700">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{getPageLabel("/new-inquiries")}</p>
              {leads.map((l) => (
                <button key={l.id} type="button" className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => navigate(`/new-inquiries/${l.id}`)}>
                  <span className="font-medium text-primary">{l.companyName}</span>
                  <span className="ml-2 text-xs text-muted">{l.code}</span>
                </button>
              ))}
            </div>
          )}
          {customers.length > 0 && (
            <div className="border-b border-slate-100 p-2 dark:border-slate-700">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{getPageLabel("/customers")}</p>
              {customers.map((c) => (
                <button key={c.id} type="button" className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => navigate(`/customers/${c.id}`)}>
                  <span className="font-medium text-primary">{c.name}</span>
                  <span className="ml-2 text-xs text-muted">{c.code}</span>
                </button>
              ))}
            </div>
          )}
          {opportunities.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{getPageLabel("/active-deals")}</p>
              {opportunities.map((o) => (
                <button key={o.id} type="button" className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => navigate(`/active-deals/${o.id}`)}>
                  <span className="font-medium text-primary">{o.title}</span>
                  <span className="ml-2 text-xs text-muted">{o.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
