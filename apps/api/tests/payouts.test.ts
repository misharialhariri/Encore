import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, createListingDirect } from "./helpers";

jest.mock("../src/services/unifonic", () => ({
  sendOtpSms: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function makeUser(phone: string) {
  const token = await loginAndGetAccessToken(app, phone);
  const me = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);
  return { token, id: me.body.user.id as string };
}

async function makeCompletedOrder(resellerId: string, buyerId: string, itemPrice: number) {
  const listing = await createListingDirect({ resellerId, askingPrice: itemPrice, status: "SOLD" });
  return prisma.order.create({
    data: {
      buyerId,
      resellerId,
      listingId: listing.id,
      itemPrice,
      shippingFee: 0,
      platformFee: itemPrice * 0.1,
      totalAmount: itemPrice * 1.1,
      deliveryMethod: "MEETUP",
      meetupLat: 24.7,
      meetupLng: 46.7,
      status: "COMPLETED",
    },
  });
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe("bank account", () => {
  it("returns null when no bank account is on file", async () => {
    const reseller = await makeUser("0512345678");
    const res = await request(app).get("/api/payouts/bank-account").set("Authorization", `Bearer ${reseller.token}`);
    expect(res.status).toBe(200);
    expect(res.body.bankAccount).toBeNull();
  });

  it("rejects an invalid IBAN", async () => {
    const reseller = await makeUser("0512345678");
    const res = await request(app)
      .put("/api/payouts/bank-account")
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ iban: "NOT-AN-IBAN", bankName: "SNB", accountHolderName: "Sara" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("saves a valid Saudi IBAN", async () => {
    const reseller = await makeUser("0512345678");
    const res = await request(app)
      .put("/api/payouts/bank-account")
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ iban: "sa0380000000608010167519", bankName: "SNB", accountHolderName: "Sara Al-Otaibi" });
    expect(res.status).toBe(200);
    expect(res.body.bankAccount.iban).toBe("SA0380000000608010167519");
  });
});

describe("earnings and payouts", () => {
  it("computes earnings from completed orders only", async () => {
    const reseller = await makeUser("0512345678");
    const buyer = await makeUser("0587654321");
    await makeCompletedOrder(reseller.id, buyer.id, 500);
    await createListingDirect({ resellerId: reseller.id }); // an unrelated active listing shouldn't count

    const res = await request(app).get("/api/payouts/earnings").set("Authorization", `Bearer ${reseller.token}`);
    expect(res.body.earnings.totalEarned).toBe(500);
    expect(res.body.earnings.availableBalance).toBe(500);
  });

  it("requires a bank account before requesting a payout", async () => {
    const reseller = await makeUser("0512345678");
    const buyer = await makeUser("0587654321");
    await makeCompletedOrder(reseller.id, buyer.id, 500);

    const res = await request(app).post("/api/payouts").set("Authorization", `Bearer ${reseller.token}`).send({ amount: 200 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_BANK_ACCOUNT");
  });

  it("rejects a payout below the minimum threshold", async () => {
    const reseller = await makeUser("0512345678");
    const buyer = await makeUser("0587654321");
    await makeCompletedOrder(reseller.id, buyer.id, 500);
    await request(app)
      .put("/api/payouts/bank-account")
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ iban: "SA0380000000608010167519", bankName: "SNB", accountHolderName: "Sara" });

    const res = await request(app).post("/api/payouts").set("Authorization", `Bearer ${reseller.token}`).send({ amount: 50 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PAYOUT_BELOW_MINIMUM");
  });

  it("rejects a payout exceeding the available balance", async () => {
    const reseller = await makeUser("0512345678");
    const buyer = await makeUser("0587654321");
    await makeCompletedOrder(reseller.id, buyer.id, 500);
    await request(app)
      .put("/api/payouts/bank-account")
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ iban: "SA0380000000608010167519", bankName: "SNB", accountHolderName: "Sara" });

    const res = await request(app).post("/api/payouts").set("Authorization", `Bearer ${reseller.token}`).send({ amount: 5000 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("creates a payout and reflects it in pending balance, blocking a duplicate over-request", async () => {
    const reseller = await makeUser("0512345678");
    const buyer = await makeUser("0587654321");
    await makeCompletedOrder(reseller.id, buyer.id, 500);
    await request(app)
      .put("/api/payouts/bank-account")
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ iban: "SA0380000000608010167519", bankName: "SNB", accountHolderName: "Sara" });

    const first = await request(app).post("/api/payouts").set("Authorization", `Bearer ${reseller.token}`).send({ amount: 300 });
    expect(first.status).toBe(201);
    expect(first.body.payout.status).toBe("PENDING");

    const earnings = await request(app).get("/api/payouts/earnings").set("Authorization", `Bearer ${reseller.token}`);
    expect(earnings.body.earnings.pendingPayouts).toBe(300);
    expect(earnings.body.earnings.availableBalance).toBe(200);

    const second = await request(app).post("/api/payouts").set("Authorization", `Bearer ${reseller.token}`).send({ amount: 300 });
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe("INSUFFICIENT_BALANCE");

    const history = await request(app).get("/api/payouts").set("Authorization", `Bearer ${reseller.token}`);
    expect(history.body.payouts).toHaveLength(1);
  });
});
