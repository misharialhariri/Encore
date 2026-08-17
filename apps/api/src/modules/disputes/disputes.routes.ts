import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import * as disputesService from "./disputes.service";
import { openDisputeSchema, presignDisputeEvidenceSchema } from "./disputes.schemas";

export const disputesRouter = Router();

disputesRouter.use(requireAuth);

disputesRouter.post("/", async (req, res) => {
  const input = openDisputeSchema.parse(req.body);
  const dispute = await disputesService.openDispute(req.userId!, input);
  res.status(201).json({ dispute });
});

disputesRouter.get("/mine", async (req, res) => {
  const disputes = await disputesService.listMyDisputes(req.userId!);
  res.json({ disputes });
});

disputesRouter.get("/by-order/:orderId", async (req, res) => {
  const dispute = await disputesService.getDisputeForOrder(req.userId!, req.params.orderId);
  res.json({ dispute });
});

disputesRouter.get("/:id", async (req, res) => {
  const dispute = await disputesService.getDisputeDetail(req.userId!, req.params.id);
  res.json({ dispute });
});

disputesRouter.post("/evidence-upload-url", async (req, res) => {
  const { contentType } = presignDisputeEvidenceSchema.parse(req.body);
  const result = await disputesService.presignDisputeEvidence(contentType);
  res.json(result);
});
