import { prisma } from "../src/config/prisma";

// Order matters: children before parents to satisfy FK constraints. Phase 1
// only exercises identity + reference tables, so that's all we truncate.
export async function resetDb() {
  await prisma.otpVerification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.city.deleteMany();
  await prisma.region.deleteMany();
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
