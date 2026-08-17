import { prisma } from "../../config/prisma";
import { toListingCard, LISTING_CARD_INCLUDE } from "../listings/listings.service";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { searchQuerySchema } from "./search.schemas";

type SearchFilters = z.infer<typeof searchQuerySchema>;

function buildWhere(filters: SearchFilters): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { brand: { nameEn: { contains: filters.q, mode: "insensitive" } } },
    ];
  }
  if (filters.sizes.length) where.sizeGulf = { in: filters.sizes };
  if (filters.colors.length) where.colors = { hasSome: filters.colors };
  if (filters.conditions.length) where.condition = { in: filters.conditions };
  if (filters.occasionTypes.length) where.occasionType = { in: filters.occasionTypes };
  if (filters.brandIds.length) where.brandId = { in: filters.brandIds };
  if (filters.priceMin != null || filters.priceMax != null) {
    where.askingPrice = {
      ...(filters.priceMin != null && { gte: filters.priceMin }),
      ...(filters.priceMax != null && { lte: filters.priceMax }),
    };
  }
  if (filters.cityId) where.pickupCityId = filters.cityId;
  if (filters.shippingAvailable != null) where.shippingAvailable = filters.shippingAvailable;
  if (filters.acceptsOffers != null) where.acceptsOffers = filters.acceptsOffers;

  return where;
}

async function attachWishState<T extends { id: string }>(cards: T[], viewerUserId?: string) {
  if (!viewerUserId || cards.length === 0) return cards.map((c) => ({ ...c, isWished: false }));

  const wished = await prisma.wishlist.findMany({
    where: { userId: viewerUserId, listingId: { in: cards.map((c) => c.id) } },
    select: { listingId: true },
  });
  const wishedIds = new Set(wished.map((w) => w.listingId));
  return cards.map((c) => ({ ...c, isWished: wishedIds.has(c.id) }));
}

export async function searchListings(filters: SearchFilters, viewerUserId?: string) {
  const where = buildWhere(filters);

  // "Nearest" has no real geo distance yet (Google Maps arrives in Phase 4)
  // — it's approximated as same-city-first, everything else after, each
  // bucket newest-first. Bounded at 200/bucket so this stays cheap at MVP
  // scale; a real distance sort replaces this once geocoding exists.
  if (filters.sort === "nearest") {
    const viewer = viewerUserId ? await prisma.user.findUnique({ where: { id: viewerUserId }, select: { cityId: true } }) : null;

    if (!viewer?.cityId) {
      return searchListings({ ...filters, sort: "newest" }, viewerUserId);
    }

    const [nearBucket, restBucket] = await Promise.all([
      prisma.listing.findMany({
        where: { ...where, pickupCityId: viewer.cityId },
        include: LISTING_CARD_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.listing.findMany({
        where: { ...where, pickupCityId: { not: viewer.cityId } },
        include: LISTING_CARD_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    const combined = [...nearBucket, ...restBucket];
    const total = combined.length;
    const start = (filters.page - 1) * filters.limit;
    const pageItems = combined.slice(start, start + filters.limit);

    return {
      listings: await attachWishState(pageItems.map(toListingCard), viewerUserId),
      total,
      page: filters.page,
      limit: filters.limit,
      hasMore: start + filters.limit < total,
    };
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    filters.sort === "price_asc"
      ? [{ askingPrice: "asc" }]
      : filters.sort === "price_desc"
        ? [{ askingPrice: "desc" }]
        : filters.sort === "popular"
          ? [{ savesCount: "desc" }, { viewsCount: "desc" }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }];

  const [rows, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: LISTING_CARD_INCLUDE,
      orderBy,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    listings: await attachWishState(rows.map(toListingCard), viewerUserId),
    total,
    page: filters.page,
    limit: filters.limit,
    hasMore: filters.page * filters.limit < total,
  };
}

export async function getSuggestions(q: string) {
  const [titles, brands] = await Promise.all([
    prisma.listing.findMany({
      where: { status: "ACTIVE", title: { contains: q, mode: "insensitive" } },
      select: { title: true },
      take: 5,
      distinct: ["title"],
    }),
    prisma.brand.findMany({
      where: { isActive: true, nameEn: { contains: q, mode: "insensitive" } },
      select: { nameEn: true },
      take: 5,
    }),
  ]);

  const suggestions = Array.from(new Set([...titles.map((t) => t.title), ...brands.map((b) => b.nameEn)])).slice(0, 8);
  return suggestions;
}
