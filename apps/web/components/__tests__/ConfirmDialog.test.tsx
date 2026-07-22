import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmProvider, useConfirm } from "@/components/ConfirmDialog";

function TestHarness({ onResult }: { onResult: (value: boolean) => void }) {
  const confirm = useConfirm();

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await confirm({
          title: "Delete item?",
          message: "This action cannot be undone.",
          confirmLabel: "Delete",
          variant: "danger",
        });
        onResult(ok);
      }}
    >
      Open confirm
    </button>
  );
}

describe("ConfirmDialog", () => {
  it("resolves true when confirmed", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();

    render(
      <ConfirmProvider>
        <TestHarness onResult={onResult} />
      </ConfirmProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Open confirm" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onResult).toHaveBeenCalledWith(true);
  });

  it("resolves false when cancelled", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();

    render(
      <ConfirmProvider>
        <TestHarness onResult={onResult} />
      </ConfirmProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Open confirm" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onResult).toHaveBeenCalledWith(false);
  });
});
