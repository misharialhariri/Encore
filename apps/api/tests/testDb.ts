import { prisma } from "../src/config/prisma";

// Order matters: children before parents to satisfy FK constraints.
export async function resetDb() {
  await prisma.otpVerification.deleteMany();
  await prisma.listing.deleteMany(); // cascades listing_images + listing_style_tags
  await prisma.styleTag.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.bannedKeyword.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.city.deleteMany();
  await prisma.region.deleteMany();
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
