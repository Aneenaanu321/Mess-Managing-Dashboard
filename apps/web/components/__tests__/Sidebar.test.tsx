import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/leads",
}));

describe("Sidebar", () => {
  it("renders primary navigation links", () => {
    render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /leads/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /customers/i })).toBeInTheDocument();
  });

  it("renders leads navigation link with accessible name", () => {
    render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    expect(screen.getByRole("link", { name: /leads/i })).toHaveAttribute("href", "/leads");
  });
});
