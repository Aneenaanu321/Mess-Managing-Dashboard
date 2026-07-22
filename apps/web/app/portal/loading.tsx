import { Card } from "@/components/ui";

export default function PortalLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      <Card className="h-48 animate-pulse bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}
