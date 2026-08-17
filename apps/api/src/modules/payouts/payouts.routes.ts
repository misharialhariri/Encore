import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import * as payoutsService from "./payouts.service";
import { bankAccountSchema, requestPayoutSchema } from "./payouts.schemas";

export const payoutsRouter = Router();

payoutsRouter.use(requireAuth);

payoutsRouter.get("/bank-account", async (req, res) => {
  const bankAccount = await payoutsService.getBankAccount(req.userId!);
  res.json({ bankAccount });
});

payoutsRouter.put("/bank-account", async (req, res) => {
  const input = bankAccountSchema.parse(req.body);
  const bankAccount = await payoutsService.upsertBankAccount(req.userId!, input);
  res.json({ bankAccount });
});

payoutsRouter.get("/earnings", async (req, res) => {
  const earnings = await payoutsService.getEarningsSummary(req.userId!);
  res.json({ earnings });
});

payoutsRouter.get("/", async (req, res) => {
  const payouts = await payoutsService.listPayouts(req.userId!);
  res.json({ payouts });
});

payoutsRouter.post("/", async (req, res) => {
  const { amount } = requestPayoutSchema.parse(req.body);
  const payout = await payoutsService.requestPayout(req.userId!, amount);
  res.status(201).json({ payout });
});
