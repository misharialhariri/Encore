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

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe("POST /api/chat/conversations", () => {
  it("starts a conversation and is idempotent on repeat calls", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");

    const first = await request(app).post("/api/chat/conversations").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id });
    expect(first.status).toBe(201);
    expect(first.body.conversation.otherParty.id).toBe(reseller.id);

    const second = await request(app).post("/api/chat/conversations").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id });
    expect(second.body.conversation.id).toBe(first.body.conversation.id);
  });

  it("rejects starting a conversation about your own listing", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });

    const res = await request(app).post("/api/chat/conversations").set("Authorization", `Bearer ${reseller.token}`).send({ listingId: listing.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CANNOT_MESSAGE_OWN_LISTING");
  });
});

describe("messaging", () => {
  async function startConversation(buyerToken: string, listingId: string) {
    const res = await request(app).post("/api/chat/conversations").set("Authorization", `Bearer ${buyerToken}`).send({ listingId });
    return res.body.conversation.id as string;
  }

  it("sends and retrieves text messages, updating lastMessageAt", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const conversationId = await startConversation(buyer.token, listing.id);

    const sent = await request(app)
      .post(`/api/chat/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ type: "TEXT", content: "Is this still available?" });
    expect(sent.status).toBe(201);
    expect(sent.body.message.content).toBe("Is this still available?");

    const messages = await request(app)
      .get(`/api/chat/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${reseller.token}`);
    expect(messages.body.messages).toHaveLength(1);

    const conversations = await request(app).get("/api/chat/conversations").set("Authorization", `Bearer ${reseller.token}`);
    expect(conversations.body.conversations[0].lastMessage.content).toBe("Is this still available?");
    expect(conversations.body.conversations[0].unreadCount).toBe(1);
  });

  it("requires an imageUrl for image messages and a valid offerId for offer cards", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const conversationId = await startConversation(buyer.token, listing.id);

    const badImage = await request(app)
      .post(`/api/chat/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ type: "IMAGE" });
    expect(badImage.status).toBe(400);
    expect(badImage.body.error.code).toBe("VALIDATION_ERROR");

    const badOffer = await request(app)
      .post(`/api/chat/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ type: "OFFER_CARD", offerId: "00000000-0000-0000-0000-000000000000" });
    expect(badOffer.status).toBe(400);
    expect(badOffer.body.error.code).toBe("INVALID_OFFER");
  });

  it("marks messages as read, clearing unread count for the reader", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const conversationId = await startConversation(buyer.token, listing.id);

    await request(app)
      .post(`/api/chat/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ type: "TEXT", content: "Hello" });

    await request(app).post(`/api/chat/conversations/${conversationId}/read`).set("Authorization", `Bearer ${reseller.token}`);

    const conversations = await request(app).get("/api/chat/conversations").set("Authorization", `Bearer ${reseller.token}`);
    expect(conversations.body.conversations[0].unreadCount).toBe(0);
  });

  it("rejects a non-participant reading or sending messages", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const stranger = await makeUser("0511119999");
    const conversationId = await startConversation(buyer.token, listing.id);

    const res = await request(app)
      .get(`/api/chat/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${stranger.token}`);
    expect(res.status).toBe(403);
  });

  it("notifies the recipient when a message is sent", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const conversationId = await startConversation(buyer.token, listing.id);

    await request(app)
      .post(`/api/chat/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ type: "TEXT", content: "Hi there" });

    const notifications = await prisma.notification.findMany({ where: { userId: reseller.id, type: "NEW_MESSAGE" } });
    expect(notifications).toHaveLength(1);
  });
});

describe("blocking", () => {
  async function startConversation(buyerToken: string, listingId: string) {
    const res = await request(app).post("/api/chat/conversations").set("Authorization", `Bearer ${buyerToken}`).send({ listingId });
    return res.body.conversation.id as string;
  }

  it("blocks messaging in both directions once blocked, and restores it on unblock", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const conversationId = await startConversation(buyer.token, listing.id);

    await request(app).post("/api/chat/block").set("Authorization", `Bearer ${reseller.token}`).send({ userId: buyer.id });

    const blockedList = await request(app).get("/api/chat/blocked").set("Authorization", `Bearer ${reseller.token}`);
    expect(blockedList.body.blocked).toHaveLength(1);

    const buyerTriesToSend = await request(app)
      .post(`/api/chat/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ type: "TEXT", content: "Still there?" });
    expect(buyerTriesToSend.status).toBe(403);
    expect(buyerTriesToSend.body.error.code).toBe("BLOCKED");

    const resellerTriesToSend = await request(app)
      .post(`/api/chat/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ type: "TEXT", content: "..." });
    expect(resellerTriesToSend.status).toBe(403);

    await request(app).delete(`/api/chat/block/${buyer.id}`).set("Authorization", `Bearer ${reseller.token}`);

    const afterUnblock = await request(app)
      .post(`/api/chat/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ type: "TEXT", content: "Hello again" });
    expect(afterUnblock.status).toBe(201);
  });
});
