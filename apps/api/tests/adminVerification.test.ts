import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
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

describe("admin verification review", () => {
  it("approves a request and flips User.isVerified", async () => {
    const reseller = await makeUser("0512345678");
    await request(app)
      .post("/api/verification/requests")
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ idDocumentUrl: "https://cdn.encore.example/verification-docs/a.jpg", documentType: "NATIONAL_ID" });

    const admin = await makeAdminAndLogin(app, "OPS");
    const list = await request(app).get("/api/admin/verification-requests").set("Authorization", `Bearer ${admin.token}`);
    expect(list.body.requests).toHaveLength(1);
    const requestId = list.body.requests[0].id;

    const approved = await request(app)
      .post(`/api/admin/verification-requests/${requestId}/approve`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(approved.status).toBe(200);
    expect(approved.body.request.status).toBe("APPROVED");

    const user = await prisma.user.findUnique({ where: { id: reseller.id } });
    expect(user?.isVerified).toBe(true);

    const notifications = await prisma.notification.findMany({ where: { userId: reseller.id, type: "VERIFICATION_UPDATE" } });
    expect(notifications).toHaveLength(1);
  });

  it("rejects a request without verifying the user", async () => {
    const reseller = await makeUser("0512345678");
    const submitted = await request(app)
      .post("/api/verification/requests")
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ idDocumentUrl: "https://cdn.encore.example/verification-docs/a.jpg", documentType: "NATIONAL_ID" });

    const admin = await makeAdminAndLogin(app, "SUPPORT");
    const requestId = submitted.body.request.id;

    const rejected = await request(app)
      .post(`/api/admin/verification-requests/${requestId}/reject`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ reason: "Photo is blurry" });

    expect(rejected.status).toBe(200);
    expect(rejected.body.request.status).toBe("REJECTED");

    const user = await prisma.user.findUnique({ where: { id: reseller.id } });
    expect(user?.isVerified).toBe(false);
  });

  it("rejects reviewing a request that's already been decided", async () => {
    const reseller = await makeUser("0512345678");
    const submitted = await request(app)
      .post("/api/verification/requests")
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ idDocumentUrl: "https://cdn.encore.example/verification-docs/a.jpg", documentType: "NATIONAL_ID" });
    const requestId = submitted.body.request.id;

    const admin = await makeAdminAndLogin(app, "OPS");
    await request(app).post(`/api/admin/verification-requests/${requestId}/approve`).set("Authorization", `Bearer ${admin.token}`);

    const second = await request(app).post(`/api/admin/verification-requests/${requestId}/approve`).set("Authorization", `Bearer ${admin.token}`);
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe("VERIFICATION_REQUEST_NOT_PENDING");
  });
});
