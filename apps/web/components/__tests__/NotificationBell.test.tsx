import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationBell } from "@/components/NotificationBell";

const markRead = vi.fn();
const markAllRead = vi.fn();

vi.mock("@/lib/notifications", () => ({
  useNotifications: () => ({
    data: [{ id: "1", title: "New lead", body: "Acme Corp", link: "/leads/1", readAt: null, createdAt: new Date().toISOString(), type: "ASSIGNMENT" }],
    isLoading: false,
  }),
  useUnreadCount: () => ({ data: 1 }),
  useMarkNotificationRead: () => ({ mutate: markRead }),
  useMarkAllNotificationsRead: () => ({ mutate: markAllRead, isPending: false }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function renderBell() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <NotificationBell />
    </QueryClientProvider>,
  );
}

describe("NotificationBell", () => {
  beforeEach(() => {
    markRead.mockClear();
    markAllRead.mockClear();
  });

  it("shows unread badge and opens dropdown", async () => {
    const user = userEvent.setup();
    renderBell();
    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Notifications"));
    expect(screen.getByText("New lead")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark all read/i })).toBeInTheDocument();
  });
});
