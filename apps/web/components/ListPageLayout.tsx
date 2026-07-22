import { Card } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

type ListPageLayoutProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
  children: React.ReactNode;
};

export function ListPageLayout({
  eyebrow,
  title,
  description,
  actions,
  filters,
  isLoading,
  isError,
  errorMessage = "Couldn't load data. Is the API running?",
  isEmpty,
  emptyTitle = "No records found",
  emptyDescription,
  emptyActionLabel,
  emptyActionHref,
  children,
}: ListPageLayoutProps) {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      {filters && <Card className="flex flex-wrap items-center gap-3 p-4">{filters}</Card>}
      <Card className="overflow-hidden">
        {isLoading && <p className="p-8 text-sm text-muted">Loading…</p>}
        {isError && <p className="p-8 text-sm text-red-600 dark:text-red-400 dark:text-red-400">{errorMessage}</p>}
        {!isLoading && !isError && isEmpty && (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={emptyActionLabel}
            actionHref={emptyActionHref}
          />
        )}
        {!isLoading && !isError && !isEmpty && children}
      </Card>
    </div>
  );
}
