/**
 * Field / warehouse / delivery SOP templates.
 * Checklist keys are stored on EngineerTask.sopChecklist as Record<section, Record<key, boolean>>.
 */

export type SopSection = "preDay" | "warehouse" | "visit" | "docs" | "eod";

export type SopItem = {
  key: string;
  label: string;
  /** Cannot be ticked true without a matching job attachment (stops checkbox theater). */
  requiresEvidence?: boolean;
};

export const PRE_DAY_ITEMS: SopItem[] = [
  { key: "reviewedSchedule", label: "Reviewed jobs with coordinator and follow planned order" },
  { key: "flaggedConflicts", label: "Informed coordinator of any personal/other work that affects schedule" },
  { key: "bagDos", label: "Document bag: Delivery Orders (DOs)" },
  { key: "bagChecklists", label: "Document bag: Checklists" },
  { key: "bagReceiptBook", label: "Document bag: Receipt book for payment collection" },
  { key: "bagOtherDocs", label: "Document bag: Any other documents for today's work" },
];

export const WAREHOUSE_ITEMS: SopItem[] = [
  { key: "soChecklistMarked", label: "Sales order checklist marked (available / not available)" },
  { key: "soChecklistComplete", label: "Checklist updated until all items available for dispatch" },
  { key: "urgentUseNotified", label: "Coordinator informed if checklist items used for urgent needs (copy on item)" },
  { key: "doStockSeparated", label: "DO items kept separate from free stock (copy of DO on item)" },
  { key: "packingCounts", label: "Packing: number of items packed recorded on DO" },
  { key: "packingWeights", label: "Packing: individual item weights recorded (where applicable)" },
  { key: "docsProcessFollowed", label: "Same documentation process for packing DOs, checklists, CN, etc." },
  { key: "packingMaterialsOk", label: "Packing materials available (or office informed in advance)" },
  { key: "warehouseClean", label: "Warehouse items kept clean and dust-free" },
];

export const VISIT_ITEMS: SopItem[] = [
  { key: "customerNotified", label: "Customer informed prior to arrival" },
  { key: "delayEscalated", label: "Any delay/issue at site escalated to coordinator immediately" },
  { key: "doSigned", label: "Customer signature obtained on Delivery Order" },
  { key: "invoiceSigned", label: "Customer signature obtained on invoice" },
  { key: "receiptIssued", label: "Receipt issued for any cheque/cash collected (office copy kept)" },
];

export const EOD_ITEMS: SopItem[] = [
  { key: "originalsReturned", label: "All original documents returned to office" },
  { key: "noDocsRetained", label: "No company documents kept unless specifically instructed" },
];

/** Required post-job document acknowledgements by job type */
export const DOC_ITEMS_BY_JOB: Record<string, SopItem[]> = {
  DELIVERY: [
    { key: "signedDoScanned", label: "Scanned signed Delivery Order shared with office", requiresEvidence: true },
    { key: "signedInvoiceScanned", label: "Scanned signed invoice shared with office", requiresEvidence: true },
    { key: "customerDetailsComplete", label: "Customer name, signature, contact, stamp (if applicable) obtained" },
    { key: "scansClear", label: "All scans clear, complete, and readable" },
  ],
  EXPORT_SHIPMENT: [
    { key: "signedCi", label: "Signed Commercial Invoice (CI) shared", requiresEvidence: true },
    { key: "signedPl", label: "Signed Packing List (PL) shared", requiresEvidence: true },
    { key: "consignmentNote", label: "Consignment Note (CN) shared", requiresEvidence: true },
    { key: "otherShippingDocs", label: "Other shipping/customs documents shared" },
    { key: "scansClear", label: "All scans clear, complete, and readable" },
  ],
  IMPORT_RECEIVING: [
    { key: "importDocsReturned", label: "All original import docs from transporter/forwarder/customs returned" },
    { key: "countedVsPl", label: "Items counted vs packing list (same day or next day)" },
    { key: "plReturned", label: "Packing list returned to coordinator" },
    { key: "rackedFifo", label: "Items racked in assigned place (FIFO for consumables)" },
    { key: "markedPoDate", label: "Items marked with PO number / arrival date" },
    { key: "driverDetails", label: "Driver details recorded (name, contact, vehicle)" },
    { key: "damagesReported", label: "Expiry / pallet photos / damages reported ASAP", requiresEvidence: true },
    { key: "scansClear", label: "All scans clear, complete, and readable" },
  ],
  CHEQUE_COLLECTION: [
    { key: "chequeOrCashReturned", label: "Original cheque or cash returned to office" },
    { key: "receiptCounterfoil", label: "Receipt copy/counterfoil duly completed" },
    { key: "scanShared", label: "Scanned cheque/receipt shared with office immediately", requiresEvidence: true },
    { key: "scansClear", label: "All scans clear, complete, and readable" },
  ],
  DOCUMENT_PICKUP: [
    { key: "docsCollected", label: "Collected documents shared/scanned with office", requiresEvidence: true },
    { key: "scansClear", label: "All scans clear, complete, and readable" },
  ],
  SITE_VISIT: [
    { key: "visitNotesShared", label: "Visit notes / relevant docs shared with office", requiresEvidence: true },
    { key: "scansClear", label: "All scans clear, complete, and readable" },
  ],
  INSTALLATION: [
    { key: "completionEvidence", label: "Completion evidence / signed docs shared with office", requiresEvidence: true },
    { key: "scansClear", label: "All scans clear, complete, and readable" },
  ],
  OTHER: [
    { key: "relevantDocsShared", label: "Relevant job documents shared with office", requiresEvidence: true },
    { key: "scansClear", label: "All scans clear, complete, and readable" },
  ],
};

export type SopChecklistState = Partial<Record<SopSection, Record<string, boolean>>>;

export function defaultSopChecklist(jobType: string): SopChecklistState {
  const docs = Object.fromEntries(requiredDocsForJob(jobType).map((i) => [i.key, false]));
  return {
    preDay: Object.fromEntries(PRE_DAY_ITEMS.map((i) => [i.key, false])),
    warehouse: Object.fromEntries(WAREHOUSE_ITEMS.map((i) => [i.key, false])),
    visit: Object.fromEntries(VISIT_ITEMS.map((i) => [i.key, false])),
    docs,
    eod: Object.fromEntries(EOD_ITEMS.map((i) => [i.key, false])),
  };
}

export function mergeSopChecklist(
  existing: SopChecklistState | null | undefined,
  jobType: string,
  patch: SopChecklistState,
): SopChecklistState {
  const base = { ...defaultSopChecklist(jobType), ...(existing ?? {}) };
  const next: SopChecklistState = { ...base };
  for (const section of Object.keys(patch) as SopSection[]) {
    next[section] = { ...(base[section] ?? {}), ...(patch[section] ?? {}) };
  }
  return next;
}

export function sectionProgress(section: Record<string, boolean> | undefined, items: SopItem[]) {
  const total = items.length;
  const done = items.filter((i) => section?.[i.key]).length;
  return { done, total, complete: total > 0 && done === total };
}

export function requiredDocsForJob(jobType: string): SopItem[] {
  return DOC_ITEMS_BY_JOB[jobType] ?? DOC_ITEMS_BY_JOB.OTHER ?? [];
}

export function assertRequiredDocsChecked(jobType: string, checklist: SopChecklistState | null | undefined) {
  const required = requiredDocsForJob(jobType);
  const docs = checklist?.docs ?? {};
  const missing = required.filter((i) => !docs[i.key]).map((i) => i.label);
  return missing;
}

/** Docs items that must have a file on the job before they can be ticked. */
export function evidenceRequiredDocs(jobType: string): SopItem[] {
  return requiredDocsForJob(jobType).filter((i) => i.requiresEvidence);
}

export function countCheckedEvidenceDocs(jobType: string, checklist: SopChecklistState | null | undefined) {
  const docs = checklist?.docs ?? {};
  return evidenceRequiredDocs(jobType).filter((i) => docs[i.key]).length;
}

/**
 * Newly checked evidence ticks need one attachment per tick (unticking is always allowed).
 * Returns labels that cannot be checked yet given the current attachment count.
 */
export function assertEvidenceTicksAllowed(
  jobType: string,
  previous: SopChecklistState | null | undefined,
  next: SopChecklistState | null | undefined,
  attachmentCount: number,
): string[] {
  const prevDocs = previous?.docs ?? {};
  const nextDocs = next?.docs ?? {};
  const blocked: string[] = [];

  for (const item of evidenceRequiredDocs(jobType)) {
    const wasChecked = Boolean(prevDocs[item.key]);
    const isChecked = Boolean(nextDocs[item.key]);
    if (!wasChecked && isChecked) {
      const checkedAfter = countCheckedEvidenceDocs(jobType, next);
      if (attachmentCount < checkedAfter) {
        blocked.push(item.label);
      }
    }
  }

  return blocked;
}

/** On submit: every evidence-required docs tick must be covered by at least as many attachments. */
export function assertEvidenceAttachmentsForSubmit(
  jobType: string,
  checklist: SopChecklistState | null | undefined,
  attachmentCount: number,
): string[] {
  const checked = countCheckedEvidenceDocs(jobType, checklist);
  if (checked === 0) return [];
  if (attachmentCount >= checked) return [];
  const labels = evidenceRequiredDocs(jobType)
    .filter((i) => checklist?.docs?.[i.key])
    .map((i) => i.label);
  return labels;
}

export type PackingDetails = {
  itemCount?: number;
  items?: Array<{ name: string; weight?: number | null }>;
  pallets?: Array<{ label?: string; itemNames?: string; weight?: number | null }>;
  totalPalletWeight?: number | null;
  notes?: string;
};
