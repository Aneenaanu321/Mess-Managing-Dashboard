"use client";

import { useRef, useState } from "react";
import { Paperclip, Upload } from "lucide-react";
import { useFiles, useUploadFile, openFile } from "@/lib/files";
import { Button, Card } from "@/components/ui";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Drop-in file attachment list + uploader for any entity backed by FileAsset. */
export function FileAttachments({
  entityType,
  entityId,
  hint,
}: {
  entityType: string;
  entityId: string;
  hint?: string;
}) {
  const { data: files, isLoading } = useFiles(entityType, entityId);
  const upload = useUploadFile(entityType, entityId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      await upload.mutateAsync(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary">Attachments</h2>
        <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          <Upload size={14} />
          {upload.isPending ? "Uploading…" : "Upload"}
        </Button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {!isLoading && (files?.length ?? 0) === 0 && <p className="text-sm text-slate-400">No files attached yet.</p>}

      <ul className="space-y-2">
        {files?.map((file) => (
          <li key={file.id}>
            <button
              type="button"
              onClick={() => openFile(file.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50"
            >
              <Paperclip size={14} className="shrink-0 text-slate-400" />
              <span className="flex-1 truncate">{file.fileName}</span>
              <span className="shrink-0 text-xs text-slate-400">{formatSize(file.sizeBytes)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
