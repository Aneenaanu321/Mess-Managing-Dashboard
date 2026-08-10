import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app";

const app = createApp();

describe("API health", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("API auth", () => {
  it("POST /api/v1/auth/login rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@example.com", password: "wrong" });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("GET /api/v1/leads requires authentication", async () => {
    const res = await request(app).get("/api/v1/leads");
    expect(res.status).toBe(401);
  });
});

describe("API validation", () => {
  it("POST /api/v1/leads rejects empty body when authenticated", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: process.env.E2E_EMAIL ?? "admin@ibtechintl.com", password: process.env.E2E_PASSWORD ?? "Password123!" });

    if (login.status !== 200) {
      // Skip authenticated tests when DB/seed isn't available in CI
      return;
    }

    const token = login.body.data.accessToken;
    const res = await request(app)
      .post("/api/v1/leads")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
