import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import * as verificationService from "./verification.service";
import { createVerificationRequestSchema, presignVerificationDocSchema } from "./verification.schemas";

export const verificationRouter = Router();

verificationRouter.use(requireAuth);

verificationRouter.post("/requests", async (req, res) => {
  const input = createVerificationRequestSchema.parse(req.body);
  const request = await verificationService.submitVerificationRequest(req.userId!, input);
  res.status(201).json({ request });
});

verificationRouter.get("/requests/me", async (req, res) => {
  const request = await verificationService.getMyLatestVerificationRequest(req.userId!);
  res.json({ request });
});

verificationRouter.post("/document-upload-url", async (req, res) => {
  const { contentType } = presignVerificationDocSchema.parse(req.body);
  const result = await verificationService.presignVerificationDoc(contentType);
  res.json(result);
});
