"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  useSiteSurveys,
  useCreateSiteSurvey,
  useDemos,
  useCreateDemo,
  usePocs,
  useCreatePoc,
  useSolutionDesigns,
  useCreateSolutionDesign,
} from "@/lib/presales";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Button, Card, Input } from "@/components/ui";

type Tab = "surveys" | "demos" | "pocs" | "designs";
const TABS: { key: Tab; label: string }[] = [
  { key: "surveys", label: "Site Surveys" },
  { key: "demos", label: "Demos" },
  { key: "pocs", label: "POCs" },
  { key: "designs", label: "Solution Designs" },
];

export function PresalesSection({ opportunityId }: { opportunityId: string }) {
  const [tab, setTab] = useState<Tab>("surveys");
  const { data: user } = useCurrentUser();
  const canManage = hasPermission(user, "opportunity:update");

  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-primary">Pre-Sales</h2>
      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "px-3 py-2 text-xs font-medium border-b-2",
              tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-300",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "surveys" && <SiteSurveysTab opportunityId={opportunityId} canManage={canManage} />}
      {tab === "demos" && <DemosTab opportunityId={opportunityId} canManage={canManage} />}
      {tab === "pocs" && <PocsTab opportunityId={opportunityId} canManage={canManage} />}
      {tab === "designs" && <SolutionDesignsTab opportunityId={opportunityId} canManage={canManage} />}
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-slate-400">{label}</p>;
}

function SiteSurveysTab({ opportunityId, canManage }: { opportunityId: string; canManage: boolean }) {
  const { data: surveys, isLoading } = useSiteSurveys(opportunityId);
  const create = useCreateSiteSurvey(opportunityId);
  const [surveyDate, setSurveyDate] = useState("");
  const [findings, setFindings] = useState("");

  return (
    <div className="space-y-3">
      {!isLoading && (surveys?.length ?? 0) === 0 && <Empty label="No site surveys logged yet." />}
      <ul className="space-y-2 text-sm">
        {surveys?.map((s) => (
          <li key={s.id} className="border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
            <p className="font-medium text-primary">{new Date(s.surveyDate).toLocaleDateString()}</p>
            {s.findings && <p className="text-slate-600">{s.findings}</p>}
          </li>
        ))}
      </ul>
      {canManage && (
        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
          <Input type="date" value={surveyDate} onChange={(e) => setSurveyDate(e.target.value)} className="w-40" />
          <Input placeholder="Findings" value={findings} onChange={(e) => setFindings(e.target.value)} className="min-w-[180px] flex-1" />
          <Button
            size="sm"
            disabled={!surveyDate || create.isPending}
            onClick={() => {
              create.mutate({ surveyDate, findings: findings || undefined });
              setSurveyDate("");
              setFindings("");
            }}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

function DemosTab({ opportunityId, canManage }: { opportunityId: string; canManage: boolean }) {
  const { data: demos, isLoading } = useDemos(opportunityId);
  const create = useCreateDemo(opportunityId);
  const [demoDate, setDemoDate] = useState("");
  const [productsShown, setProductsShown] = useState("");

  return (
    <div className="space-y-3">
      {!isLoading && (demos?.length ?? 0) === 0 && <Empty label="No demos logged yet." />}
      <ul className="space-y-2 text-sm">
        {demos?.map((d) => (
          <li key={d.id} className="border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
            <p className="font-medium text-primary">{new Date(d.demoDate).toLocaleDateString()}</p>
            {d.productsShown && <p className="text-slate-600">{d.productsShown}</p>}
            {d.outcome && <p className="text-slate-500">Outcome: {d.outcome}</p>}
          </li>
        ))}
      </ul>
      {canManage && (
        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
          <Input type="date" value={demoDate} onChange={(e) => setDemoDate(e.target.value)} className="w-40" />
          <Input placeholder="Products shown" value={productsShown} onChange={(e) => setProductsShown(e.target.value)} className="min-w-[180px] flex-1" />
          <Button
            size="sm"
            disabled={!demoDate || create.isPending}
            onClick={() => {
              create.mutate({ demoDate, productsShown: productsShown || undefined });
              setDemoDate("");
              setProductsShown("");
            }}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

function PocsTab({ opportunityId, canManage }: { opportunityId: string; canManage: boolean }) {
  const { data: pocs, isLoading } = usePocs(opportunityId);
  const create = useCreatePoc(opportunityId);
  const [startDate, setStartDate] = useState("");
  const [scope, setScope] = useState("");

  return (
    <div className="space-y-3">
      {!isLoading && (pocs?.length ?? 0) === 0 && <Empty label="No POCs logged yet." />}
      <ul className="space-y-2 text-sm">
        {pocs?.map((p) => (
          <li key={p.id} className="border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
            <p className="font-medium text-primary">
              {new Date(p.startDate).toLocaleDateString()}
              {p.endDate ? ` – ${new Date(p.endDate).toLocaleDateString()}` : ""}
            </p>
            {p.scope && <p className="text-slate-600">{p.scope}</p>}
            {p.outcome && <p className="text-slate-500">Outcome: {p.outcome}</p>}
          </li>
        ))}
      </ul>
      {canManage && (
        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          <Input placeholder="Scope" value={scope} onChange={(e) => setScope(e.target.value)} className="min-w-[180px] flex-1" />
          <Button
            size="sm"
            disabled={!startDate || create.isPending}
            onClick={() => {
              create.mutate({ startDate, scope: scope || undefined });
              setStartDate("");
              setScope("");
            }}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

function SolutionDesignsTab({ opportunityId, canManage }: { opportunityId: string; canManage: boolean }) {
  const { data: designs, isLoading } = useSolutionDesigns(opportunityId);
  const create = useCreateSolutionDesign(opportunityId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="space-y-3">
      {!isLoading && (designs?.length ?? 0) === 0 && <Empty label="No solution designs yet." />}
      <ul className="space-y-2 text-sm">
        {designs?.map((d) => (
          <li key={d.id} className="border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
            <p className="font-medium text-primary">{d.title}</p>
            {d.description && <p className="text-slate-600">{d.description}</p>}
          </li>
        ))}
      </ul>
      {canManage && (
        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-48" />
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-w-[180px] flex-1" />
          <Button
            size="sm"
            disabled={!title.trim() || create.isPending}
            onClick={() => {
              create.mutate({ title, description: description || undefined });
              setTitle("");
              setDescription("");
            }}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
