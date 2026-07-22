import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

type CreateFormLayoutProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  error?: string | null;
};

export function CreateFormLayout({
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Create",
  isSubmitting,
  error,
}: CreateFormLayoutProps) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-primary">{title}</h1>
      {description && <p className="mb-6 text-sm text-muted">{description}</p>}
      {!description && <div className="mb-6" />}
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          {error && (
            <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300 dark:bg-red-950/50 dark:text-red-300">{error}</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : submitLabel}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
