"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { parseCsv } from "@/lib/csv";
import { useBulkImportLeads, BulkImportResult } from "@/lib/leads";
import { Button, Card } from "@/components/ui";

const EXPECTED_COLUMNS = ["companyName", "contactName", "email", "phone", "source", "industry", "notes"];

export function LeadImportModal({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bulkImport = useBulkImportLeads();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      setError("No rows found in that file.");
      setRows([]);
      return;
    }
    setRows(parsed);
  }

  async function handleImport() {
    setError(null);
    try {
      const result = await bulkImport.mutateAsync(
        rows.map((row) => ({
          companyName: row.companyName,
          contactName: row.contactName,
          email: row.email || undefined,
          phone: row.phone || undefined,
          source: row.source || "WEBSITE",
          industry: row.industry || "OTHER",
          notes: row.notes || undefined,
        })),
      );
      setResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">Bulk Import Leads</h2>
            <p className="mt-1 text-sm text-slate-500">
              CSV with a header row: <code className="text-xs">{EXPECTED_COLUMNS.join(", ")}</code>. Only companyName and
              contactName are required (plus email or phone).
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {!result && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40"
            >
              <Upload size={20} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">{fileName || "Choose a CSV file"}</span>
              {rows.length > 0 && <span className="text-xs text-slate-500">{rows.length} row(s) parsed</span>}
            </button>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />

            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

            {rows.length > 0 && (
              <Button className="mt-4 w-full" onClick={handleImport} disabled={bulkImport.isPending}>
                {bulkImport.isPending ? "Importing…" : `Import ${rows.length} Lead${rows.length === 1 ? "" : "s"}`}
              </Button>
            )}
          </>
        )}

        {result && (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
              Created {result.created} of {result.total} leads.
            </div>
            {result.failed.length > 0 && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
                <p className="mb-1 font-medium">{result.failed.length} row(s) failed:</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                  {result.failed.map((f) => (
                    <li key={f.row}>
                      Row {f.row}: {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="secondary" className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
