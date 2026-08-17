import { Router } from "express";
import { requireAdminAuth, requireAdminRole } from "../../middleware/adminAuth";
import * as adminDisputesService from "./adminDisputes.service";
import { resolveDisputeSchema } from "./adminDisputes.schemas";

export const adminDisputesRouter = Router();

adminDisputesRouter.use(requireAdminAuth);
adminDisputesRouter.use(requireAdminRole("OPS", "FINANCE"));

adminDisputesRouter.get("/", async (_req, res) => {
  const disputes = await adminDisputesService.listOpenDisputes();
  res.json({ disputes });
});

adminDisputesRouter.post("/:id/resolve", async (req, res) => {
  const input = resolveDisputeSchema.parse(req.body);
  const dispute = await adminDisputesService.resolveDispute(req.adminId!, req.params.id, input);
  res.json({ dispute });
});
