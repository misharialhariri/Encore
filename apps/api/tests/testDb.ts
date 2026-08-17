import { prisma } from "../src/config/prisma";

// Order matters: children before parents to satisfy FK constraints.
export async function resetDb() {
  await prisma.otpVerification.deleteMany();
  await prisma.message.deleteMany(); // references offers, so must go before offer.deleteMany()
  await prisma.conversation.deleteMany();
  await prisma.blockedUser.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.device.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.report.deleteMany();
  await prisma.resellerBankAccount.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.address.deleteMany();
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
