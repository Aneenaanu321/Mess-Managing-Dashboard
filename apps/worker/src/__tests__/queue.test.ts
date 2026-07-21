import { describe, it, expect } from "vitest";
import { JOB_NAMES } from "../queue";

describe("JOB_NAMES", () => {
  it("has a unique name for every registered job", () => {
    const names = Object.values(JOB_NAMES);
    expect(new Set(names).size).toBe(names.length);
  });

  it("uses kebab-case job names (BullMQ convention)", () => {
    for (const name of Object.values(JOB_NAMES)) {
      expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });
});
