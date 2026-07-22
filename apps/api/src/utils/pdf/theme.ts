/** Shared brand tokens for server-generated PDFs — mirrors apps/web/tailwind.config.ts's `brand` scale and the STATUS_TONE color families used across the UI, so exported documents read as the same product. */
export const COLORS = {
  brand50: "#e1f1e3",
  brand500: "#44b86b",
  brand600: "#38a169",
  brand700: "#2f855a",
  brand800: "#276749",
  ink: "#0f172a",
  subtle: "#475569",
  muted: "#64748b",
  faint: "#94a3b8",
  border: "#e2e8f0",
  surfaceAlt: "#f8fafc",
  white: "#ffffff",
};

export type Tone = "slate" | "green" | "amber" | "red" | "blue";

export const TONE_COLORS: Record<Tone, { bg: string; fg: string }> = {
  slate: { bg: "#f1f5f9", fg: "#475569" },
  green: { bg: "#d1fae5", fg: "#065f46" },
  amber: { bg: "#fef3c7", fg: "#92400e" },
  red: { bg: "#fee2e2", fg: "#b91c1c" },
  blue: { bg: "#e0f2fe", fg: "#0369a1" },
};

export const PAGE = {
  size: "A4" as const,
  margin: 50,
  width: 595.28, // A4 points
  height: 841.89,
  contentRight: 545.28, // width - margin
};
