import request from "supertest";
import { createApp } from "../src/app";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, makeAdminAndLogin } from "./helpers";

jest.mock("../src/services/unifonic", () => ({
  sendOtpSms: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function makeUser(phone: string) {
  const token = await loginAndGetAccessToken(app, phone);
  const me = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);
  return { token, id: me.body.user.id as string };
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe("admin user search and detail", () => {
  it("finds a user by phone number substring and returns detail with counts", async () => {
    const user = await makeUser("0512345678");
    const admin = await makeAdminAndLogin(app, "SUPPORT");

    const search = await request(app).get("/api/admin/users?query=512345678").set("Authorization", `Bearer ${admin.token}`);
    expect(search.body.users.map((u: { id: string }) => u.id)).toContain(user.id);

    const detail = await request(app).get(`/api/admin/users/${user.id}`).set("Authorization", `Bearer ${admin.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.user.listingsCount).toBe(0);
  });
});

describe("suspend/ban actually take effect on the existing session", () => {
  it("suspending a user immediately rejects their existing access token", async () => {
    const user = await makeUser("0512345678");
    const admin = await makeAdminAndLogin(app, "OPS");

    const before = await request(app).get("/api/users/me").set("Authorization", `Bearer ${user.token}`);
    expect(before.status).toBe(200);

    const suspend = await request(app).post(`/api/admin/users/${user.id}/suspend`).set("Authorization", `Bearer ${admin.token}`);
    expect(suspend.status).toBe(200);
    expect(suspend.body.user.status).toBe("SUSPENDED");

    const after = await request(app).get("/api/users/me").set("Authorization", `Bearer ${user.token}`);
    expect(after.status).toBe(403);
    expect(after.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("banning a user immediately rejects their existing access token, and reactivating restores it", async () => {
    const user = await makeUser("0587654321");
    const admin = await makeAdminAndLogin(app, "OPS");

    await request(app).post(`/api/admin/users/${user.id}/ban`).set("Authorization", `Bearer ${admin.token}`);
    const banned = await request(app).get("/api/users/me").set("Authorization", `Bearer ${user.token}`);
    expect(banned.status).toBe(403);
    expect(banned.body.error.code).toBe("ACCOUNT_BANNED");

    await request(app).post(`/api/admin/users/${user.id}/reactivate`).set("Authorization", `Bearer ${admin.token}`);
    const restored = await request(app).get("/api/users/me").set("Authorization", `Bearer ${user.token}`);
    expect(restored.status).toBe(200);
  });
});

describe("admin stats", () => {
  it("returns pending counts across queues", async () => {
    const admin = await makeAdminAndLogin(app, "SUPPORT");
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        pendingListings: expect.any(Number),
        openReports: expect.any(Number),
        openDisputes: expect.any(Number),
        pendingVerifications: expect.any(Number),
        pendingPayouts: expect.any(Number),
      })
    );
  });
});
