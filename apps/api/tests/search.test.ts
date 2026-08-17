import request from "supertest";
import { createApp } from "../src/app";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, createListingDirect } from "./helpers";

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

describe("GET /api/search/listings", () => {
  it("only returns ACTIVE listings", async () => {
    const reseller = await makeReseller("0512345678");
    await createListingDirect({ resellerId: reseller.id, status: "ACTIVE", title: "Active gown" });
    await createListingDirect({ resellerId: reseller.id, status: "PAUSED", title: "Paused gown" });
    await createListingDirect({ resellerId: reseller.id, status: "PENDING_REVIEW", title: "Pending gown" });

    const res = await request(app).get("/api/search/listings");
    expect(res.status).toBe(200);
    expect(res.body.listings).toHaveLength(1);
    expect(res.body.listings[0].title).toBe("Active gown");
  });

  it("filters by size", async () => {
    const reseller = await makeReseller("0512345678");
    await createListingDirect({ resellerId: reseller.id, sizeGulf: "38" });
    await createListingDirect({ resellerId: reseller.id, sizeGulf: "44" });

    const res = await request(app).get("/api/search/listings").query({ sizes: "38" });
    expect(res.body.listings).toHaveLength(1);
    expect(res.body.listings[0].sizeGulf).toBe("38");
  });

  it("filters by price range", async () => {
    const reseller = await makeReseller("0512345678");
    await createListingDirect({ resellerId: reseller.id, askingPrice: 500 });
    await createListingDirect({ resellerId: reseller.id, askingPrice: 5000 });

    const res = await request(app).get("/api/search/listings").query({ priceMin: "1000", priceMax: "6000" });
    expect(res.body.listings).toHaveLength(1);
    expect(res.body.listings[0].askingPrice).toBe(5000);
  });

  it("full text searches title, description, and brand", async () => {
    const reseller = await makeReseller("0512345678");
    await createListingDirect({ resellerId: reseller.id, title: "Zuhair Murad blush ball gown" });
    await createListingDirect({ resellerId: reseller.id, title: "Simple cocktail dress" });

    const res = await request(app).get("/api/search/listings").query({ q: "zuhair" });
    expect(res.body.listings).toHaveLength(1);
    expect(res.body.listings[0].title).toContain("Zuhair");
  });

  it("sorts by price ascending and descending", async () => {
    const reseller = await makeReseller("0512345678");
    await createListingDirect({ resellerId: reseller.id, askingPrice: 900, title: "Mid" });
    await createListingDirect({ resellerId: reseller.id, askingPrice: 300, title: "Cheap" });
    await createListingDirect({ resellerId: reseller.id, askingPrice: 1500, title: "Expensive" });

    const asc = await request(app).get("/api/search/listings").query({ sort: "price_asc" });
    expect(asc.body.listings.map((l: any) => l.askingPrice)).toEqual([300, 900, 1500]);

    const desc = await request(app).get("/api/search/listings").query({ sort: "price_desc" });
    expect(desc.body.listings.map((l: any) => l.askingPrice)).toEqual([1500, 900, 300]);
  });

  it("sorts by popularity (savesCount)", async () => {
    const reseller = await makeReseller("0512345678");
    await createListingDirect({ resellerId: reseller.id, title: "Least saved", savesCount: 1 });
    await createListingDirect({ resellerId: reseller.id, title: "Most saved", savesCount: 10 });

    const res = await request(app).get("/api/search/listings").query({ sort: "popular" });
    expect(res.body.listings[0].title).toBe("Most saved");
  });

  it("paginates with a correct hasMore flag and total", async () => {
    const reseller = await makeReseller("0512345678");
    for (let i = 0; i < 5; i++) {
      await createListingDirect({ resellerId: reseller.id, title: `Gown ${i}` });
    }

    const page1 = await request(app).get("/api/search/listings").query({ limit: "2", page: "1" });
    expect(page1.body.listings).toHaveLength(2);
    expect(page1.body.total).toBe(5);
    expect(page1.body.hasMore).toBe(true);

    const page3 = await request(app).get("/api/search/listings").query({ limit: "2", page: "3" });
    expect(page3.body.listings).toHaveLength(1);
    expect(page3.body.hasMore).toBe(false);
  });

  it("reflects the viewer's wishlist state on isWished", async () => {
    const reseller = await makeReseller("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeReseller("0587654321");

    const before = await request(app).get("/api/search/listings").set("Authorization", `Bearer ${buyer.token}`);
    expect(before.body.listings[0].isWished).toBe(false);

    await request(app).post(`/api/wishlist/${listing.id}`).set("Authorization", `Bearer ${buyer.token}`);

    const after = await request(app).get("/api/search/listings").set("Authorization", `Bearer ${buyer.token}`);
    expect(after.body.listings[0].isWished).toBe(true);
  });
});

describe("GET /api/search/suggestions", () => {
  it("suggests matching titles and brand names", async () => {
    const reseller = await makeReseller("0512345678");
    await createListingDirect({ resellerId: reseller.id, title: "Elie Saab midnight gown" });

    const res = await request(app).get("/api/search/suggestions").query({ q: "elie" });
    expect(res.status).toBe(200);
    expect(res.body.suggestions.length).toBeGreaterThan(0);
  });
});
