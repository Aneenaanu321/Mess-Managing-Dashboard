/** Human-readable labels for enum values used in charts. */
export function formatChartLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const LEAD_STATUS_MEANINGS: Record<string, string> = {
  NEW: "Captured — not yet contacted",
  CONTACTED: "Sales has reached out",
  QUALIFIED: "Meets criteria — worth pursuing",
  DISQUALIFIED: "Not a fit — closed out",
  CONVERTED: "Turned into a customer/opportunity",
};

export const PIPELINE_STAGE_MEANINGS: Record<string, string> = {
  "Requirement Gathering": "Collecting customer needs",
  Demo: "Product demonstration scheduled or done",
  "Quotation Sent": "Quote delivered to customer",
  Negotiation: "Pricing or terms under discussion",
  "Internal Review": "Awaiting internal sign-off",
  "Proposal Sent": "Formal proposal submitted",
  "Closed Won": "Deal won",
  "Closed Lost": "Deal lost",
};
