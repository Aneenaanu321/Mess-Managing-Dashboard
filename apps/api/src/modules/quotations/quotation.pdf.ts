import PDFDocument from "pdfkit";
import { Response } from "express";

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

function money(value: unknown, currency: string) {
  return `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/** Streams a branded PDF for a quotation directly to the HTTP response. */
export function streamQuotationPdf(res: Response, quotation: QuotationView, company: CompanyView) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${quotation.code}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).font("Helvetica-Bold").text(company.legalName || company.name, { continued: false });
  if (company.taxId) doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(`Tax ID: ${company.taxId}`);
  doc.moveDown(1.5);

  doc.fillColor("#0f172a").fontSize(16).font("Helvetica-Bold").text(`Quotation ${quotation.code}`);
  doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(`Version ${quotation.version} — ${quotation.status.replaceAll("_", " ")}`);
  doc.moveDown();

  const infoTop = doc.y;
  doc.fontSize(10).fillColor("#0f172a").font("Helvetica-Bold").text("Customer", 50, infoTop);
  doc.font("Helvetica").text(`${quotation.customer.name} (${quotation.customer.code})`, 50, doc.y);
  doc.font("Helvetica-Bold").text("Opportunity", 300, infoTop);
  doc.font("Helvetica").text(`${quotation.opportunity.title} (${quotation.opportunity.code})`, 300, doc.y);
  doc.moveDown();

  doc.font("Helvetica-Bold").text("Issued", 50, doc.y);
  doc.font("Helvetica").text(new Date(quotation.createdAt).toLocaleDateString(), 50, doc.y);
  if (quotation.validUntil) {
    doc.font("Helvetica-Bold").text("Valid Until", 300, doc.y - doc.currentLineHeight());
    doc.font("Helvetica").text(new Date(quotation.validUntil).toLocaleDateString(), 300, doc.y);
  }
  doc.moveDown(1.5);

  // Line items table
  const tableTop = doc.y;
  const cols = { desc: 50, qty: 260, price: 320, disc: 390, tax: 440, total: 490 };
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#475569");
  doc.text("Description", cols.desc, tableTop);
  doc.text("Qty", cols.qty, tableTop, { width: 50, align: "right" });
  doc.text("Unit Price", cols.price, tableTop, { width: 60, align: "right" });
  doc.text("Disc %", cols.disc, tableTop, { width: 40, align: "right" });
  doc.text("Tax %", cols.tax, tableTop, { width: 40, align: "right" });
  doc.text("Total", cols.total, tableTop, { width: 60, align: "right" });
  doc.moveTo(50, doc.y + 3).lineTo(550, doc.y + 3).strokeColor("#e2e8f0").stroke();
  doc.moveDown(0.5);

  doc.font("Helvetica").fillColor("#0f172a");
  for (const line of quotation.lineItems) {
    const rowTop = doc.y;
    doc.fontSize(9);
    doc.text(line.description, cols.desc, rowTop, { width: 200 });
    doc.text(String(line.quantity), cols.qty, rowTop, { width: 50, align: "right" });
    doc.text(Number(line.unitPrice).toLocaleString(), cols.price, rowTop, { width: 60, align: "right" });
    doc.text(`${Number(line.discountPct)}%`, cols.disc, rowTop, { width: 40, align: "right" });
    doc.text(`${Number(line.taxPct)}%`, cols.tax, rowTop, { width: 40, align: "right" });
    doc.text(Number(line.lineTotal).toLocaleString(), cols.total, rowTop, { width: 60, align: "right" });
    doc.moveDown(0.7);
  }

  doc.moveTo(50, doc.y + 3).lineTo(550, doc.y + 3).strokeColor("#e2e8f0").stroke();
  doc.moveDown(0.8);

  const totalsX = 330;
  const totalsValueX = totalsX + 100;
  const totalsValueWidth = 120;
  doc.fontSize(9).font("Helvetica").fillColor("#475569");
  doc.text("Subtotal", totalsX, doc.y, { width: 100 });
  doc.text(money(quotation.subtotal, quotation.currency), totalsValueX, doc.y - doc.currentLineHeight(), { width: totalsValueWidth, align: "right" });
  doc.text("Discount", totalsX, doc.y, { width: 100 });
  doc.text(`- ${money(quotation.discountTotal, quotation.currency)}`, totalsValueX, doc.y - doc.currentLineHeight(), { width: totalsValueWidth, align: "right" });
  doc.text("Tax", totalsX, doc.y, { width: 100 });
  doc.text(money(quotation.taxTotal, quotation.currency), totalsValueX, doc.y - doc.currentLineHeight(), { width: totalsValueWidth, align: "right" });
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a");
  doc.text("Grand Total", totalsX, doc.y, { width: 100 });
  doc.text(money(quotation.grandTotal, quotation.currency), totalsValueX, doc.y - doc.currentLineHeight(), { width: totalsValueWidth, align: "right" });

  if (quotation.paymentTerms) {
    doc.moveDown(1.5);
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#475569").text("Payment Terms", 50, doc.y, { width: 495 });
    doc.font("Helvetica").fillColor("#0f172a").text(quotation.paymentTerms, 50, doc.y, { width: 495 });
  }

  doc.end();
}
