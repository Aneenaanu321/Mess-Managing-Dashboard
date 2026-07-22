import { Response } from "express";
import { COLORS } from "../../utils/pdf/theme";
import { createPdf, drawBrandHeader, drawContinuationHeader, drawKeyValueCard, drawSectionLabel, drawTable, drawWatermark, finalizePdf, money } from "../../utils/pdf/layout";

interface QuotationLineItemView {
  description: string;
  quantity: unknown;
  unitPrice: unknown;
  discountPct: unknown;
  taxPct: unknown;
  lineTotal: unknown;
}

interface QuotationView {
  code: string;
  version: number;
  status: string;
  currency: string;
  subtotal: unknown;
  discountTotal: unknown;
  taxTotal: unknown;
  grandTotal: unknown;
  paymentTerms: string | null;
  validUntil: Date | null;
  createdAt: Date;
  customer: { name: string; code: string };
  opportunity: { title: string; code: string };
  lineItems: QuotationLineItemView[];
}

interface CompanyView {
  name: string;
  legalName: string | null;
  taxId: string | null;
}

const STATUS_TONE: Record<string, "slate" | "green" | "amber" | "red" | "blue"> = {
  DRAFT: "slate",
  PENDING_APPROVAL: "amber",
  APPROVED_INTERNAL: "blue",
  SENT: "blue",
  CUSTOMER_APPROVED: "green",
  CUSTOMER_REJECTED: "red",
  REVISION_REQUESTED: "amber",
  SUPERSEDED: "slate",
  EXPIRED: "red",
};

const WATERMARK_BY_STATUS: Record<string, string> = {
  DRAFT: "DRAFT",
  CUSTOMER_REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  SUPERSEDED: "SUPERSEDED",
};

/** Streams a branded PDF for a quotation directly to the HTTP response. */
export function streamQuotationPdf(res: Response, quotation: QuotationView, company: CompanyView) {
  const companyName = company.legalName || company.name;
  const doc = createPdf(res, quotation.code);

  const watermarkText = WATERMARK_BY_STATUS[quotation.status];
  if (watermarkText) drawWatermark(doc, watermarkText);

  drawBrandHeader(doc, {
    companyName,
    taxId: company.taxId,
    eyebrow: "Quotation",
    title: quotation.code,
    subtitle: `Version ${quotation.version}`,
    tone: STATUS_TONE[quotation.status] ?? "slate",
    toneLabel: quotation.status.replaceAll("_", " "),
  });

  drawKeyValueCard(doc, [
    { label: "Customer", value: `${quotation.customer.name} (${quotation.customer.code})` },
    { label: "Opportunity", value: `${quotation.opportunity.title} (${quotation.opportunity.code})` },
    { label: "Issued", value: new Date(quotation.createdAt).toLocaleDateString() },
    { label: "Valid Until", value: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : "—" },
  ]);

  drawSectionLabel(doc, "Line Items");
  drawTable(doc, {
    columns: [
      { key: "description", label: "Description", width: 215 },
      { key: "qty", label: "Qty", width: 45, align: "right" },
      { key: "price", label: "Unit Price", width: 75, align: "right" },
      { key: "disc", label: "Disc %", width: 55, align: "right" },
      { key: "tax", label: "Tax %", width: 55, align: "right" },
      { key: "total", label: "Total", width: 50, align: "right" },
    ],
    rows: quotation.lineItems.map((line) => ({
      description: line.description,
      qty: String(line.quantity),
      price: Number(line.unitPrice).toLocaleString(),
      disc: `${Number(line.discountPct)}%`,
      tax: `${Number(line.taxPct)}%`,
      total: Number(line.lineTotal).toLocaleString(),
    })),
    onNewPage: () => drawContinuationHeader(doc, companyName, `Quotation ${quotation.code}`),
  });

  const totalsX = 335;
  const totalsValueWidth = 160;
  doc.fontSize(9.5).font("Helvetica").fillColor(COLORS.subtle);
  doc.text("Subtotal", totalsX, doc.y, { width: 100 });
  doc.text(money(quotation.subtotal, quotation.currency), totalsX + 100, doc.y - doc.currentLineHeight(), { width: totalsValueWidth, align: "right" });
  doc.text("Discount", totalsX, doc.y, { width: 100 });
  doc.text(`- ${money(quotation.discountTotal, quotation.currency)}`, totalsX + 100, doc.y - doc.currentLineHeight(), { width: totalsValueWidth, align: "right" });
  doc.text("Tax", totalsX, doc.y, { width: 100 });
  doc.text(money(quotation.taxTotal, quotation.currency), totalsX + 100, doc.y - doc.currentLineHeight(), { width: totalsValueWidth, align: "right" });
  doc.moveDown(0.4);

  const grandTop = doc.y;
  doc.roundedRect(totalsX - 10, grandTop - 4, totalsValueWidth + 110, 26, 5).fill(COLORS.brand50);
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor(COLORS.brand800);
  doc.text("Grand Total", totalsX, grandTop + 3, { width: 100 });
  doc.text(money(quotation.grandTotal, quotation.currency), totalsX + 100, grandTop + 3, { width: totalsValueWidth, align: "right" });
  doc.y = grandTop + 30;

  if (quotation.paymentTerms) {
    doc.moveDown(1);
    drawSectionLabel(doc, "Payment Terms");
    doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.ink).text(quotation.paymentTerms, 50, doc.y, { width: 495 });
  }

  finalizePdf(doc, companyName);
}
