"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, Label } from "@/components/ui";

type Props = {
  onSubmit: (payload: { name: string; signatureDataUrl: string; document: "DO" | "INVOICE" | "BOTH" }) => Promise<void>;
  defaultDocument?: "DO" | "INVOICE" | "BOTH";
  pending?: boolean;
};

/** Simple canvas signature capture for field / portal customer sign-off. */
export function SignaturePad({ onSubmit, defaultDocument = "BOTH", pending }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [name, setName] = useState("");
  const [docKind, setDocKind] = useState<"DO" | "INVOICE" | "BOTH">(defaultDocument);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError("Enter the signer name");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blank = window.document.createElement("canvas");
    blank.width = canvas.width;
    blank.height = canvas.height;
    const blankCtx = blank.getContext("2d");
    blankCtx?.fillRect(0, 0, blank.width, blank.height);
    if (canvas.toDataURL() === blank.toDataURL()) {
      setError("Please sign in the box");
      return;
    }
    try {
      await onSubmit({
        name: name.trim(),
        signatureDataUrl: canvas.toDataURL("image/png"),
        document: docKind,
      });
      clear();
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-off failed");
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="signerName">Signer name</Label>
        <Input id="signerName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
      </div>
      <div>
        <Label htmlFor="signDoc">Document</Label>
        <select
          id="signDoc"
          className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          value={docKind}
          onChange={(e) => setDocKind(e.target.value as "DO" | "INVOICE" | "BOTH")}
        >
          <option value="DO">Delivery Order</option>
          <option value="INVOICE">Invoice</option>
          <option value="BOTH">DO + Invoice</option>
        </select>
      </div>
      <div>
        <Label>Signature</Label>
        <canvas
          ref={canvasRef}
          width={560}
          height={180}
          className="mt-1 w-full touch-none rounded-xl border border-slate-200 bg-white dark:border-slate-600"
          onPointerDown={(e) => {
            drawing.current = true;
            const ctx = canvasRef.current?.getContext("2d");
            const p = pos(e);
            ctx?.beginPath();
            ctx?.moveTo(p.x, p.y);
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = canvasRef.current?.getContext("2d");
            const p = pos(e);
            ctx?.lineTo(p.x, p.y);
            ctx?.stroke();
          }}
          onPointerUp={() => {
            drawing.current = false;
          }}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={clear}>
          Clear
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={pending}>
          {pending ? "Saving…" : "Save signature"}
        </Button>
      </div>
    </div>
  );
}
