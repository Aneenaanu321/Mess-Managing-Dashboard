import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/new-inquiries",
}));

describe("Sidebar", () => {
  it("renders primary navigation links", () => {
    render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new inquiries/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /customers/i })).toBeInTheDocument();
  });

  it("renders new inquiries navigation link with accessible name", () => {
    render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    expect(screen.getByRole("link", { name: /new inquiries/i })).toHaveAttribute("href", "/new-inquiries");
  });
});
