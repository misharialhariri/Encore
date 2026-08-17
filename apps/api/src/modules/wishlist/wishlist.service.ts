import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { toListingCard, LISTING_CARD_INCLUDE } from "../listings/listings.service";

export async function addToWishlist(userId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw AppError.notFound("LISTING_NOT_FOUND", "Listing not found");

  const existing = await prisma.wishlist.findUnique({ where: { userId_listingId: { userId, listingId } } });
  if (existing) return { saved: true };

  await prisma.$transaction([
    prisma.wishlist.create({ data: { userId, listingId } }),
    prisma.listing.update({ where: { id: listingId }, data: { savesCount: { increment: 1 } } }),
  ]);

  return { saved: true };
}

export async function removeFromWishlist(userId: string, listingId: string) {
  const existing = await prisma.wishlist.findUnique({ where: { userId_listingId: { userId, listingId } } });
  if (!existing) return { saved: false };

  await prisma.$transaction([
    prisma.wishlist.delete({ where: { userId_listingId: { userId, listingId } } }),
    prisma.listing.update({ where: { id: listingId }, data: { savesCount: { decrement: 1 } } }),
  ]);

  return { saved: false };
}

export async function listWishlist(userId: string) {
  const rows = await prisma.wishlist.findMany({
    where: { userId, listing: { status: { not: "REMOVED" } } },
    include: { listing: { include: LISTING_CARD_INCLUDE } },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({ ...toListingCard(row.listing), savedAt: row.createdAt }));
}
