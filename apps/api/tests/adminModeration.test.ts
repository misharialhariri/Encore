import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, createListingDirect, makeAdminAndLogin } from "./helpers";

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

describe("listing moderation", () => {
  it("lists PENDING_REVIEW listings and approves one, notifying the reseller", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id, status: "PENDING_REVIEW" });
    const admin = await makeAdminAndLogin(app, "OPS");

    const list = await request(app).get("/api/admin/listings").set("Authorization", `Bearer ${admin.token}`);
    expect(list.status).toBe(200);
    expect(list.body.listings.map((l: { id: string }) => l.id)).toContain(listing.id);

    const approved = await request(app).post(`/api/admin/listings/${listing.id}/approve`).set("Authorization", `Bearer ${admin.token}`);
    expect(approved.status).toBe(200);
    expect(approved.body.listing.status).toBe("ACTIVE");

    const notifications = await prisma.notification.findMany({ where: { userId: reseller.id, type: "LISTING_MODERATED" } });
    expect(notifications).toHaveLength(1);
  });

  it("rejects a PENDING_REVIEW listing, setting it REMOVED", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id, status: "PENDING_REVIEW" });
    const admin = await makeAdminAndLogin(app, "OPS");

    const res = await request(app)
      .post(`/api/admin/listings/${listing.id}/reject`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ reason: "Prohibited item" });

    expect(res.status).toBe(200);
    expect(res.body.listing.status).toBe("REMOVED");
  });

  it("rejects moderating a listing that isn't pending review", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id, status: "ACTIVE" });
    const admin = await makeAdminAndLogin(app, "OPS");

    const res = await request(app).post(`/api/admin/listings/${listing.id}/approve`).set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("LISTING_NOT_PENDING");
  });

  it("rejects a non-admin caller", async () => {
    const reseller = await makeUser("0512345678");

    const res = await request(app).get("/api/admin/listings").set("Authorization", `Bearer ${reseller.token}`);
    expect(res.status).toBe(401);
  });

  it("rejects a FINANCE admin (wrong role) from moderating listings", async () => {
    const financeAdmin = await makeAdminAndLogin(app, "FINANCE");
    const res = await request(app).get("/api/admin/listings").set("Authorization", `Bearer ${financeAdmin.token}`);
    expect(res.status).toBe(403);
  });
});

describe("report resolution", () => {
  it("lists OPEN reports and resolves one, optionally removing the listing", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id, status: "ACTIVE" });
    const buyer = await makeUser("0587654321");

    await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ targetType: "LISTING", listingId: listing.id, reason: "SCAM", description: "Looks fake" });

    const admin = await makeAdminAndLogin(app, "SUPPORT");
    const list = await request(app).get("/api/admin/reports").set("Authorization", `Bearer ${admin.token}`);
    expect(list.body.reports).toHaveLength(1);
    const reportId = list.body.reports[0].id;

    const resolved = await request(app)
      .post(`/api/admin/reports/${reportId}/resolve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "ACTIONED", removeListing: true });

    expect(resolved.status).toBe(200);
    expect(resolved.body.report.status).toBe("ACTIONED");

    const updatedListing = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(updatedListing?.status).toBe("REMOVED");
  });
});
