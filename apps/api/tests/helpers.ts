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

export async function makeCityNamed(nameEn: string, nameAr: string, regionNameEn = nameEn, regionNameAr = nameAr) {
  const region = await prisma.region.upsert({
    where: { nameEn: regionNameEn },
    update: {},
    create: { nameEn: regionNameEn, nameAr: regionNameAr },
  });
  return prisma.city.upsert({
    where: { nameEn_regionId: { nameEn, regionId: region.id } },
    update: {},
    create: { nameEn, nameAr, regionId: region.id },
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

export interface DirectListingOverrides {
  resellerId: string;
  title?: string;
  brandId?: string;
  sizeGulf?: string;
  colors?: string[];
  condition?: "NEW_WITH_TAGS" | "LIKE_NEW" | "GOOD" | "FAIR";
  askingPrice?: number;
  originalPrice?: number;
  occasionType?: "WEDDING_GUEST" | "FORMAL" | "SEMI_FORMAL" | "COCKTAIL";
  pickupCityId?: string;
  status?: "PENDING_REVIEW" | "ACTIVE" | "PAUSED" | "SOLD" | "REMOVED";
  createdAt?: Date;
  viewsCount?: number;
  savesCount?: number;
}

// Bypasses the HTTP layer for fixtures that need direct control over
// fields the create endpoint doesn't expose (status, createdAt, counts) —
// used by search/feed/sort tests where ordering and filtering are the
// point of the test.
export async function createListingDirect(overrides: DirectListingOverrides) {
  const [city, brand] = await Promise.all([makeCity(), makeBrand()]);
  return prisma.listing.create({
    data: {
      resellerId: overrides.resellerId,
      title: overrides.title ?? "Test gown",
      brandId: overrides.brandId ?? brand.id,
      sizeGulf: overrides.sizeGulf ?? "40",
      sizeIntl: overrides.sizeGulf ?? "40",
      colors: overrides.colors ?? ["Blush"],
      condition: overrides.condition ?? "LIKE_NEW",
      originalPrice: overrides.originalPrice ?? 5000,
      askingPrice: overrides.askingPrice ?? 1000,
      occasionType: overrides.occasionType ?? "WEDDING_GUEST",
      fabricType: "Silk",
      description: "Test listing fixture",
      pickupCityId: overrides.pickupCityId ?? city.id,
      pickupDistrict: "Al Olaya",
      shippingAvailable: true,
      acceptsOffers: true,
      status: overrides.status ?? "ACTIVE",
      viewsCount: overrides.viewsCount ?? 0,
      savesCount: overrides.savesCount ?? 0,
      ...(overrides.createdAt && { createdAt: overrides.createdAt }),
      images: { create: [{ url: "https://cdn.encore.example/listing-photos/fixture.jpg", position: 0 }] },
    },
  });
}
