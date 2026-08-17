import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAdminAuth } from "../../middleware/adminAuth";

export const adminStatsRouter = Router();

adminStatsRouter.use(requireAdminAuth);

adminStatsRouter.get("/", async (_req, res) => {
  const [pendingListings, openReports, openDisputes, pendingVerifications, pendingPayouts] = await Promise.all([
    prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.payout.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
  ]);

  res.json({ pendingListings, openReports, openDisputes, pendingVerifications, pendingPayouts });
});
