import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, createListingDirect, driveOrderToStage } from "./helpers";

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

describe("POST /api/reviews", () => {
  it("lets the buyer review a completed order, and notifies the reseller", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "COMPLETED");

    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ orderId, rating: 5, comment: "Beautiful dress, exactly as described." });

    expect(res.status).toBe(201);
    expect(res.body.review.rating).toBe(5);
    expect(res.body.review.reviewer.id).toBe(buyer.id);

    const notifications = await prisma.notification.findMany({ where: { userId: reseller.id, type: "REVIEW_RECEIVED" } });
    expect(notifications).toHaveLength(1);
  });

  it("rejects a review for an order that isn't completed yet", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "SHIPPED");

    const res = await request(app).post("/api/reviews").set("Authorization", `Bearer ${buyer.token}`).send({ orderId, rating: 4 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ORDER_NOT_COMPLETED");
  });

  it("rejects a second review for the same order", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "COMPLETED");

    await request(app).post("/api/reviews").set("Authorization", `Bearer ${buyer.token}`).send({ orderId, rating: 5 });
    const second = await request(app).post("/api/reviews").set("Authorization", `Bearer ${buyer.token}`).send({ orderId, rating: 3 });

    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe("ALREADY_REVIEWED");
  });

  it("rejects a review from someone who isn't the buyer", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const stranger = await makeUser("0511119999");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "COMPLETED");

    const res = await request(app).post("/api/reviews").set("Authorization", `Bearer ${stranger.token}`).send({ orderId, rating: 5 });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/reviews/:id/response", () => {
  it("lets the reseller respond to their review", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "COMPLETED");
    const review = await request(app).post("/api/reviews").set("Authorization", `Bearer ${buyer.token}`).send({ orderId, rating: 4 });

    const res = await request(app)
      .post(`/api/reviews/${review.body.review.id}/response`)
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ response: "Thank you so much!" });

    expect(res.status).toBe(200);
    expect(res.body.review.resellerResponse).toBe("Thank you so much!");
  });

  it("rejects a response from someone other than the reseller", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "COMPLETED");
    const review = await request(app).post("/api/reviews").set("Authorization", `Bearer ${buyer.token}`).send({ orderId, rating: 4 });

    const res = await request(app)
      .post(`/api/reviews/${review.body.review.id}/response`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ response: "Nice try" });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/resellers/:id/reviews", () => {
  it("lists reviews and feeds the reseller's average rating", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "COMPLETED");
    await request(app).post("/api/reviews").set("Authorization", `Bearer ${buyer.token}`).send({ orderId, rating: 5, comment: "Lovely" });

    const list = await request(app).get(`/api/resellers/${reseller.id}/reviews`);
    expect(list.body.reviews).toHaveLength(1);
    expect(list.body.reviews[0].comment).toBe("Lovely");

    const profile = await request(app).get(`/api/resellers/${reseller.id}`);
    expect(profile.body.reseller.averageRating).toBe(5);
    expect(profile.body.reseller.reviewCount).toBe(1);
  });
});
