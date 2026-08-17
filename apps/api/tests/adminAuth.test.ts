import request from "supertest";
import { createApp } from "../src/app";
import { resetDb, disconnectDb } from "./testDb";
import { makeAdminUser } from "./helpers";

jest.mock("../src/services/unifonic", () => ({
  sendOtpSms: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe("POST /api/admin/auth/login", () => {
  it("logs in with correct credentials and returns an admin access token", async () => {
    const admin = await makeAdminUser("SUPER_ADMIN");

    const res = await request(app).post("/api/admin/auth/login").send({ email: admin.email, password: admin.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.admin.email).toBe(admin.email);
    expect(res.body.admin.role).toBe("SUPER_ADMIN");
  });

  it("rejects an incorrect password", async () => {
    const admin = await makeAdminUser("SUPER_ADMIN");

    const res = await request(app).post("/api/admin/auth/login").send({ email: admin.email, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects an unknown email", async () => {
    const res = await request(app).post("/api/admin/auth/login").send({ email: "nobody@encore.example", password: "whatever" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("GET /api/admin/auth/me", () => {
  it("returns the authenticated admin", async () => {
    const admin = await makeAdminUser("OPS");
    const login = await request(app).post("/api/admin/auth/login").send({ email: admin.email, password: admin.password });

    const res = await request(app).get("/api/admin/auth/me").set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.admin.id).toBe(admin.id);
    expect(res.body.admin.role).toBe("OPS");
  });

  it("rejects a missing token", async () => {
    const res = await request(app).get("/api/admin/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects a regular user access token", async () => {
    const { loginAndGetAccessToken } = await import("./helpers");
    const userToken = await loginAndGetAccessToken(app, "0512345678");

    const res = await request(app).get("/api/admin/auth/me").set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(401);
  });
});
