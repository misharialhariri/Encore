import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "../../config/prisma";
import { createReportSchema } from "./reports.schemas";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

// Files a report into the OPEN queue that the Phase 7 admin panel reviews.
// No moderation workflow lives here yet — this is the buyer-facing intake.
reportsRouter.post("/", async (req, res) => {
  const input = createReportSchema.parse(req.body);
  const report = await prisma.report.create({
    data: {
      reporterId: req.userId!,
      targetType: input.targetType,
      listingId: input.listingId,
      reportedUserId: input.reportedUserId,
      reason: input.reason,
      description: input.description,
    },
  });
  res.status(201).json({ report: { id: report.id, status: report.status, createdAt: report.createdAt } });
});
