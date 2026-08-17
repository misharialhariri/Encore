import { z } from "zod";

export const openDisputeSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(1000),
  evidencePhotos: z.array(z.string().url()).max(6).default([]),
});

export const presignDisputeEvidenceSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
