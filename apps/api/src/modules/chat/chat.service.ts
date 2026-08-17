import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { createPresignedUpload } from "../../services/s3";
import { notify, NotificationType } from "../../services/notifications";
import type { z } from "zod";
import type { sendMessageSchema } from "./chat.schemas";

const PARTICIPANT_SELECT = { id: true, displayName: true, profilePhotoUrl: true } as const;

const CONVERSATION_INCLUDE = {
  buyer: { select: PARTICIPANT_SELECT },
  reseller: { select: PARTICIPANT_SELECT },
} as const;

type ListingInfo = { id: string; title: string; coverImageUrl: string | null };

async function fetchListingInfoMap(listingIds: string[]): Promise<Map<string, ListingInfo>> {
  const uniqueIds = [...new Set(listingIds)];
  const listings = await prisma.listing.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, title: true, images: { orderBy: { position: "asc" }, take: 1 } },
  });
  return new Map(listings.map((l) => [l.id, { id: l.id, title: l.title, coverImageUrl: l.images[0]?.url ?? null }]));
}

function toPublicConversation(
  conversation: {
    id: string;
    buyerId: string;
    resellerId: string;
    listingId: string | null;
    lastMessageAt: Date;
    createdAt: Date;
    buyer: { id: string; displayName: string | null; profilePhotoUrl: string | null };
    reseller: { id: string; displayName: string | null; profilePhotoUrl: string | null };
  },
  viewerId: string,
  listingInfo: ListingInfo | null
) {
  const otherParty = viewerId === conversation.buyerId ? conversation.reseller : conversation.buyer;
  return {
    id: conversation.id,
    otherParty,
    listing: listingInfo,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
  };
}

async function requireParticipant(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, include: CONVERSATION_INCLUDE });
  if (!conversation) throw AppError.notFound("CONVERSATION_NOT_FOUND", "Conversation not found");
  if (userId !== conversation.buyerId && userId !== conversation.resellerId) {
    throw AppError.forbidden("NOT_CONVERSATION_PARTICIPANT", "You are not part of this conversation");
  }
  return conversation;
}

async function isBlockedEitherWay(userA: string, userB: string): Promise<boolean> {
  const block = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
  });
  return Boolean(block);
}

export async function startConversation(currentUserId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw AppError.notFound("LISTING_NOT_FOUND", "Listing not found");
  if (listing.resellerId === currentUserId) {
    throw AppError.badRequest("CANNOT_MESSAGE_OWN_LISTING", "You can't start a chat about your own listing");
  }

  if (await isBlockedEitherWay(currentUserId, listing.resellerId)) {
    throw AppError.forbidden("BLOCKED", "You can't message this user");
  }

  const conversation = await prisma.conversation.upsert({
    where: { buyerId_resellerId_listingId: { buyerId: currentUserId, resellerId: listing.resellerId, listingId } },
    update: {},
    create: { buyerId: currentUserId, resellerId: listing.resellerId, listingId },
    include: CONVERSATION_INCLUDE,
  });

  const listingInfoMap = await fetchListingInfoMap([listingId]);
  return toPublicConversation(conversation, currentUserId, listingInfoMap.get(listingId) ?? null);
}

export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { resellerId: userId }] },
    include: CONVERSATION_INCLUDE,
    orderBy: { lastMessageAt: "desc" },
  });

  const listingInfoMap = await fetchListingInfoMap(
    conversations.map((c) => c.listingId).filter((id): id is string => id !== null)
  );

  const withExtras = await Promise.all(
    conversations.map(async (conversation) => {
      const [lastMessage, unreadCount] = await Promise.all([
        prisma.message.findFirst({ where: { conversationId: conversation.id }, orderBy: { createdAt: "desc" } }),
        prisma.message.count({ where: { conversationId: conversation.id, senderId: { not: userId }, readAt: null } }),
      ]);
      return {
        ...toPublicConversation(conversation, userId, conversation.listingId ? listingInfoMap.get(conversation.listingId) ?? null : null),
        lastMessage: lastMessage
          ? { type: lastMessage.type, content: lastMessage.content, createdAt: lastMessage.createdAt }
          : null,
        unreadCount,
      };
    })
  );

  return withExtras;
}

function toPublicMessage(message: {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string | null;
  imageUrl: string | null;
  offerId: string | null;
  readAt: Date | null;
  createdAt: Date;
}) {
  return message;
}

export async function getMessages(userId: string, conversationId: string, beforeMessageId: string | undefined, limit: number) {
  await requireParticipant(userId, conversationId);

  let cursorDate: Date | undefined;
  if (beforeMessageId) {
    const cursor = await prisma.message.findUnique({ where: { id: beforeMessageId } });
    cursorDate = cursor?.createdAt;
  }

  const messages = await prisma.message.findMany({
    where: { conversationId, ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return messages.reverse().map(toPublicMessage);
}

type SendMessageInput = z.infer<typeof sendMessageSchema>;

export async function sendMessage(userId: string, conversationId: string, input: SendMessageInput) {
  const conversation = await requireParticipant(userId, conversationId);
  const otherPartyId = userId === conversation.buyerId ? conversation.resellerId : conversation.buyerId;

  if (await isBlockedEitherWay(userId, otherPartyId)) {
    throw AppError.forbidden("BLOCKED", "You can't message this user");
  }

  if (input.type === "OFFER_CARD" && input.offerId) {
    const offer = await prisma.offer.findUnique({ where: { id: input.offerId } });
    if (!offer || (offer.buyerId !== userId && offer.buyerId !== otherPartyId)) {
      throw AppError.badRequest("INVALID_OFFER", "This offer doesn't belong to this conversation");
    }
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: input.type,
        content: input.content,
        imageUrl: input.imageUrl,
        offerId: input.offerId,
      },
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ]);

  const sender = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
  const preview = input.type === "TEXT" ? (input.content ?? "").slice(0, 100) : input.type === "IMAGE" ? "📷 Photo" : "Sent an offer";
  await notify(otherPartyId, NotificationType.NEW_MESSAGE, {
    title: sender?.displayName ?? "New message",
    body: preview,
    data: { conversationId },
  });

  return toPublicMessage(message);
}

export async function markRead(userId: string, conversationId: string) {
  await requireParticipant(userId, conversationId);
  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function presignChatPhoto(contentType: string) {
  return createPresignedUpload("chat-images", contentType);
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw AppError.badRequest("CANNOT_BLOCK_SELF", "You can't block yourself");
  return prisma.blockedUser.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    update: {},
    create: { blockerId, blockedId },
  });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await prisma.blockedUser.deleteMany({ where: { blockerId, blockedId } });
}

export async function listBlocked(blockerId: string) {
  const rows = await prisma.blockedUser.findMany({
    where: { blockerId },
    include: { blocked: { select: PARTICIPANT_SELECT } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => r.blocked);
}
