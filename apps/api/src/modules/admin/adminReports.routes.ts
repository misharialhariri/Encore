import { Router } from "express";
import { requireAdminAuth, requireAdminRole } from "../../middleware/adminAuth";
import * as moderationService from "./adminModeration.service";
import { resolveReportSchema } from "./adminModeration.schemas";

export const adminReportsRouter = Router();

adminReportsRouter.use(requireAdminAuth);
adminReportsRouter.use(requireAdminRole("OPS", "SUPPORT"));

adminReportsRouter.get("/", async (_req, res) => {
  const reports = await moderationService.listOpenReports();
  res.json({ reports });
});

adminReportsRouter.post("/:id/resolve", async (req, res) => {
  const input = resolveReportSchema.parse(req.body);
  const report = await moderationService.resolveReport(req.adminId!, req.params.id, input);
  res.json({ report });
});
