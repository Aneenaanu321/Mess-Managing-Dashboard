"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Plus, Search, Upload } from "lucide-react";
import { useLeads, STATUS_TONE, Lead } from "@/lib/leads";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select } from "@/components/ui";
import { downloadCsv } from "@/lib/csv";
import { LeadImportModal } from "@/components/LeadImportModal";
import { ListPageLayout } from "@/components/ListPageLayout";
import { toast } from "@/lib/toast";

const STATUS_OPTIONS = ["", "NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED", "CONVERTED"];

export default function LeadsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useLeads({ status: status || undefined, search: search || undefined });

  const leads = data?.data ?? [];
  const selectedLeads = leads.filter((l) => selected.has(l.id));
  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(leads.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportRows(rows: Lead[]) {
    downloadCsv(
      "leads",
      rows.map((l) => ({
        code: l.code,
        companyName: l.companyName,
        contactName: l.contactName,
        email: l.email ?? "",
        phone: l.phone ?? "",
        source: l.source,
        industry: l.industry,
        score: l.score,
        owner: l.owner ? `${l.owner.firstName} ${l.owner.lastName}` : "",
        status: l.status,
      })),
      [
        { key: "code", label: "Code" },
        { key: "companyName", label: "Company" },
        { key: "contactName", label: "Contact" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "source", label: "Source" },
        { key: "industry", label: "Industry" },
        { key: "score", label: "Score" },
        { key: "owner", label: "Owner" },
        { key: "status", label: "Status" },
      ],
    );
    toast.success(`Exported ${rows.length} lead${rows.length === 1 ? "" : "s"}`);
  }

  return (
    <>
      {showImport && <LeadImportModal onClose={() => setShowImport(false)} />}
      <ListPageLayout
      eyebrow="Sales"
      title="Leads"
      description={`${data?.meta?.total ?? 0} total lead${data?.meta?.total === 1 ? "" : "s"} in your pipeline`}
      actions={
        <>
          {selectedLeads.length > 0 && (
            <Button variant="secondary" onClick={() => exportRows(selectedLeads)}>
              <Download size={16} />
              Export selected ({selectedLeads.length})
            </Button>
          )}
          {leads.length > 0 && selectedLeads.length === 0 && (
            <Button variant="secondary" onClick={() => exportRows(leads)}>
              <Download size={16} />
              Export CSV
            </Button>
          )}
          {hasPermission(user, "lead:create") && (
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              <Upload size={16} />
              Bulk Import
            </Button>
          )}
          {hasPermission(user, "lead:create") && (
            <Link href="/leads/new">
              <Button>
                <Plus size={16} />
                New Lead
              </Button>
            </Link>
          )}
        </>
      }
      filters={
        <>
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input
              placeholder="Search company, contact, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-44">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s || "All statuses"}
              </option>
            ))}
          </Select>
        </>
      }
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && !isError && leads.length === 0}
      emptyTitle="No leads match these filters"
      emptyDescription="Try another search, or create a new lead to get started."
      emptyActionLabel={hasPermission(user, "lead:create") ? "New Lead" : undefined}
      emptyActionHref={hasPermission(user, "lead:create") ? "/leads/new" : undefined}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all leads" />
              </th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {leads.map((lead: Lead) => (
              <tr key={lead.id} className="transition-colors hover:bg-brand-50/40 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3.5">
                  <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} aria-label={`Select ${lead.companyName}`} />
                </td>
                <td className="px-4 py-3.5">
                  <Link href={`/leads/${lead.id}`} className="font-semibold text-brand-700 hover:text-brand-800 hover:underline dark:text-brand-400">
                    {lead.code}
                  </Link>
                </td>
                <td className="px-4 py-3.5 font-medium text-primary">{lead.companyName}</td>
                <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{lead.contactName}</td>
                <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{lead.source.replaceAll("_", " ")}</td>
                <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{lead.industry}</td>
                <td className="px-4 py-3.5">
                  <span
                    className={
                      lead.score >= 70
                        ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "text-slate-600 dark:text-slate-400"
                    }
                  >
                    {lead.score}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                  {lead.owner ? `${lead.owner.firstName} ${lead.owner.lastName}` : <span className="text-slate-400">Unassigned</span>}
                </td>
                <td className="px-4 py-3.5">
                  <Badge tone={STATUS_TONE[lead.status]}>{lead.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListPageLayout>
    </>
  );
}
