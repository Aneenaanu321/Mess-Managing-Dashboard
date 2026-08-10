import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/new-inquiries",
}));

const mockUseCurrentUser = vi.fn();

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    useCurrentUser: () => mockUseCurrentUser(),
  };
});

describe("Sidebar", () => {
  it("renders navigation links the user can access", () => {
    mockUseCurrentUser.mockReturnValue({
      data: {
        permissions: ["*:*"],
        role: { key: "SUPER_ADMIN", name: "Super Admin" },
      },
    });

    render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new inquiries/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /customers/i })).toBeInTheDocument();
  });

  it("hides tabs the user cannot access", () => {
    mockUseCurrentUser.mockReturnValue({
      data: {
        permissions: ["task:view", "task:update", "customer:view"],
        role: { key: "DELIVERY_PERSON", name: "Delivery Person" },
      },
    });

    render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    expect(screen.getByRole("link", { name: /customers/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /team tasks/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /field ops/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /new inquiries/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^dashboard$/i })).not.toBeInTheDocument();
  });

  it("renders new inquiries navigation link with accessible name", () => {
    mockUseCurrentUser.mockReturnValue({
      data: {
        permissions: ["lead:view"],
        role: { key: "SALES_EXECUTIVE", name: "Sales Executive" },
      },
    });

    render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    expect(screen.getByRole("link", { name: /new inquiries/i })).toHaveAttribute("href", "/new-inquiries");
  });
});
