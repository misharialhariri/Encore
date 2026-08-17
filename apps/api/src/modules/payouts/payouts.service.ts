import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { getPlatformSettingNumber } from "../../services/platformSettings";
import type { z } from "zod";
import type { bankAccountSchema } from "./payouts.schemas";

type BankAccountInput = z.infer<typeof bankAccountSchema>;

export async function upsertBankAccount(resellerId: string, input: BankAccountInput) {
  return prisma.resellerBankAccount.upsert({
    where: { resellerId },
    update: { ...input, verified: false },
    create: { resellerId, ...input },
  });
}

export async function getBankAccount(resellerId: string) {
  return prisma.resellerBankAccount.findUnique({ where: { resellerId } });
}

async function computeAvailableBalance(resellerId: string) {
  const [earned, paidOut, pending] = await Promise.all([
    prisma.order.aggregate({ where: { resellerId, status: "COMPLETED" }, _sum: { itemPrice: true } }),
    prisma.payout.aggregate({ where: { resellerId, status: "PAID" }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { resellerId, status: { in: ["PENDING", "PROCESSING"] } }, _sum: { amount: true } }),
  ]);

  const totalEarned = earned._sum.itemPrice?.toNumber() ?? 0;
  const totalPaidOut = paidOut._sum.amount?.toNumber() ?? 0;
  const pendingPayouts = pending._sum.amount?.toNumber() ?? 0;

  return { totalEarned, totalPaidOut, pendingPayouts, availableBalance: totalEarned - totalPaidOut - pendingPayouts };
}

export async function getEarningsSummary(resellerId: string) {
  return computeAvailableBalance(resellerId);
}

export async function requestPayout(resellerId: string, amount: number) {
  const bankAccount = await prisma.resellerBankAccount.findUnique({ where: { resellerId } });
  if (!bankAccount) {
    throw AppError.badRequest("NO_BANK_ACCOUNT", "Add your bank account details before requesting a payout");
  }

  const minThreshold = await getPlatformSettingNumber("payout_min_threshold_sar", 100);
  if (amount < minThreshold) {
    throw AppError.badRequest("PAYOUT_BELOW_MINIMUM", `The minimum payout amount is ${minThreshold} SAR`);
  }

  const { availableBalance } = await computeAvailableBalance(resellerId);
  if (amount > availableBalance) {
    throw AppError.badRequest("INSUFFICIENT_BALANCE", "This amount exceeds your available balance");
  }

  return prisma.payout.create({ data: { resellerId, amount, status: "PENDING" } });
}

export async function listPayouts(resellerId: string) {
  return prisma.payout.findMany({ where: { resellerId }, orderBy: { requestedAt: "desc" } });
}
