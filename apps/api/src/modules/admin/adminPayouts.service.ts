import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { notify, NotificationType } from "../../services/notifications";
import type { Prisma, PayoutStatus } from "@prisma/client";

const PAYOUT_INCLUDE = {
  reseller: { select: { id: true, displayName: true, phoneNumber: true } },
} satisfies Prisma.PayoutInclude;

type AdminPayoutWithReseller = Prisma.PayoutGetPayload<{ include: typeof PAYOUT_INCLUDE }>;

function toAdminPayout(payout: AdminPayoutWithReseller) {
  return {
    id: payout.id,
    amount: payout.amount.toNumber(),
    status: payout.status,
    requestedAt: payout.requestedAt,
    processedAt: payout.processedAt,
    reseller: payout.reseller,
  };
}

export async function listPayouts(status?: PayoutStatus) {
  const payouts = await prisma.payout.findMany({
    where: status ? { status } : { status: { in: ["PENDING", "PROCESSING"] } },
    include: PAYOUT_INCLUDE,
    orderBy: { requestedAt: "asc" },
  });
  return payouts.map(toAdminPayout);
}

async function requirePayoutInStatus(payoutId: string, expected: string[]) {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) throw AppError.notFound("PAYOUT_NOT_FOUND", "Payout not found");
  if (!expected.includes(payout.status)) {
    throw AppError.badRequest("INVALID_PAYOUT_STATUS", `Cannot transition a payout in status ${payout.status}`);
  }
  return payout;
}

export async function markProcessing(payoutId: string) {
  const payout = await requirePayoutInStatus(payoutId, ["PENDING"]);
  const updated = await prisma.payout.update({ where: { id: payoutId }, data: { status: "PROCESSING" }, include: PAYOUT_INCLUDE });

  await notify(payout.resellerId, NotificationType.PAYOUT_UPDATE, {
    title: "Payout processing",
    body: `Your payout of ${payout.amount.toNumber()} SAR is being processed`,
    data: { payoutId },
  });

  return toAdminPayout(updated);
}

export async function markPaid(payoutId: string) {
  const payout = await requirePayoutInStatus(payoutId, ["PENDING", "PROCESSING"]);
  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: { status: "PAID", processedAt: new Date() },
    include: PAYOUT_INCLUDE,
  });

  await notify(payout.resellerId, NotificationType.PAYOUT_UPDATE, {
    title: "Payout sent",
    body: `Your payout of ${payout.amount.toNumber()} SAR has been paid`,
    data: { payoutId },
  });

  return toAdminPayout(updated);
}

export async function markFailed(payoutId: string) {
  const payout = await requirePayoutInStatus(payoutId, ["PENDING", "PROCESSING"]);
  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: { status: "FAILED", processedAt: new Date() },
    include: PAYOUT_INCLUDE,
  });

  await notify(payout.resellerId, NotificationType.PAYOUT_UPDATE, {
    title: "Payout failed",
    body: `Your payout of ${payout.amount.toNumber()} SAR could not be completed. Please check your bank details.`,
    data: { payoutId },
  });

  return toAdminPayout(updated);
}
