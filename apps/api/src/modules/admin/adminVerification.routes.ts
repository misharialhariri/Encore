import { Router } from "express";
import { requireAdminAuth, requireAdminRole } from "../../middleware/adminAuth";
import * as adminVerificationService from "./adminVerification.service";
import { rejectVerificationSchema } from "./adminVerification.schemas";

export const adminVerificationRouter = Router();

adminVerificationRouter.use(requireAdminAuth);
adminVerificationRouter.use(requireAdminRole("OPS", "SUPPORT"));

adminVerificationRouter.get("/", async (_req, res) => {
  const requests = await adminVerificationService.listPendingRequests();
  res.json({ requests });
});

adminVerificationRouter.post("/:id/approve", async (req, res) => {
  const request = await adminVerificationService.approveRequest(req.adminId!, req.params.id);
  res.json({ request });
});

adminVerificationRouter.post("/:id/reject", async (req, res) => {
  const input = rejectVerificationSchema.parse(req.body);
  const request = await adminVerificationService.rejectRequest(req.adminId!, req.params.id, input);
  res.json({ request });
});
