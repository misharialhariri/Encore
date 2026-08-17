import { Router } from "express";
import { z } from "zod";
import { requireAdminAuth, requireAdminRole } from "../../middleware/adminAuth";
import * as adminPayoutsService from "./adminPayouts.service";

export const adminPayoutsRouter = Router();

adminPayoutsRouter.use(requireAdminAuth);
adminPayoutsRouter.use(requireAdminRole("FINANCE"));

const listQuerySchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "PAID", "FAILED"]).optional(),
});

adminPayoutsRouter.get("/", async (req, res) => {
  const { status } = listQuerySchema.parse(req.query);
  const payouts = await adminPayoutsService.listPayouts(status);
  res.json({ payouts });
});

adminPayoutsRouter.post("/:id/mark-processing", async (req, res) => {
  const payout = await adminPayoutsService.markProcessing(req.params.id);
  res.json({ payout });
});

adminPayoutsRouter.post("/:id/mark-paid", async (req, res) => {
  const payout = await adminPayoutsService.markPaid(req.params.id);
  res.json({ payout });
});

adminPayoutsRouter.post("/:id/mark-failed", async (req, res) => {
  const payout = await adminPayoutsService.markFailed(req.params.id);
  res.json({ payout });
});
