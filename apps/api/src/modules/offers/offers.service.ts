import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import type { Offer } from "@prisma/client";

const OFFER_TTL_MS = 24 * 60 * 60 * 1000;

const OFFER_INCLUDE = {
  listing: {
    select: {
      id: true,
      title: true,
      askingPrice: true,
      status: true,
      resellerId: true,
      images: { orderBy: { position: "asc" as const }, take: 1 },
    },
  },
} as const;

type OfferWithListing = Offer & {
  listing: {
    id: string;
    title: string;
    askingPrice: { toNumber(): number };
    status: string;
    resellerId: string;
    images: { url: string }[];
  };
};

function toPublicOffer(offer: OfferWithListing) {
  return {
    id: offer.id,
    offerPrice: offer.offerPrice.toNumber(),
    status: offer.status,
    parentOfferId: offer.parentOfferId,
    expiresAt: offer.expiresAt,
    createdAt: offer.createdAt,
    buyerId: offer.buyerId,
    listing: {
      id: offer.listing.id,
      title: offer.listing.title,
      askingPrice: offer.listing.askingPrice.toNumber(),
      status: offer.listing.status,
      resellerId: offer.listing.resellerId,
      coverImageUrl: offer.listing.images[0]?.url ?? null,
    },
  };
}

async function expireIfNeeded(offer: OfferWithListing): Promise<OfferWithListing> {
  if (offer.status === "PENDING" && offer.expiresAt.getTime() < Date.now()) {
    const updated = await prisma.offer.update({
      where: { id: offer.id },
      data: { status: "EXPIRED" },
      include: OFFER_INCLUDE,
    });
    return updated as OfferWithListing;
  }
  return offer;
}

/** Root offer (no parent) is authored by the buyer at depth 0; each counter
 * flips the author. Even depth = buyer authored, odd depth = reseller authored. */
async function computeDepth(offer: OfferWithListing): Promise<number> {
  let depth = 0;
  let current: OfferWithListing = offer;
  while (current.parentOfferId) {
    const parent = await prisma.offer.findUniqueOrThrow({
      where: { id: current.parentOfferId },
      include: OFFER_INCLUDE,
    });
    current = parent as OfferWithListing;
    depth += 1;
  }
  return depth;
}

async function getChainHistory(offer: OfferWithListing): Promise<OfferWithListing[]> {
  const chain: OfferWithListing[] = [offer];
  let current = offer;
  while (current.parentOfferId) {
    const parent = await prisma.offer.findUniqueOrThrow({
      where: { id: current.parentOfferId },
      include: OFFER_INCLUDE,
    });
    current = parent as OfferWithListing;
    chain.unshift(current);
  }
  return chain;
}

export async function createOffer(buyerId: string, listingId: string, offerPrice: number) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw AppError.notFound("LISTING_NOT_FOUND", "Listing not found");
  if (listing.resellerId === buyerId) {
    throw AppError.badRequest("CANNOT_OFFER_OWN_LISTING", "You cannot make an offer on your own listing");
  }
  if (listing.status !== "ACTIVE") {
    throw AppError.badRequest("LISTING_NOT_AVAILABLE", "This listing is not available");
  }
  if (!listing.acceptsOffers) {
    throw AppError.badRequest("OFFERS_NOT_ACCEPTED", "This reseller does not accept offers on this listing");
  }

  const latest = await prisma.offer.findFirst({
    where: { listingId, buyerId },
    orderBy: { createdAt: "desc" },
    include: OFFER_INCLUDE,
  });

  if (latest) {
    const current = await expireIfNeeded(latest as OfferWithListing);
    if (current.status === "PENDING") {
      throw AppError.conflict("OFFER_ALREADY_OPEN", "You already have an open offer on this listing");
    }
  }

  const offer = await prisma.offer.create({
    data: { listingId, buyerId, offerPrice, status: "PENDING", expiresAt: new Date(Date.now() + OFFER_TTL_MS) },
    include: OFFER_INCLUDE,
  });

  return toPublicOffer(offer as OfferWithListing);
}

async function requireParticipant(userId: string, offerId: string) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: OFFER_INCLUDE });
  if (!offer) throw AppError.notFound("OFFER_NOT_FOUND", "Offer not found");
  const typed = offer as OfferWithListing;
  if (userId !== typed.buyerId && userId !== typed.listing.resellerId) {
    throw AppError.forbidden("NOT_OFFER_PARTICIPANT", "You are not part of this offer");
  }
  return typed;
}

export async function getOfferDetail(userId: string, offerId: string) {
  const offer = await expireIfNeeded(await requireParticipant(userId, offerId));
  const history = await getChainHistory(offer);
  const depth = await computeDepth(offer);
  const authoredByBuyer = depth % 2 === 0;
  const isMyTurn =
    offer.status === "PENDING" && (authoredByBuyer ? userId === offer.listing.resellerId : userId === offer.buyerId);

  return {
    ...toPublicOffer(offer),
    isMyTurn,
    history: history.map(toPublicOffer),
  };
}

export type OfferAction = "accept" | "decline" | "counter";

export async function respondToOffer(userId: string, offerId: string, action: OfferAction, counterPrice?: number) {
  const offer = await expireIfNeeded(await requireParticipant(userId, offerId));

  if (offer.status !== "PENDING") {
    throw AppError.badRequest("OFFER_NOT_ACTIONABLE", `This offer is ${offer.status.toLowerCase()} and can no longer be responded to`);
  }

  const depth = await computeDepth(offer);
  const authoredByBuyer = depth % 2 === 0;
  const recipientId = authoredByBuyer ? offer.listing.resellerId : offer.buyerId;
  if (userId !== recipientId) {
    throw AppError.forbidden("NOT_YOUR_TURN", "It's not your turn to respond to this offer");
  }

  if (action === "accept") {
    const updated = await prisma.offer.update({ where: { id: offer.id }, data: { status: "ACCEPTED" }, include: OFFER_INCLUDE });
    return toPublicOffer(updated as OfferWithListing);
  }

  if (action === "decline") {
    const updated = await prisma.offer.update({ where: { id: offer.id }, data: { status: "DECLINED" }, include: OFFER_INCLUDE });
    return toPublicOffer(updated as OfferWithListing);
  }

  if (!counterPrice) {
    throw AppError.badRequest("COUNTER_PRICE_REQUIRED", "A counter offer price is required");
  }

  const [, counter] = await prisma.$transaction([
    prisma.offer.update({ where: { id: offer.id }, data: { status: "COUNTERED" } }),
    prisma.offer.create({
      data: {
        listingId: offer.listingId,
        buyerId: offer.buyerId,
        offerPrice: counterPrice,
        status: "PENDING",
        parentOfferId: offer.id,
        expiresAt: new Date(Date.now() + OFFER_TTL_MS),
      },
      include: OFFER_INCLUDE,
    }),
  ]);

  return toPublicOffer(counter as OfferWithListing);
}

async function expireAllPending(offers: OfferWithListing[]): Promise<OfferWithListing[]> {
  return Promise.all(offers.map(expireIfNeeded));
}

function keepThreadHeads(offers: OfferWithListing[]): OfferWithListing[] {
  const parentIds = new Set(offers.map((o) => o.parentOfferId).filter((id): id is string => Boolean(id)));
  return offers.filter((o) => !parentIds.has(o.id));
}

export async function listMineAsBuyer(buyerId: string) {
  const offers = (await prisma.offer.findMany({
    where: { buyerId },
    orderBy: { createdAt: "desc" },
    include: OFFER_INCLUDE,
  })) as OfferWithListing[];

  const heads = keepThreadHeads(offers);
  const expired = await expireAllPending(heads);
  return expired.map(toPublicOffer);
}

export async function listReceivedAsReseller(resellerId: string) {
  const offers = (await prisma.offer.findMany({
    where: { listing: { resellerId } },
    orderBy: { createdAt: "desc" },
    include: OFFER_INCLUDE,
  })) as OfferWithListing[];

  const heads = keepThreadHeads(offers);
  const expired = await expireAllPending(heads);
  return expired.map(toPublicOffer);
}
