import request from "supertest";
import { createApp } from "../src/app";
import { resetDb, disconnectDb } from "./testDb";
import { makeAdminAndLogin } from "./helpers";

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

describe("admin platform settings", () => {
  it("creates/updates a setting and lists it back", async () => {
    const admin = await makeAdminAndLogin(app, "SUPER_ADMIN");

    const updated = await request(app)
      .put("/api/admin/settings/service_fee_pct")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ value: "12" });
    expect(updated.status).toBe(200);
    expect(updated.body.setting.value).toBe("12");

    const list = await request(app).get("/api/admin/settings").set("Authorization", `Bearer ${admin.token}`);
    expect(list.body.settings.find((s: { key: string }) => s.key === "service_fee_pct").value).toBe("12");
  });

  it("rejects a non-SUPER_ADMIN from changing settings", async () => {
    const opsAdmin = await makeAdminAndLogin(app, "OPS");
    const res = await request(app)
      .put("/api/admin/settings/service_fee_pct")
      .set("Authorization", `Bearer ${opsAdmin.token}`)
      .send({ value: "99" });
    expect(res.status).toBe(403);
  });
});

describe("admin banned keywords", () => {
  it("adds, lists, and removes a banned keyword", async () => {
    const admin = await makeAdminAndLogin(app, "SUPER_ADMIN");

    const created = await request(app)
      .post("/api/admin/banned-keywords")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ keyword: "counterfeit" });
    expect(created.status).toBe(201);

    const list = await request(app).get("/api/admin/banned-keywords").set("Authorization", `Bearer ${admin.token}`);
    expect(list.body.keywords.map((k: { keyword: string }) => k.keyword)).toContain("counterfeit");

    const keywordId = created.body.keyword.id;
    const removed = await request(app).delete(`/api/admin/banned-keywords/${keywordId}`).set("Authorization", `Bearer ${admin.token}`);
    expect(removed.status).toBe(204);

    const listAfter = await request(app).get("/api/admin/banned-keywords").set("Authorization", `Bearer ${admin.token}`);
    expect(listAfter.body.keywords.map((k: { keyword: string }) => k.keyword)).not.toContain("counterfeit");
  });

  it("returns 404 when removing a keyword that doesn't exist", async () => {
    const admin = await makeAdminAndLogin(app, "SUPER_ADMIN");
    const res = await request(app)
      .delete("/api/admin/banned-keywords/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(404);
  });
});
