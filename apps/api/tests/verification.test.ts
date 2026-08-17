import request from "supertest";
import { createApp } from "../src/app";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken } from "./helpers";

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

describe("POST /api/verification/requests", () => {
  it("submits a verification request that starts PENDING", async () => {
    const token = await loginAndGetAccessToken(app, "0512345678");

    const res = await request(app)
      .post("/api/verification/requests")
      .set("Authorization", `Bearer ${token}`)
      .send({ idDocumentUrl: "https://cdn.encore.example/verification-docs/a.jpg", documentType: "NATIONAL_ID" });

    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe("PENDING");
    expect(res.body.request.documentType).toBe("NATIONAL_ID");
  });

  it("rejects a second submission while one is still pending", async () => {
    const token = await loginAndGetAccessToken(app, "0512345678");
    await request(app)
      .post("/api/verification/requests")
      .set("Authorization", `Bearer ${token}`)
      .send({ idDocumentUrl: "https://cdn.encore.example/verification-docs/a.jpg", documentType: "NATIONAL_ID" });

    const second = await request(app)
      .post("/api/verification/requests")
      .set("Authorization", `Bearer ${token}`)
      .send({ idDocumentUrl: "https://cdn.encore.example/verification-docs/b.jpg", documentType: "IQAMA" });

    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe("VERIFICATION_ALREADY_PENDING");
  });
});

describe("GET /api/verification/requests/me", () => {
  it("returns null when nothing has been submitted, then the latest request", async () => {
    const token = await loginAndGetAccessToken(app, "0512345678");

    const empty = await request(app).get("/api/verification/requests/me").set("Authorization", `Bearer ${token}`);
    expect(empty.body.request).toBeNull();

    await request(app)
      .post("/api/verification/requests")
      .set("Authorization", `Bearer ${token}`)
      .send({ idDocumentUrl: "https://cdn.encore.example/verification-docs/a.jpg", documentType: "NATIONAL_ID" });

    const populated = await request(app).get("/api/verification/requests/me").set("Authorization", `Bearer ${token}`);
    expect(populated.body.request.status).toBe("PENDING");
  });
});

describe("POST /api/verification/document-upload-url", () => {
  it("returns a presigned S3 upload URL", async () => {
    const token = await loginAndGetAccessToken(app, "0512345678");
    const res = await request(app)
      .post("/api/verification/document-upload-url")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toMatch(/^https:\/\//);
  });
});
