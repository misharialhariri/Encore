import { prisma } from "../../config/prisma";
import { toListingCard, LISTING_CARD_INCLUDE } from "../listings/listings.service";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getHomeFeed(viewerUserId?: string) {
  const viewer = viewerUserId
    ? await prisma.user.findUnique({ where: { id: viewerUserId }, select: { cityId: true, preferredSizes: true } })
    : null;

  const [recentlyListed, trendingGroups, featuredResellers] = await Promise.all([
    prisma.listing.findMany({
      where: { status: "ACTIVE" },
      include: LISTING_CARD_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.wishlist.groupBy({
      by: ["listingId"],
      where: { createdAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) } },
      _count: { listingId: true },
      orderBy: { _count: { listingId: "desc" } },
      take: 12,
    }),
    prisma.user.findMany({
      where: { isVerified: true, listings: { some: { status: "ACTIVE" } } },
      select: {
        id: true,
        displayName: true,
        profilePhotoUrl: true,
        city: { select: { nameEn: true } },
        _count: { select: { listings: { where: { status: "ACTIVE" } } } },
      },
      take: 8,
    }),
  ]);

  const trendingListings = trendingGroups.length
    ? await prisma.listing.findMany({
        where: { id: { in: trendingGroups.map((g) => g.listingId) }, status: "ACTIVE" },
        include: LISTING_CARD_INCLUDE,
      })
    : [];
  const trendingOrder = new Map(trendingGroups.map((g, i) => [g.listingId, i]));
  const trending = trendingListings
    .sort((a, b) => (trendingOrder.get(a.id) ?? 0) - (trendingOrder.get(b.id) ?? 0))
    .map(toListingCard);

  const itemsNearMe = viewer?.cityId
    ? (
        await prisma.listing.findMany({
          where: { status: "ACTIVE", pickupCityId: viewer.cityId },
          include: LISTING_CARD_INCLUDE,
          orderBy: { createdAt: "desc" },
          take: 12,
        })
      ).map(toListingCard)
    : [];

  const forYou = viewer?.preferredSizes.length
    ? (
        await prisma.listing.findMany({
          where: { status: "ACTIVE", sizeGulf: { in: viewer.preferredSizes } },
          include: LISTING_CARD_INCLUDE,
          orderBy: { createdAt: "desc" },
          take: 12,
        })
      ).map(toListingCard)
    : [];

  return {
    recentlyListed: recentlyListed.map(toListingCard),
    trending,
    itemsNearMe,
    forYou,
    featuredResellers: featuredResellers.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      profilePhotoUrl: u.profilePhotoUrl,
      city: u.city,
      activeListingsCount: u._count.listings,
    })),
  };
}
