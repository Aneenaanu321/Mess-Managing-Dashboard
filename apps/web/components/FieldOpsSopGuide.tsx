"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Button, Card } from "@/components/ui";

type GuideSection = {
  title: string;
  where: string;
  bullets: string[];
  nested?: Array<{ label: string; items: string[] }>;
};

const SECTIONS: GuideSection[] = [
  {
    title: "1. Before starting the day",
    where: "Field Ops → Before starting the day checklist (shared across open jobs)",
    bullets: [
      "Review the day's jobs with the coordinator and follow the agreed schedule (work the board in list order).",
      "Inform the coordinator immediately about any personal commitments or other work that may affect the schedule.",
      "Carry the document bag/briefcase with all required documents.",
    ],
    nested: [
      {
        label: "Document bag",
        items: ["Delivery Orders (DO)", "Checklists", "Receipt book", "Other required documents"],
      },
    ],
  },
  {
    title: "2. Warehouse activities",
    where: "Job card → Warehouse checklist · Open job → Packing on Delivery Order",
    bullets: [
      "Complete and continuously update the Sales Order checklist; mark available / unavailable items on the job (Sales order checklist section).",
      "Inform the coordinator if any reserved items are used for urgent requirements (tick urgent use — coordinators are notified).",
      "Keep a copy of the checklist with the relevant items.",
      "Keep DO items separate from general stock and attach a copy of the DO.",
      "Ensure packing materials are available before starting; tell the office in advance if not.",
      "Keep all warehouse items clean and dust-free.",
    ],
    nested: [
      {
        label: "During packing, record on the job",
        items: [
          "Number of items",
          "Individual weight (if applicable)",
          "Items per pallet",
          "Total pallet weight",
        ],
      },
    ],
  },
  {
    title: "3. Customer visits",
    where: "Job card → Customer visit checklist",
    bullets: [
      "Inform the customer before arrival (tick notifies and emails when an address is on file).",
      "Inform the coordinator immediately about any delay or issue (tick sends coordinator notification).",
      "Obtain customer signature, company stamp (where applicable), and contact number via digital sign-off.",
      "Obtain signatures on the DO and invoice.",
      "For cash/cheque collection, issue the proper receipt and keep a copy.",
    ],
  },
  {
    title: "4. After completing each job",
    where: "Open the job → Document submission checklist + Attachments → Submit to coordinator",
    bullets: [
      "Immediately upload clear scanned copies (evidence ticks need one file each).",
      "Ensure scans are complete and readable.",
      "Submit the job when the document checklist is complete; coordinator verifies and closes.",
      "Return all original documents to the office (end of day / one-tap EOD).",
    ],
    nested: [
      {
        label: "Typical scans",
        items: ["Signed DO", "Signed invoice", "Payment receipt / cheque", "Other relevant documents"],
      },
    ],
  },
  {
    title: "5. If a job cannot be completed",
    where: "Open the job → Inform office & mark incomplete",
    bullets: [
      "Inform the office/coordinator immediately with a reason.",
      "Suggest a reschedule date when you can — the job is marked blocked for follow-up.",
    ],
  },
  {
    title: "6. End of the day",
    where: "Field Ops → End of day — originals (one tap for all done jobs)",
    bullets: [
      "Return all original company documents to the office.",
      "Do not keep company documents unless specifically instructed.",
    ],
  },
  {
    title: "7. Customer deliveries — documents",
    where: "Job type: Customer delivery → Document submission",
    bullets: [
      "Signed Delivery Order (DO)",
      "Signed Invoice",
      "Customer name, signature, contact number, and company stamp where applicable",
    ],
  },
  {
    title: "8. Export shipments — documents",
    where: "Job type: Export shipment → Document submission",
    bullets: [
      "Signed Commercial Invoice (CI)",
      "Signed Packing List (PL)",
      "Consignment Note (CN)",
      "Shipping / customs documents",
    ],
  },
  {
    title: "9. Import shipments",
    where: "Job type: Import receiving → Import receiving details + Document submission",
    bullets: [
      "Submit all original import documents.",
      "Record count vs packing list on the job (same day or next day; return the PL to the coordinator).",
      "Enter rack/location and confirm FIFO for consumables.",
      "Mark items with PO number / arrival date on the job form.",
      "Record driver name, contact, and vehicle.",
      "Report expiry dates and discrepancies on the form; upload pallet/damage photos before ticking damages.",
    ],
  },
  {
    title: "10. Payment collection",
    where: "Job type: Cheque / payment collection → Visit + docs + payment fields on submit",
    bullets: [
      "Submit the original cheque/cash collected.",
      "Complete the receipt/counterfoil properly.",
      "Upload a scanned copy of the cheque/receipt immediately (evidence required).",
    ],
  },
];

/** Collapsible Field Ops SOP how-to — lives on /field-ops so drivers don’t need chat history. */
export function FieldOpsSopGuide() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "1. Before starting the day": true });

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
            <BookOpen size={16} className="shrink-0 text-brand-600 dark:text-brand-400" />
            Field Ops SOP guide
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            How to run the day in this app — communicate early, follow the schedule, document properly, send scans,
            return originals.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {open ? "Hide guide" : "Open guide"}
        </Button>
      </div>

      {open && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40 sm:px-5">
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-900 dark:bg-brand-950/40 dark:text-brand-200">
            <strong className="font-semibold">Main rule:</strong> Communicate early → Follow the schedule → Maintain
            proper documentation → Send scans immediately → Return originals to the office.
          </p>

          <ul className="space-y-2">
            {SECTIONS.map((section) => {
              const isOpen = !!expanded[section.title];
              return (
                <li key={section.title} className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
                    onClick={() => setExpanded((prev) => ({ ...prev, [section.title]: !prev[section.title] }))}
                    aria-expanded={isOpen}
                  >
                    <span className="mt-0.5 text-slate-400">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-primary">{section.title}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">{section.where}</span>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-2 border-t border-slate-100 px-3 py-2.5 dark:border-slate-700">
                      <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700 dark:text-slate-300">
                        {section.bullets.map((b) => (
                          <li key={b} className="leading-snug">
                            {b}
                          </li>
                        ))}
                      </ul>
                      {section.nested?.map((group) => (
                        <div key={group.label}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</p>
                          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-slate-700 dark:text-slate-300">
                            {group.items.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
