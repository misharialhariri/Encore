import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { getPlatformSettingNumber } from "../../services/platformSettings";
import { createPresignedUpload } from "../../services/s3";
import { notify, NotificationType } from "../../services/notifications";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { openDisputeSchema } from "./disputes.schemas";

const DISPUTE_INCLUDE = {
  order: {
    include: {
      listing: { include: { images: { orderBy: { position: "asc" as const }, take: 1 } } },
    },
  },
} satisfies Prisma.DisputeInclude;

type DisputeWithOrder = Prisma.DisputeGetPayload<{ include: typeof DISPUTE_INCLUDE }>;

function toPublicDispute(dispute: DisputeWithOrder) {
  return {
    id: dispute.id,
    order: {
      id: dispute.order.id,
      title: dispute.order.listing.title,
      coverImageUrl: dispute.order.listing.images[0]?.url ?? null,
      buyerId: dispute.order.buyerId,
      resellerId: dispute.order.resellerId,
    },
    reason: dispute.reason,
    description: dispute.description,
    evidencePhotos: dispute.evidencePhotos,
    status: dispute.status,
    resolution: dispute.resolution,
    openedAt: dispute.openedAt,
    deadlineAt: dispute.deadlineAt,
    resolvedAt: dispute.resolvedAt,
  };
}

type OpenDisputeInput = z.infer<typeof openDisputeSchema>;

export async function openDispute(buyerId: string, input: OpenDisputeInput) {
  const order = await prisma.order.findUnique({ where: { id: input.orderId }, include: { listing: true } });
  if (!order) throw AppError.notFound("ORDER_NOT_FOUND", "Order not found");
  if (order.buyerId !== buyerId) throw AppError.forbidden("NOT_ORDER_BUYER", "Only the buyer can open a dispute on this order");
  if (order.status !== "SHIPPED" && order.status !== "DELIVERED") {
    throw AppError.badRequest("INVALID_ORDER_STATUS", `Cannot open a dispute on an order in status ${order.status}`);
  }

  const existingOpen = await prisma.dispute.findFirst({
    where: { orderId: order.id, status: { in: ["OPEN", "UNDER_REVIEW"] } },
  });
  if (existingOpen) throw AppError.badRequest("DISPUTE_ALREADY_OPEN", "There is already an open dispute for this order");

  const windowHours = await getPlatformSettingNumber("dispute_resolution_hours", 72);
  const deadlineAt = new Date(Date.now() + windowHours * 60 * 60 * 1000);

  const [dispute] = await prisma.$transaction([
    prisma.dispute.create({
      data: {
        orderId: order.id,
        buyerId,
        reason: input.reason,
        description: input.description,
        evidencePhotos: input.evidencePhotos,
        deadlineAt,
      },
      include: DISPUTE_INCLUDE,
    }),
    prisma.order.update({ where: { id: order.id }, data: { status: "DISPUTED" } }),
  ]);

  await notify(order.resellerId, NotificationType.DISPUTE_UPDATE, {
    title: "Dispute opened",
    body: `The buyer opened a dispute on "${order.listing.title}"`,
    data: { orderId: order.id, disputeId: dispute.id },
  });

  return toPublicDispute(dispute);
}

async function requireParticipant(userId: string, disputeId: string) {
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId }, include: DISPUTE_INCLUDE });
  if (!dispute) throw AppError.notFound("DISPUTE_NOT_FOUND", "Dispute not found");
  if (userId !== dispute.buyerId && userId !== dispute.order.resellerId) {
    throw AppError.forbidden("NOT_DISPUTE_PARTICIPANT", "You are not part of this dispute");
  }
  return dispute;
}

export async function getDisputeDetail(userId: string, disputeId: string) {
  const dispute = await requireParticipant(userId, disputeId);
  return toPublicDispute(dispute);
}

export async function getDisputeForOrder(userId: string, orderId: string) {
  const dispute = await prisma.dispute.findFirst({
    where: { orderId, OR: [{ buyerId: userId }, { order: { resellerId: userId } }] },
    include: DISPUTE_INCLUDE,
    orderBy: { openedAt: "desc" },
  });
  return dispute ? toPublicDispute(dispute) : null;
}

export async function listMyDisputes(userId: string) {
  const disputes = await prisma.dispute.findMany({
    where: { OR: [{ buyerId: userId }, { order: { resellerId: userId } }] },
    include: DISPUTE_INCLUDE,
    orderBy: { openedAt: "desc" },
  });
  return disputes.map(toPublicDispute);
}

export async function presignDisputeEvidence(contentType: string) {
  return createPresignedUpload("dispute-evidence", contentType);
}
