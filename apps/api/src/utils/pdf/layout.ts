import PDFDocument from "pdfkit";
import { Response } from "express";
import { COLORS, PAGE, TONE_COLORS, Tone } from "./theme";

type Doc = InstanceType<typeof PDFDocument>;

const FOOTER_HEIGHT = 46;
const CONTENT_BOTTOM = PAGE.height - PAGE.margin - FOOTER_HEIGHT;

export function money(value: unknown, currency: string) {
  return `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/** Creates an A4 doc, buffered (so we can stamp "Page X of Y" on every page at the end) and piped straight to the HTTP response. */
export function createPdf(res: Response, filename: string): Doc {
  const doc = new PDFDocument({ size: PAGE.size, margin: PAGE.margin, bufferPages: true });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}.pdf"`);
  doc.pipe(res);
  return doc;
}

/** A crisp vector monogram (no raster asset / build-pipeline dependency — works for any tenant's company name). */
function drawLogoMark(doc: Doc, x: number, y: number, name: string, size = 34) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  doc.roundedRect(x, y, size, size, 8).fill(COLORS.brand700);
  doc
    .fillColor(COLORS.white)
    .font("Helvetica-Bold")
    .fontSize(size * 0.4)
    .text(initials, x, y + size * 0.28, { width: size, align: "center" });
}

function drawTonePill(doc: Doc, text: string, tone: Tone, x: number, y: number) {
  const colors = TONE_COLORS[tone];
  doc.font("Helvetica-Bold").fontSize(8.5);
  const textWidth = doc.widthOfString(text.toUpperCase());
  const pillWidth = textWidth + 18;
  doc.roundedRect(x - pillWidth, y, pillWidth, 17, 8.5).fill(colors.bg);
  doc.fillColor(colors.fg).text(text.toUpperCase(), x - pillWidth, y + 4.5, { width: pillWidth, align: "center" });
  return pillWidth;
}

export interface BrandHeaderOptions {
  companyName: string;
  taxId?: string | null;
  eyebrow: string; // e.g. "QUOTATION" / "SALES REPORT"
  title: string; // e.g. the code, or a report period
  subtitle?: string;
  tone?: Tone;
  toneLabel?: string;
}

/** Full branded header: logo mark + company identity on the left, document identity (+ optional status pill) right-aligned. Draws a brand rule underneath and leaves doc.y positioned for body content. */
export function drawBrandHeader(doc: Doc, opts: BrandHeaderOptions) {
  const top = PAGE.margin;
  drawLogoMark(doc, PAGE.margin, top, opts.companyName);

  doc
    .fillColor(COLORS.ink)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(opts.companyName, PAGE.margin + 44, top + 1, { width: 260 });
  if (opts.taxId) {
    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(8.5)
      .text(`Tax ID: ${opts.taxId}`, PAGE.margin + 44, doc.y + 1, { width: 260 });
  }

  const rightBlockY = top;
  doc
    .fillColor(COLORS.brand700)
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .text(opts.eyebrow.toUpperCase(), PAGE.margin, rightBlockY, { width: PAGE.contentRight - PAGE.margin, align: "right", characterSpacing: 0.8 });
  doc
    .fillColor(COLORS.ink)
    .font("Helvetica-Bold")
    .fontSize(19)
    .text(opts.title, PAGE.margin, doc.y + 1, { width: PAGE.contentRight - PAGE.margin, align: "right" });
  if (opts.subtitle) {
    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(9)
      .text(opts.subtitle, PAGE.margin, doc.y + 1, { width: PAGE.contentRight - PAGE.margin, align: "right" });
  }
  if (opts.tone && opts.toneLabel) {
    drawTonePill(doc, opts.toneLabel, opts.tone, PAGE.contentRight, doc.y + 6);
  }

  const ruleY = Math.max(doc.y, top + 44) + 14;
  doc.moveTo(PAGE.margin, ruleY).lineTo(PAGE.contentRight, ruleY).lineWidth(2).strokeColor(COLORS.brand500).stroke();
  doc.y = ruleY + 20;
  doc.x = PAGE.margin;
}

/** Lightweight header repeated on overflow pages (table continuations etc.) — no logo, just enough to orient the reader. */
export function drawContinuationHeader(doc: Doc, companyName: string, title: string) {
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(`${companyName} — ${title} (continued)`, PAGE.margin, PAGE.margin);
  const ruleY = PAGE.margin + 16;
  doc.moveTo(PAGE.margin, ruleY).lineTo(PAGE.contentRight, ruleY).lineWidth(0.75).strokeColor(COLORS.border).stroke();
  doc.y = ruleY + 16;
  doc.x = PAGE.margin;
}

/** Large, faint, diagonal stamp — used for DRAFT/REJECTED/EXPIRED style states. Call right after a page starts, before body content, so it sits visually behind everything drawn afterward. */
export function drawWatermark(doc: Doc, text: string) {
  doc.save();
  doc
    .rotate(-38, { origin: [PAGE.width / 2, PAGE.height / 2] })
    .fillColor("#f1f5f9")
    .font("Helvetica-Bold")
    .fontSize(92)
    .text(text.toUpperCase(), 0, PAGE.height / 2 - 60, { width: PAGE.width, align: "center" });
  doc.restore();
  doc.x = PAGE.margin;
}

export function drawSectionLabel(doc: Doc, text: string) {
  doc
    .fillColor(COLORS.subtle)
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .text(text, PAGE.margin, doc.y, { width: PAGE.contentRight - PAGE.margin });
  doc.moveDown(0.4);
}

/** Ensures `needed` points of vertical space remain on the current page; otherwise starts a new page (running `onNewPage` to redraw a continuation header/watermark) and reports whether it did so. */
export function ensureSpace(doc: Doc, needed: number, onNewPage: () => void): boolean {
  if (doc.y + needed <= CONTENT_BOTTOM) return false;
  doc.addPage();
  onNewPage();
  return true;
}

export interface KeyValuePair {
  label: string;
  value: string;
}

/** A bordered, light-grey "meta info" card of label/value pairs laid out in N columns — mirrors the web app's Card + dl pattern. Row heights are measured per row (not fixed), so a wrapping value never overlaps the row below it. */
export function drawKeyValueCard(doc: Doc, pairs: KeyValuePair[], columns = 2) {
  const colWidth = (PAGE.contentRight - PAGE.margin) / columns;
  const valueWidth = colWidth - 24;
  const rowCount = Math.ceil(pairs.length / columns);

  doc.font("Helvetica-Bold").fontSize(10.5);
  const rowHeights: number[] = [];
  for (let row = 0; row < rowCount; row++) {
    const cellsInRow = pairs.slice(row * columns, row * columns + columns);
    const tallest = Math.max(...cellsInRow.map((p) => doc.heightOfString(p.value, { width: valueWidth })));
    rowHeights.push(Math.max(32, tallest + 21));
  }
  const cardHeight = rowHeights.reduce((sum, h) => sum + h, 0) + 16;
  const top = doc.y;

  doc.roundedRect(PAGE.margin, top, PAGE.contentRight - PAGE.margin, cardHeight, 6).fillAndStroke(COLORS.surfaceAlt, COLORS.border);

  let rowTop = top + 12;
  pairs.forEach((pair, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = PAGE.margin + 16 + col * colWidth;
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(pair.label.toUpperCase(), x, rowTop, { width: valueWidth, characterSpacing: 0.4 });
    doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(10.5).text(pair.value, x, rowTop + 11, { width: valueWidth });
    if (col === columns - 1 || i === pairs.length - 1) rowTop += rowHeights[row] ?? 32;
  });

  doc.y = top + cardHeight + 18;
  doc.x = PAGE.margin;
}

export interface TableColumn {
  key: string;
  label: string;
  width: number;
  align?: "left" | "right" | "center";
}

export interface DrawTableOptions {
  columns: TableColumn[];
  rows: Record<string, string>[];
  onNewPage: () => void;
  zebra?: boolean;
  emptyLabel?: string;
}

/** Auto-paginating table: repeats the header row on overflow pages via `onNewPage`, wraps long cell text, and zebra-stripes by default. */
export function drawTable(doc: Doc, opts: DrawTableOptions) {
  const { columns, rows, onNewPage, zebra = true, emptyLabel = "No data" } = opts;
  const startX = PAGE.margin;
  const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);

  function drawHeaderRow() {
    const headerTop = doc.y;
    doc.rect(startX, headerTop, tableWidth, 22).fill(COLORS.brand50);
    let x = startX;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.brand800);
    for (const col of columns) {
      doc.text(col.label.toUpperCase(), x + 8, headerTop + 7, { width: col.width - 12, align: col.align ?? "left", characterSpacing: 0.3 });
      x += col.width;
    }
    doc.y = headerTop + 22;
    doc.x = startX;
  }

  drawHeaderRow();

  if (rows.length === 0) {
    doc.moveDown(0.6);
    doc.font("Helvetica").fontSize(9.5).fillColor(COLORS.muted).text(emptyLabel, startX, doc.y, { width: tableWidth });
    doc.moveDown(0.8);
    return;
  }

  rows.forEach((row, i) => {
    // Measure wrapped height across all columns to size the row correctly.
    doc.font("Helvetica").fontSize(9);
    const rowHeight = Math.max(
      22,
      ...columns.map((col) => doc.heightOfString(row[col.key] ?? "", { width: col.width - 12 }) + 12),
    );

    ensureSpace(doc, rowHeight, () => {
      onNewPage();
      drawHeaderRow();
    });

    const rowTop = doc.y;
    if (zebra && i % 2 === 1) {
      doc.rect(startX, rowTop, tableWidth, rowHeight).fill(COLORS.surfaceAlt);
    }
    let x = startX;
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.ink);
    for (const col of columns) {
      doc.text(row[col.key] ?? "", x + 8, rowTop + 6, { width: col.width - 12, align: col.align ?? "left" });
      x += col.width;
    }
    doc
      .moveTo(startX, rowTop + rowHeight)
      .lineTo(startX + tableWidth, rowTop + rowHeight)
      .lineWidth(0.5)
      .strokeColor(COLORS.border)
      .stroke();
    doc.y = rowTop + rowHeight;
    doc.x = startX;
  });

  doc.moveDown(0.8);
}

/** Stamps a footer (thin rule, company name, generated timestamp, "Page X of Y") on every buffered page, then finalizes the stream. Must be the last thing called before the response ends. */
export function finalizePdf(doc: Doc, companyName: string) {
  const range = doc.bufferedPageRange();
  const generated = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const y = PAGE.height - PAGE.margin - 24;
    doc.moveTo(PAGE.margin, y).lineTo(PAGE.contentRight, y).lineWidth(0.5).strokeColor(COLORS.border).stroke();
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.faint)
      .text(`${companyName} · Generated ${generated}`, PAGE.margin, y + 7, { width: 300 });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.faint)
      .text(`Page ${i - range.start + 1} of ${range.count}`, PAGE.margin, y + 7, { width: PAGE.contentRight - PAGE.margin, align: "right" });
  }

  doc.end();
}
