import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge, Button, Card } from "@/components/ui";

describe("UI primitives", () => {
  it("renders Button with label", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders danger Button variant", () => {
    render(
      <Button variant="danger" type="button">
        Delete
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-red-600");
  });

  it("renders Card content", () => {
    render(<Card>Dashboard panel</Card>);
    expect(screen.getByText("Dashboard panel")).toBeInTheDocument();
  });

  it("renders Badge with tone", () => {
    render(<Badge tone="green">Active</Badge>);
    expect(screen.getByText("Active")).toHaveClass("text-emerald-800");
  });
});
