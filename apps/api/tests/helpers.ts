import request from "supertest";
import type { Express } from "express";
import { prisma } from "../src/config/prisma";

export async function loginAndGetAccessToken(app: Express, phoneNumber: string): Promise<string> {
  await request(app).post("/api/auth/otp/request").send({ phoneNumber });
  const unifonic = await import("../src/services/unifonic");
  const code = (unifonic.sendOtpSms as jest.Mock).mock.calls.at(-1)![1] as string;
  const res = await request(app).post("/api/auth/otp/verify").send({ phoneNumber, code });
  return res.body.accessToken as string;
}

// upsert-by-name so calling these more than once within a test (before the
// next resetDb) reuses the same fixture row instead of hitting unique
// constraints on the reference tables' name columns.
export async function makeCity() {
  const region = await prisma.region.upsert({
    where: { nameEn: "Riyadh" },
    update: {},
    create: { nameEn: "Riyadh", nameAr: "الرياض" },
  });
  return prisma.city.upsert({
    where: { nameEn_regionId: { nameEn: "Riyadh", regionId: region.id } },
    update: {},
    create: { nameEn: "Riyadh", nameAr: "الرياض", regionId: region.id },
  });
}

export async function makeBrand() {
  return prisma.brand.upsert({
    where: { nameEn: "Elie Saab" },
    update: {},
    create: { nameEn: "Elie Saab", nameAr: "إيلي صعب" },
  });
}

export async function makeStyleTag() {
  return prisma.styleTag.upsert({
    where: { nameEn: "Maxi" },
    update: {},
    create: { nameEn: "Maxi", nameAr: "ماكسي" },
  });
}

export interface ListingFixtureOverrides {
  imageUrls?: string[];
  title?: string;
  description?: string;
}

export async function validListingPayload(overrides: ListingFixtureOverrides = {}) {
  const [city, brand, styleTag] = await Promise.all([makeCity(), makeBrand(), makeStyleTag()]);
  return {
    title: overrides.title ?? "Elie Saab blush gown, worn once",
    brandId: brand.id,
    sizeGulf: "40",
    colors: ["Blush", "Gold"],
    condition: "LIKE_NEW",
    originalPrice: 8000,
    askingPrice: 2500,
    occasionType: "WEDDING_GUEST",
    styleTagIds: [styleTag.id],
    fabricType: "Silk chiffon",
    description: overrides.description ?? "Worn once to a friend's wedding, dry cleaned, no visible flaws.",
    pickupCityId: city.id,
    pickupDistrict: "Al Olaya",
    shippingAvailable: true,
    acceptsOffers: true,
    imageUrls: overrides.imageUrls ?? ["https://cdn.encore.example/listing-photos/a.jpg"],
  };
}
