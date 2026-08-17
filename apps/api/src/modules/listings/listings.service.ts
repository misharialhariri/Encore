import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { containsBannedKeyword } from "../../services/moderation";
import { getPlatformSettingNumber } from "../../services/platformSettings";
import { createPresignedUpload } from "../../services/s3";
import { notify, NotificationType } from "../../services/notifications";
import type { Listing, Prisma } from "@prisma/client";
import type { z } from "zod";
import type { createListingSchema, updateListingSchema } from "./listings.schemas";

const LISTING_INCLUDE = {
  images: { orderBy: { position: "asc" as const } },
  brand: true,
  pickupCity: { include: { region: true } },
  styleTags: { include: { styleTag: true } },
  reseller: {
    select: { id: true, displayName: true, profilePhotoUrl: true, isVerified: true, city: true },
  },
} satisfies Prisma.ListingInclude;

type ListingWithRelations = Prisma.ListingGetPayload<{ include: typeof LISTING_INCLUDE }>;

function toPublicListing(listing: ListingWithRelations) {
  return {
    id: listing.id,
    title: listing.title,
    brand: listing.brand ? { id: listing.brand.id, nameEn: listing.brand.nameEn, nameAr: listing.brand.nameAr } : null,
    sizeGulf: listing.sizeGulf,
    sizeIntl: listing.sizeIntl,
    colors: listing.colors,
    condition: listing.condition,
    originalPrice: listing.originalPrice.toNumber(),
    askingPrice: listing.askingPrice.toNumber(),
    occasionType: listing.occasionType,
    fabricType: listing.fabricType,
    description: listing.description,
    pickupCity: {
      id: listing.pickupCity.id,
      nameEn: listing.pickupCity.nameEn,
      nameAr: listing.pickupCity.nameAr,
      region: listing.pickupCity.region.nameEn,
    },
    pickupDistrict: listing.pickupDistrict,
    shippingAvailable: listing.shippingAvailable,
    acceptsOffers: listing.acceptsOffers,
    status: listing.status,
    boostedUntil: listing.boostedUntil,
    viewsCount: listing.viewsCount,
    savesCount: listing.savesCount,
    images: listing.images.map((img) => ({ id: img.id, url: img.url, position: img.position })),
    styleTags: listing.styleTags.map((t) => ({ id: t.styleTag.id, nameEn: t.styleTag.nameEn, nameAr: t.styleTag.nameAr })),
    reseller: {
      id: listing.reseller.id,
      displayName: listing.reseller.displayName,
      profilePhotoUrl: listing.reseller.profilePhotoUrl,
      isVerified: listing.reseller.isVerified,
      city: listing.reseller.city ? { nameEn: listing.reseller.city.nameEn } : null,
    },
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

const LISTING_CARD_INCLUDE = {
  images: { orderBy: { position: "asc" as const }, take: 1 },
  brand: true,
  pickupCity: true,
  reseller: { select: { id: true, displayName: true, isVerified: true } },
} satisfies Prisma.ListingInclude;

type ListingCardWithRelations = Prisma.ListingGetPayload<{ include: typeof LISTING_CARD_INCLUDE }>;

export function toListingCard(listing: ListingCardWithRelations) {
  return {
    id: listing.id,
    title: listing.title,
    brand: listing.brand ? { nameEn: listing.brand.nameEn } : null,
    sizeGulf: listing.sizeGulf,
    condition: listing.condition,
    askingPrice: listing.askingPrice.toNumber(),
    originalPrice: listing.originalPrice.toNumber(),
    coverImageUrl: listing.images[0]?.url ?? null,
    city: { nameEn: listing.pickupCity.nameEn },
    savesCount: listing.savesCount,
    viewsCount: listing.viewsCount,
    reseller: { id: listing.reseller.id, displayName: listing.reseller.displayName, isVerified: listing.reseller.isVerified },
    createdAt: listing.createdAt,
  };
}

export { LISTING_CARD_INCLUDE };

type CreateListingInput = z.infer<typeof createListingSchema>;
type UpdateListingInput = z.infer<typeof updateListingSchema>;

export async function createListing(resellerId: string, input: CreateListingInput) {
  const maxPhotos = await getPlatformSettingNumber("max_photos_per_listing", 10);
  if (input.imageUrls.length > maxPhotos) {
    throw AppError.badRequest("TOO_MANY_PHOTOS", `A listing can have at most ${maxPhotos} photos`);
  }

  const minPrice = await getPlatformSettingNumber("min_listing_price_sar", 0);
  if (input.askingPrice < minPrice) {
    throw AppError.badRequest("PRICE_TOO_LOW", `Asking price must be at least ${minPrice} SAR`);
  }

  const flagged = await containsBannedKeyword(`${input.title} ${input.description}`);

  const listing = await prisma.listing.create({
    data: {
      resellerId,
      title: input.title,
      brandId: input.brandId,
      sizeGulf: input.sizeGulf,
      sizeIntl: input.sizeGulf, // EU-equivalent; see catalog/sizeChart for the full conversion row
      colors: input.colors,
      condition: input.condition,
      originalPrice: input.originalPrice,
      askingPrice: input.askingPrice,
      occasionType: input.occasionType,
      fabricType: input.fabricType,
      description: input.description,
      pickupCityId: input.pickupCityId,
      pickupDistrict: input.pickupDistrict,
      shippingAvailable: input.shippingAvailable,
      acceptsOffers: input.acceptsOffers,
      status: flagged ? "PENDING_REVIEW" : "ACTIVE",
      images: { create: input.imageUrls.map((url, position) => ({ url, position })) },
      styleTags: { create: input.styleTagIds.map((styleTagId) => ({ styleTagId })) },
    },
    include: LISTING_INCLUDE,
  });

  return toPublicListing(listing);
}

export async function listMine(resellerId: string, status?: Listing["status"]) {
  const listings = await prisma.listing.findMany({
    where: { resellerId, ...(status ? { status } : {}) },
    include: LISTING_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return listings.map(toPublicListing);
}

async function requireOwnedListing(listingId: string, resellerId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw AppError.notFound("LISTING_NOT_FOUND", "Listing not found");
  if (listing.resellerId !== resellerId) {
    throw AppError.forbidden("NOT_LISTING_OWNER", "You do not own this listing");
  }
  return listing;
}

export async function getListingDetail(listingId: string, viewerUserId?: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: LISTING_INCLUDE });
  if (!listing) throw AppError.notFound("LISTING_NOT_FOUND", "Listing not found");

  if (viewerUserId !== listing.resellerId) {
    await prisma.listing.update({ where: { id: listingId }, data: { viewsCount: { increment: 1 } } });
    listing.viewsCount += 1;
  }

  const [isWished, similar] = await Promise.all([
    viewerUserId
      ? prisma.wishlist
          .findUnique({ where: { userId_listingId: { userId: viewerUserId, listingId } } })
          .then((row) => Boolean(row))
      : Promise.resolve(false),
    prisma.listing.findMany({
      where: {
        id: { not: listingId },
        status: "ACTIVE",
        OR: [{ occasionType: listing.occasionType }, ...(listing.brandId ? [{ brandId: listing.brandId }] : [])],
      },
      include: LISTING_CARD_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  return { ...toPublicListing(listing), isWished, similarItems: similar.map(toListingCard) };
}

export async function updateListing(listingId: string, resellerId: string, input: UpdateListingInput) {
  const existing = await requireOwnedListing(listingId, resellerId);
  if (existing.status === "SOLD" || existing.status === "REMOVED") {
    throw AppError.badRequest("LISTING_LOCKED", "Sold or removed listings can no longer be edited");
  }

  if (input.imageUrls) {
    const maxPhotos = await getPlatformSettingNumber("max_photos_per_listing", 10);
    if (input.imageUrls.length > maxPhotos) {
      throw AppError.badRequest("TOO_MANY_PHOTOS", `A listing can have at most ${maxPhotos} photos`);
    }
  }

  const titleOrDescriptionChanged = input.title !== undefined || input.description !== undefined;
  const flagged = titleOrDescriptionChanged
    ? await containsBannedKeyword(`${input.title ?? existing.title} ${input.description ?? existing.description}`)
    : false;

  const listing = await prisma.listing.update({
    where: { id: listingId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.brandId !== undefined && { brandId: input.brandId }),
      ...(input.sizeGulf !== undefined && { sizeGulf: input.sizeGulf, sizeIntl: input.sizeGulf }),
      ...(input.colors !== undefined && { colors: input.colors }),
      ...(input.condition !== undefined && { condition: input.condition }),
      ...(input.originalPrice !== undefined && { originalPrice: input.originalPrice }),
      ...(input.askingPrice !== undefined && { askingPrice: input.askingPrice }),
      ...(input.occasionType !== undefined && { occasionType: input.occasionType }),
      ...(input.fabricType !== undefined && { fabricType: input.fabricType }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.pickupCityId !== undefined && { pickupCityId: input.pickupCityId }),
      ...(input.pickupDistrict !== undefined && { pickupDistrict: input.pickupDistrict }),
      ...(input.shippingAvailable !== undefined && { shippingAvailable: input.shippingAvailable }),
      ...(input.acceptsOffers !== undefined && { acceptsOffers: input.acceptsOffers }),
      ...(titleOrDescriptionChanged && flagged && { status: "PENDING_REVIEW" }),
      ...(input.imageUrls !== undefined && {
        images: {
          deleteMany: {},
          create: input.imageUrls.map((url, position) => ({ url, position })),
        },
      }),
      ...(input.styleTagIds !== undefined && {
        styleTags: {
          deleteMany: {},
          create: input.styleTagIds.map((styleTagId) => ({ styleTagId })),
        },
      }),
    },
    include: LISTING_INCLUDE,
  });

  if (input.askingPrice !== undefined && input.askingPrice < existing.askingPrice.toNumber()) {
    await notifyWishlistersOfPriceDrop(listing.id, listing.title, input.askingPrice);
  }

  return toPublicListing(listing);
}

async function notifyWishlistersOfPriceDrop(listingId: string, title: string, newPrice: number) {
  const wishlisters = await prisma.wishlist.findMany({ where: { listingId }, select: { userId: true } });
  await Promise.all(
    wishlisters.map((w) =>
      notify(w.userId, NotificationType.PRICE_DROP, {
        title: "Price drop on a saved item",
        body: `"${title}" is now ${newPrice} SAR`,
        data: { listingId },
      })
    )
  );
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  ACTIVE: ["PAUSED", "SOLD", "REMOVED"],
  PAUSED: ["ACTIVE", "SOLD", "REMOVED"],
  PENDING_REVIEW: ["REMOVED"],
  SOLD: [],
  REMOVED: [],
};

export async function setListingStatus(listingId: string, resellerId: string, nextStatus: string) {
  const existing = await requireOwnedListing(listingId, resellerId);
  const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw AppError.badRequest(
      "INVALID_STATUS_TRANSITION",
      `Cannot move a listing from ${existing.status} to ${nextStatus}`
    );
  }

  const listing = await prisma.listing.update({
    where: { id: listingId },
    data: { status: nextStatus as Listing["status"] },
    include: LISTING_INCLUDE,
  });
  return toPublicListing(listing);
}

export async function presignListingPhoto(contentType: string) {
  return createPresignedUpload("listing-photos", contentType);
}
