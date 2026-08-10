import { describe, it, expect } from "vitest";
import { buildNotificationEmail, escapeHtml } from "../email";

describe("email helpers", () => {
  it("escapes HTML entities", () => {
    expect(escapeHtml(`<a href="x">A&B</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;A&amp;B&lt;/a&gt;");
  });

  it("builds text + html notification email with CTA", () => {
    const { text, html } = buildNotificationEmail({
      title: "New job assigned: Deliver DO",
      body: `You've been assigned a new job: "Deliver DO".`,
      linkUrl: "http://localhost:3000/team-tasks/abc",
      linkLabel: "Open job",
    });

    expect(text).toContain("Deliver DO");
    expect(text).toContain("http://localhost:3000/team-tasks/abc");
    expect(html).toContain("Open job");
    expect(html).toContain("http://localhost:3000/team-tasks/abc");
    expect(html).toContain("ibTech");
  });
});
