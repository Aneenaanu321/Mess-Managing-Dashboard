import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Topbar } from "@/components/Topbar";
import { ThemeProvider } from "@/lib/ThemeProvider";

vi.mock("@/lib/auth", () => ({
  useCurrentUser: () => ({
    data: {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      role: { name: "Admin" },
      company: { name: "Acme", currency: "AED" },
      branch: { name: "HQ" },
      emailNotifications: true,
    },
  }),
  useLogout: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateEmailNotifications: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/components/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock("@/components/GlobalSearch", () => ({
  GlobalSearch: () => <input aria-label="Global search" />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderTopbar() {
  const client = new QueryClient();
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <Topbar sidebarOpen={false} onMenuClick={() => {}} />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("Topbar", () => {
  it("shows user initials and theme toggle", () => {
    renderTopbar();
    expect(screen.getByText("TU")).toBeInTheDocument();
    expect(screen.getByLabelText(/switch to dark theme|switch to light theme/i)).toBeInTheDocument();
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });
});
