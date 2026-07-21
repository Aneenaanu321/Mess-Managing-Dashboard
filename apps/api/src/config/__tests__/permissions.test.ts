import { describe, it, expect } from "vitest";
import { RoleKey } from "@prisma/client";
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../permissions";

const VALID_PERMISSION_VALUES = new Set(Object.values(PERMISSIONS));

describe("permission catalog", () => {
  it("has no duplicate permission keys", () => {
    const values = Object.values(PERMISSIONS);
    expect(new Set(values).size).toBe(values.length);
  });

  it("maps every RoleKey enum value to a default permission list", () => {
    for (const role of Object.values(RoleKey)) {
      expect(DEFAULT_ROLE_PERMISSIONS[role], `missing DEFAULT_ROLE_PERMISSIONS entry for ${role}`).toBeDefined();
    }
  });

  it("only grants permissions that exist in the PERMISSIONS catalog", () => {
    for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      for (const perm of perms) {
        expect(VALID_PERMISSION_VALUES.has(perm), `${role} references unknown permission "${perm}"`).toBe(true);
      }
    }
  });

  it("grants Super Admin the wildcard and nothing else (wildcard already covers all)", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN).toEqual([PERMISSIONS.ALL]);
  });
});
