import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { notify, NotificationType } from "../../services/notifications";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { resolveDisputeSchema } from "./adminDisputes.schemas";

const DISPUTE_INCLUDE = {
  buyer: { select: { id: true, displayName: true, phoneNumber: true } },
  order: {
    include: {
      listing: { select: { id: true, title: true } },
      payment: true,
    },
  },
} satisfies Prisma.DisputeInclude;

type AdminDisputeWithRelations = Prisma.DisputeGetPayload<{ include: typeof DISPUTE_INCLUDE }>;

function toAdminDispute(dispute: AdminDisputeWithRelations) {
  return {
    id: dispute.id,
    reason: dispute.reason,
    description: dispute.description,
    evidencePhotos: dispute.evidencePhotos,
    status: dispute.status,
    resolution: dispute.resolution,
    openedAt: dispute.openedAt,
    deadlineAt: dispute.deadlineAt,
    resolvedAt: dispute.resolvedAt,
    buyer: dispute.buyer,
    order: {
      id: dispute.order.id,
      title: dispute.order.listing.title,
      resellerId: dispute.order.resellerId,
      totalAmount: dispute.order.totalAmount.toNumber(),
      escrowStatus: dispute.order.payment?.escrowStatus ?? null,
    },
  };
}

export async function listOpenDisputes() {
  const disputes = await prisma.dispute.findMany({
    where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
    include: DISPUTE_INCLUDE,
    orderBy: { openedAt: "asc" },
  });
  return disputes.map(toAdminDispute);
}

type ResolveInput = z.infer<typeof resolveDisputeSchema>;

export async function resolveDispute(adminId: string, disputeId: string, input: ResolveInput) {
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId }, include: DISPUTE_INCLUDE });
  if (!dispute) throw AppError.notFound("DISPUTE_NOT_FOUND", "Dispute not found");
  if (dispute.status === "RESOLVED") {
    throw AppError.badRequest("DISPUTE_ALREADY_RESOLVED", "This dispute has already been resolved");
  }

  const nextOrderStatus = input.outcome === "RELEASE_TO_RESELLER" ? "COMPLETED" : "CANCELLED";
  const nextEscrowStatus = input.outcome === "RELEASE_TO_RESELLER" ? "RELEASED" : "REFUNDED";

  await prisma.$transaction([
    prisma.dispute.update({
      where: { id: disputeId },
      data: { status: "RESOLVED", resolution: input.resolution, adminId, resolvedAt: new Date() },
    }),
    prisma.order.update({ where: { id: dispute.orderId }, data: { status: nextOrderStatus } }),
    prisma.payment.update({ where: { orderId: dispute.orderId }, data: { escrowStatus: nextEscrowStatus } }),
  ]);

  const updated = await prisma.dispute.findUniqueOrThrow({ where: { id: disputeId }, include: DISPUTE_INCLUDE });

  const resolutionSummary =
    input.outcome === "RELEASE_TO_RESELLER" ? "Payment released to the reseller" : "Buyer refunded";
  await Promise.all([
    notify(dispute.buyerId, NotificationType.DISPUTE_UPDATE, {
      title: "Dispute resolved",
      body: `${resolutionSummary} for "${dispute.order.listing.title}": ${input.resolution}`,
      data: { disputeId, orderId: dispute.orderId },
    }),
    notify(dispute.order.resellerId, NotificationType.DISPUTE_UPDATE, {
      title: "Dispute resolved",
      body: `${resolutionSummary} for "${dispute.order.listing.title}": ${input.resolution}`,
      data: { disputeId, orderId: dispute.orderId },
    }),
  ]);

  return toAdminDispute(updated);
}
