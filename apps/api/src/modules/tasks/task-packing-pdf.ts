import { Response } from "express";
import { createPdf, drawBrandHeader, drawContinuationHeader, drawKeyValueCard, drawSectionLabel, drawTable, finalizePdf } from "../../utils/pdf/layout";
import type { PackingDetails } from "./field-sop";

interface TaskPdfView {
  id: string;
  title: string;
  jobType: string;
  status: string;
  dueDate: Date | null;
  packingDetails: PackingDetails | null;
  project?: { code: string; name: string; customer?: { name: string } | null } | null;
  assignee?: { firstName: string; lastName: string } | null;
}

interface CompanyView {
  name: string;
  legalName: string | null;
  taxId: string | null;
}

export function streamPackingSlipPdf(res: Response, task: TaskPdfView, company: CompanyView) {
  const companyName = company.legalName || company.name;
  const packing = task.packingDetails ?? {};
  const code = `DO-${task.id.slice(-8).toUpperCase()}`;
  const doc = createPdf(res, code);

  drawBrandHeader(doc, {
    companyName,
    taxId: company.taxId,
    eyebrow: task.jobType === "EXPORT_SHIPMENT" ? "Packing list / CN pack" : "Delivery Order / Packing slip",
    title: task.title,
    subtitle: task.project ? `${task.project.code} — ${task.project.name}` : undefined,
    tone: "blue",
    toneLabel: task.status.replaceAll("_", " "),
  });

  drawKeyValueCard(doc, [
    { label: "Customer", value: task.project?.customer?.name ?? "—" },
    { label: "Job type", value: task.jobType.replaceAll("_", " ") },
    {
      label: "Assignee",
      value: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "—",
    },
    { label: "Due", value: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—" },
    { label: "Item count", value: packing.itemCount != null ? String(packing.itemCount) : "—" },
    {
      label: "Total pallet wt",
      value: packing.totalPalletWeight != null ? String(packing.totalPalletWeight) : "—",
    },
  ]);

  const items = packing.items ?? [];
  drawSectionLabel(doc, "Packed items");
  drawTable(doc, {
    columns: [
      { key: "name", label: "Item", width: 360 },
      { key: "weight", label: "Weight", width: 100, align: "right" },
    ],
    rows: items.map((i) => ({
      name: i.name,
      weight: i.weight != null ? String(i.weight) : "—",
    })),
    onNewPage: () => drawContinuationHeader(doc, companyName, code),
    emptyLabel: "No line items recorded",
  });

  const pallets = packing.pallets ?? [];
  if (pallets.length > 0) {
    drawSectionLabel(doc, "Pallets");
    drawTable(doc, {
      columns: [
        { key: "label", label: "Pallet", width: 100 },
        { key: "itemNames", label: "Items", width: 260 },
        { key: "weight", label: "Weight", width: 100, align: "right" },
      ],
      rows: pallets.map((p, idx) => ({
        label: p.label?.trim() || `Pallet ${idx + 1}`,
        itemNames: p.itemNames?.trim() || "—",
        weight: p.weight != null ? String(p.weight) : "—",
      })),
      onNewPage: () => drawContinuationHeader(doc, companyName, code),
      emptyLabel: "No pallets recorded",
    });
  }

  if (packing.notes) {
    drawSectionLabel(doc, "Notes");
    doc.font("Helvetica").fontSize(10).fillColor("#334155").text(packing.notes, { width: 460 });
  }

  finalizePdf(doc, companyName);
}
