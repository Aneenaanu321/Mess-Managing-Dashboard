"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCampaign } from "@/lib/campaigns";
import { Badge, Card } from "@/components/ui";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: campaign, isLoading } = useCampaign(params.id);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!campaign) return <p className="text-sm text-slate-500">Campaign not found.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <p className="text-xs font-medium text-slate-400">{campaign.channel}</p>
        <h1 className="text-xl font-semibold text-primary">{campaign.name}</h1>
      </div>

      <Card className="p-5">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Start date</dt>
            <dd className="mt-0.5 font-medium text-primary">{campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">End date</dt>
            <dd className="mt-0.5 font-medium text-primary">{campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Budget</dt>
            <dd className="mt-0.5 font-medium text-primary">{campaign.budget ? Number(campaign.budget).toLocaleString() : "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Leads generated</dt>
            <dd className="mt-0.5 font-medium text-primary">{campaign._count?.leads ?? 0}</dd>
          </div>
        </dl>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 p-4">
          <h2 className="text-sm font-semibold text-primary">Leads</h2>
        </div>
        {(campaign.leads?.length ?? 0) === 0 && <p className="p-6 text-sm text-slate-500">No leads attributed to this campaign yet.</p>}
        {(campaign.leads?.length ?? 0) > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Company</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {campaign.leads?.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-brand-700 hover:underline">
                      {lead.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{lead.companyName}</td>
                  <td className="px-4 py-3">
                    <Badge tone="blue">{lead.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
