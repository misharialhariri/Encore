import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, createListingDirect, makeCity, makeCityNamed } from "./helpers";

jest.mock("../src/services/unifonic", () => ({
  sendOtpSms: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function makeReseller(phone: string) {
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

describe("GET /api/feed/home", () => {
  it("lists recently listed active listings, newest first", async () => {
    const reseller = await makeReseller("0512345678");
    const older = await createListingDirect({ resellerId: reseller.id, title: "Older", createdAt: new Date(Date.now() - 60_000) });
    const newer = await createListingDirect({ resellerId: reseller.id, title: "Newer" });
    await createListingDirect({ resellerId: reseller.id, title: "Paused", status: "PAUSED" });

    const res = await request(app).get("/api/feed/home");
    expect(res.status).toBe(200);
    const ids = res.body.recentlyListed.map((l: any) => l.id);
    expect(ids).toEqual([newer.id, older.id]);
  });

  it("ranks trending by wishlist saves in the last 7 days", async () => {
    const reseller = await makeReseller("0512345678");
    const popular = await createListingDirect({ resellerId: reseller.id, title: "Popular" });
    const quiet = await createListingDirect({ resellerId: reseller.id, title: "Quiet" });

    const buyer1 = await makeReseller("0587654321");
    const buyer2 = await makeReseller("0511119999");
    await request(app).post(`/api/wishlist/${popular.id}`).set("Authorization", `Bearer ${buyer1.token}`);
    await request(app).post(`/api/wishlist/${popular.id}`).set("Authorization", `Bearer ${buyer2.token}`);
    await request(app).post(`/api/wishlist/${quiet.id}`).set("Authorization", `Bearer ${buyer1.token}`);

    const res = await request(app).get("/api/feed/home");
    const trendingIds = res.body.trending.map((l: any) => l.id);
    expect(trendingIds[0]).toBe(popular.id);
    expect(trendingIds).toContain(quiet.id);
  });

  it("shows items near me only when the viewer has a city set", async () => {
    const reseller = await makeReseller("0512345678");
    const riyadhCity = await makeCity();
    const jeddahCity = await makeCityNamed("Jeddah", "جدة", "Makkah", "مكة المكرمة");
    const inRiyadh = await createListingDirect({ resellerId: reseller.id, pickupCityId: riyadhCity.id, title: "In Riyadh" });
    await createListingDirect({ resellerId: reseller.id, pickupCityId: jeddahCity.id, title: "In Jeddah" });

    const anonymous = await request(app).get("/api/feed/home");
    expect(anonymous.body.itemsNearMe).toHaveLength(0);

    const buyer = await makeReseller("0587654321");
    await request(app).put("/api/users/me").set("Authorization", `Bearer ${buyer.token}`).send({ cityId: riyadhCity.id });

    const res = await request(app).get("/api/feed/home").set("Authorization", `Bearer ${buyer.token}`);
    expect(res.body.itemsNearMe).toHaveLength(1);
    expect(res.body.itemsNearMe[0].id).toBe(inRiyadh.id);
  });

  it("only features verified resellers with an active listing", async () => {
    const verified = await makeReseller("0512345678");
    await prisma.user.update({ where: { id: verified.id }, data: { isVerified: true } });
    await createListingDirect({ resellerId: verified.id });

    const unverified = await makeReseller("0587654321");
    await createListingDirect({ resellerId: unverified.id });

    const res = await request(app).get("/api/feed/home");
    const featuredIds = res.body.featuredResellers.map((r: any) => r.id);
    expect(featuredIds).toContain(verified.id);
    expect(featuredIds).not.toContain(unverified.id);
  });

  it("populates forYou based on the buyer's preferred sizes", async () => {
    const reseller = await makeReseller("0512345678");
    const matching = await createListingDirect({ resellerId: reseller.id, sizeGulf: "38", title: "Matches size" });
    await createListingDirect({ resellerId: reseller.id, sizeGulf: "48", title: "Different size" });

    const buyer = await makeReseller("0587654321");
    const noPref = await request(app).get("/api/feed/home").set("Authorization", `Bearer ${buyer.token}`);
    expect(noPref.body.forYou).toHaveLength(0);

    await request(app).put("/api/users/me").set("Authorization", `Bearer ${buyer.token}`).send({ preferredSizes: ["38"] });

    const withPref = await request(app).get("/api/feed/home").set("Authorization", `Bearer ${buyer.token}`);
    expect(withPref.body.forYou).toHaveLength(1);
    expect(withPref.body.forYou[0].id).toBe(matching.id);
  });
});
