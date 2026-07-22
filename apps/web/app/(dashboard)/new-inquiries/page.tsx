"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, Plus, Search, Upload, UserPlus } from "lucide-react";
import {
  useLeads,
  useAssignableLeadOwners,
  useBulkAssignLeads,
  STATUS_TONE,
  Lead,
} from "@/lib/leads";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select } from "@/components/ui";
import { downloadCsv } from "@/lib/csv";
import { LeadImportModal } from "@/components/LeadImportModal";
import { ListPageLayout } from "@/components/ListPageLayout";
import { toast } from "@/lib/toast";
import { getNewItemLabel, getPageLabel, getSectionForPage } from "@/lib/nav-labels";

const STATUS_OPTIONS = ["", "NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED", "CONVERTED"];

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const { data: user } = useCurrentUser();
  const unassigned = searchParams.get("unassigned") === "1";
  const slaBreached = searchParams.get("slaBreached") === "1";

  const { data, isLoading, isError } = useLeads({
    status: status || undefined,
    search: search || undefined,
    unassigned: unassigned || undefined,
    slaBreached: slaBreached || undefined,
  });
  const { data: owners } = useAssignableLeadOwners();
  const bulkAssign = useBulkAssignLeads();

  const leads = data?.data ?? [];
  const selectedLeads = leads.filter((l) => selected.has(l.id));
  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;
  const canAssign = hasPermission(user, "lead:assign");

  const slaHoursHint = useMemo(() => {
    if (slaBreached) return "Showing leads past response SLA (no first contact).";
    if (unassigned) return "Showing unassigned leads only.";
    return `${data?.meta?.total ?? 0} total ${getPageLabel("/new-inquiries").toLowerCase()} in your pipeline`;
  }, [slaBreached, unassigned, data?.meta?.total]);

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

  async function handleBulkAssign(mode: "single" | "round_robin") {
    if (selectedLeads.length === 0) return;
    if (mode === "single" && !assignOwnerId) {
      toast.error("Pick an owner first");
      return;
    }
    await bulkAssign.mutateAsync({
      leadIds: selectedLeads.map((l) => l.id),
      ownerId: mode === "single" ? assignOwnerId : undefined,
      mode,
    });
    setSelected(new Set());
  }

  return (
    <>
      {showImport && <LeadImportModal onClose={() => setShowImport(false)} />}
      <ListPageLayout
        eyebrow={getSectionForPage("/new-inquiries")}
        title={getPageLabel("/new-inquiries")}
        description={slaHoursHint}
        actions={
          <>
            {canAssign && selectedLeads.length > 0 && (
              <>
                <Select value={assignOwnerId} onChange={(e) => setAssignOwnerId(e.target.value)} className="w-44">
                  <option value="">Assign to…</option>
                  {(owners ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.firstName} {o.lastName}
                    </option>
                  ))}
                </Select>
                <Button variant="secondary" onClick={() => handleBulkAssign("single")} disabled={bulkAssign.isPending}>
                  <UserPlus size={16} />
                  Assign ({selectedLeads.length})
                </Button>
                <Button variant="secondary" onClick={() => handleBulkAssign("round_robin")} disabled={bulkAssign.isPending}>
                  Round-robin
                </Button>
              </>
            )}
            {selectedLeads.length > 0 && (
              <Button variant="secondary" onClick={() => exportRows(selectedLeads)}>
                <Download size={16} />
                Export selected
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
              <Link href="/new-inquiries/new">
                <Button>
                  <Plus size={16} />
                  {getNewItemLabel("/new-inquiries")}
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
            {(unassigned || slaBreached) && (
              <Link href="/new-inquiries" className="text-sm text-brand-700 hover:underline dark:text-brand-400">
                Clear queue filter
              </Link>
            )}
          </>
        }
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && !isError && leads.length === 0}
        emptyTitle="No leads match these filters"
        emptyDescription="Try another search, or create a new lead to get started."
        emptyActionLabel={hasPermission(user, "lead:create") ? getNewItemLabel("/new-inquiries") : undefined}
        emptyActionHref={hasPermission(user, "lead:create") ? "/new-inquiries/new" : undefined}
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
                <th className="px-4 py-3">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {leads.map((lead: Lead) => {
                const ageH = (Date.now() - new Date(lead.createdAt).getTime()) / 36e5;
                const slaRisk =
                  !lead.firstContactedAt && ["NEW", "CONTACTED"].includes(lead.status) && ageH >= 24;
                return (
                  <tr key={lead.id} className="transition-colors hover:bg-brand-50/40 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleOne(lead.id)}
                        aria-label={`Select ${lead.companyName}`}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/new-inquiries/${lead.id}`}
                        className="font-semibold text-brand-700 hover:text-brand-800 hover:underline dark:text-brand-400"
                      >
                        {lead.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-primary">{lead.companyName}</td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{lead.contactName}</td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{lead.source.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{lead.industry}</td>
                    <td className="px-4 py-3.5">{lead.score}</td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                      {lead.owner ? `${lead.owner.firstName} ${lead.owner.lastName}` : <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={STATUS_TONE[lead.status]}>{lead.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      {slaRisk ? <Badge tone="red">Over 24h</Badge> : <span className="text-slate-400">OK</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ListPageLayout>
    </>
  );
}
