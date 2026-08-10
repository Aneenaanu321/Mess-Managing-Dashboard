"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui";

type AccountOverview = {
  customer: { id: string; name: string; code: string; email: string | null; phone: string | null } | null;
  openQuotations: number;
  openInvoices: number;
  activeProjects: number;
  openTickets: number;
  coordinator: { name: string; email: string } | null;
};

export default function PortalAccountPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["portal", "account"],
    queryFn: async () => (await apiClient.get<AccountOverview>("/portal/account")).data,
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (isError || !data) return <p className="text-sm text-red-600">Couldn’t load account overview.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-primary">Your account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Status overview and your sales coordinator contact.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-primary">{data.customer?.name ?? "Account"}</h2>
        <p className="mt-1 text-xs text-slate-500">{data.customer?.code}</p>
        {(data.customer?.email || data.customer?.phone) && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {[data.customer.email, data.customer.phone].filter(Boolean).join(" · ")}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Open quotations", value: data.openQuotations },
          { label: "Open invoices", value: data.openInvoices },
          { label: "Active projects", value: data.activeProjects },
          { label: "Open tickets", value: data.openTickets },
        ].map((tile) => (
          <Card key={tile.label} className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{tile.label}</p>
            <p className="mt-2 text-2xl font-semibold text-primary">{tile.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-primary">Your sales coordinator</h2>
        {data.coordinator ? (
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-medium text-primary">{data.coordinator.name}</p>
            <a className="text-brand-700 hover:underline dark:text-brand-400" href={`mailto:${data.coordinator.email}`}>
              {data.coordinator.email}
            </a>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Contact support if you need help with your account.</p>
        )}
      </Card>
    </div>
  );
}
