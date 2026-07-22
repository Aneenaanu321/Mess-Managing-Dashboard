import { Card } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="h-72 animate-pulse bg-slate-100 dark:bg-slate-800 lg:col-span-2" />
        <Card className="h-72 animate-pulse bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}
