import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, validListingPayload } from "./helpers";

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

describe("GET /api/listings/meta", () => {
  it("returns lookup data for the listing form", async () => {
    const res = await request(app).get("/api/listings/meta");
    expect(res.status).toBe(200);
    expect(res.body.conditions).toContain("LIKE_NEW");
    expect(res.body.occasionTypes).toContain("WEDDING_GUEST");
    expect(res.body.colors.length).toBeGreaterThan(0);
    expect(res.body.sizeChart.length).toBe(10);
    expect(res.body.maxPhotosPerListing).toBe(10);
  });
});

describe("GET /api/brands and /api/style-tags", () => {
  it("filters brands by query", async () => {
    await prisma.brand.create({ data: { nameEn: "Elie Saab", nameAr: "إيلي صعب" } });
    await prisma.brand.create({ data: { nameEn: "Zara", nameAr: "زارا" } });

    const res = await request(app).get("/api/brands").query({ query: "elie" });
    expect(res.status).toBe(200);
    expect(res.body.brands).toHaveLength(1);
    expect(res.body.brands[0].nameEn).toBe("Elie Saab");
  });

  it("lists style tags", async () => {
    await prisma.styleTag.create({ data: { nameEn: "Maxi", nameAr: "ماكسي" } });
    const res = await request(app).get("/api/style-tags");
    expect(res.status).toBe(200);
    expect(res.body.styleTags).toHaveLength(1);
  });
});

describe("POST /api/listings", () => {
  it("rejects unauthenticated requests", async () => {
    const payload = await validListingPayload();
    const res = await request(app).post("/api/listings").send(payload);
    expect(res.status).toBe(401);
  });

  it("creates an active listing when nothing is flagged", async () => {
    const token = await loginAndGetAccessToken(app, "0512345678");
    const payload = await validListingPayload();

    const res = await request(app).post("/api/listings").set("Authorization", `Bearer ${token}`).send(payload);

    expect(res.status).toBe(201);
    expect(res.body.listing.status).toBe("ACTIVE");
    expect(res.body.listing.brand.nameEn).toBe("Elie Saab");
    expect(res.body.listing.images).toHaveLength(1);
    expect(res.body.listing.styleTags).toHaveLength(1);
    expect(res.body.listing.reseller.id).toBeDefined();
  });

  it("holds a listing for review when a banned keyword is present", async () => {
    await prisma.bannedKeyword.create({ data: { keyword: "replica" } });
    const token = await loginAndGetAccessToken(app, "0512345678");
    const payload = await validListingPayload({ description: "This is a replica of the designer gown." });

    const res = await request(app).post("/api/listings").set("Authorization", `Bearer ${token}`).send(payload);

    expect(res.status).toBe(201);
    expect(res.body.listing.status).toBe("PENDING_REVIEW");
  });

  it("rejects a listing with no photos", async () => {
    const token = await loginAndGetAccessToken(app, "0512345678");
    const payload = await validListingPayload({ imageUrls: [] });

    const res = await request(app).post("/api/listings").set("Authorization", `Bearer ${token}`).send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects more photos than the configured maximum", async () => {
    await prisma.platformSetting.upsert({
      where: { key: "max_photos_per_listing" },
      update: { value: "2" },
      create: { key: "max_photos_per_listing", value: "2" },
    });
    const token = await loginAndGetAccessToken(app, "0512345678");
    const payload = await validListingPayload({
      imageUrls: ["https://cdn.encore.example/a.jpg", "https://cdn.encore.example/b.jpg", "https://cdn.encore.example/c.jpg"],
    });

    const res = await request(app).post("/api/listings").set("Authorization", `Bearer ${token}`).send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("TOO_MANY_PHOTOS");
  });
});

describe("GET /api/listings/mine", () => {
  it("only returns the caller's own listings, optionally filtered by status", async () => {
    const tokenA = await loginAndGetAccessToken(app, "0512345678");
    const tokenB = await loginAndGetAccessToken(app, "0587654321");

    const payload = await validListingPayload();
    await request(app).post("/api/listings").set("Authorization", `Bearer ${tokenA}`).send(payload);
    await request(app).post("/api/listings").set("Authorization", `Bearer ${tokenB}`).send(payload);

    const res = await request(app).get("/api/listings/mine").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.listings).toHaveLength(1);

    const filtered = await request(app)
      .get("/api/listings/mine")
      .query({ status: "PAUSED" })
      .set("Authorization", `Bearer ${tokenA}`);
    expect(filtered.body.listings).toHaveLength(0);
  });
});

describe("GET /api/listings/:id", () => {
  it("increments the view count for non-owners but not for the owner", async () => {
    const ownerToken = await loginAndGetAccessToken(app, "0512345678");
    const viewerToken = await loginAndGetAccessToken(app, "0587654321");
    const payload = await validListingPayload();
    const created = await request(app).post("/api/listings").set("Authorization", `Bearer ${ownerToken}`).send(payload);
    const listingId = created.body.listing.id;

    const ownerView = await request(app).get(`/api/listings/${listingId}`).set("Authorization", `Bearer ${ownerToken}`);
    expect(ownerView.body.listing.viewsCount).toBe(0);

    const strangerView = await request(app)
      .get(`/api/listings/${listingId}`)
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(strangerView.body.listing.viewsCount).toBe(1);

    const anonymousView = await request(app).get(`/api/listings/${listingId}`);
    expect(anonymousView.body.listing.viewsCount).toBe(2);
  });
});

describe("PUT /api/listings/:id", () => {
  it("lets the owner edit their listing", async () => {
    const token = await loginAndGetAccessToken(app, "0512345678");
    const payload = await validListingPayload();
    const created = await request(app).post("/api/listings").set("Authorization", `Bearer ${token}`).send(payload);

    const res = await request(app)
      .put(`/api/listings/${created.body.listing.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ askingPrice: 1800 });

    expect(res.status).toBe(200);
    expect(res.body.listing.askingPrice).toBe(1800);
  });

  it("blocks a non-owner from editing", async () => {
    const ownerToken = await loginAndGetAccessToken(app, "0512345678");
    const otherToken = await loginAndGetAccessToken(app, "0587654321");
    const payload = await validListingPayload();
    const created = await request(app).post("/api/listings").set("Authorization", `Bearer ${ownerToken}`).send(payload);

    const res = await request(app)
      .put(`/api/listings/${created.body.listing.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ askingPrice: 1800 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("NOT_LISTING_OWNER");
  });

  it("blocks edits to a sold listing", async () => {
    const token = await loginAndGetAccessToken(app, "0512345678");
    const payload = await validListingPayload();
    const created = await request(app).post("/api/listings").set("Authorization", `Bearer ${token}`).send(payload);
    const listingId = created.body.listing.id;

    await request(app)
      .patch(`/api/listings/${listingId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "SOLD" });

    const res = await request(app)
      .put(`/api/listings/${listingId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ askingPrice: 1800 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("LISTING_LOCKED");
  });
});

describe("PATCH /api/listings/:id/status", () => {
  it("allows valid transitions: ACTIVE -> PAUSED -> ACTIVE -> SOLD", async () => {
    const token = await loginAndGetAccessToken(app, "0512345678");
    const payload = await validListingPayload();
    const created = await request(app).post("/api/listings").set("Authorization", `Bearer ${token}`).send(payload);
    const listingId = created.body.listing.id;

    const paused = await request(app)
      .patch(`/api/listings/${listingId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "PAUSED" });
    expect(paused.body.listing.status).toBe("PAUSED");

    const reactivated = await request(app)
      .patch(`/api/listings/${listingId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "ACTIVE" });
    expect(reactivated.body.listing.status).toBe("ACTIVE");

    const sold = await request(app)
      .patch(`/api/listings/${listingId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "SOLD" });
    expect(sold.body.listing.status).toBe("SOLD");
  });

  it("rejects an invalid transition out of SOLD", async () => {
    const token = await loginAndGetAccessToken(app, "0512345678");
    const payload = await validListingPayload();
    const created = await request(app).post("/api/listings").set("Authorization", `Bearer ${token}`).send(payload);
    const listingId = created.body.listing.id;

    await request(app)
      .patch(`/api/listings/${listingId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "SOLD" });

    const res = await request(app)
      .patch(`/api/listings/${listingId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "ACTIVE" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("soft-deletes via REMOVED status, keeping the row", async () => {
    const token = await loginAndGetAccessToken(app, "0512345678");
    const payload = await validListingPayload();
    const created = await request(app).post("/api/listings").set("Authorization", `Bearer ${token}`).send(payload);
    const listingId = created.body.listing.id;

    const res = await request(app)
      .patch(`/api/listings/${listingId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "REMOVED" });

    expect(res.status).toBe(200);
    expect(res.body.listing.status).toBe("REMOVED");

    const stillInDb = await prisma.listing.findUnique({ where: { id: listingId } });
    expect(stillInDb).not.toBeNull();
  });
});
