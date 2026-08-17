import { z } from "zod";

export const createVerificationRequestSchema = z.object({
  idDocumentUrl: z.string().url(),
  documentType: z.enum(["NATIONAL_ID", "IQAMA"]),
});

export const presignVerificationDocSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
