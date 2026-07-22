"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/lib/ThemeProvider";

export type ChartTheme = {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  cursor: string;
};

const LIGHT: ChartTheme = {
  grid: "#e2e8f0",
  axis: "#64748b",
  tooltipBg: "#ffffff",
  tooltipBorder: "#e2e8f0",
  cursor: "#f1f5f9",
};

const DARK: ChartTheme = {
  grid: "#334155",
  axis: "#94a3b8",
  tooltipBg: "#1e293b",
  tooltipBorder: "#475569",
  cursor: "#0f172a",
};

export function useChartTheme(): ChartTheme {
  const { theme } = useTheme();
  const [resolved, setResolved] = useState<ChartTheme>(LIGHT);

  useEffect(() => {
    setResolved(theme === "dark" ? DARK : LIGHT);
  }, [theme]);

  return resolved;
}

export const tooltipContentStyle = (theme: ChartTheme) => ({
  backgroundColor: theme.tooltipBg,
  border: `1px solid ${theme.tooltipBorder}`,
  borderRadius: "0.75rem",
  fontSize: "12px",
});
