import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { createPresignedUpload } from "../../services/s3";
import type { z } from "zod";
import type { createVerificationRequestSchema } from "./verification.schemas";

function toPublicRequest(request: {
  id: string;
  documentType: string;
  status: string;
  createdAt: Date;
  reviewedAt: Date | null;
}) {
  return {
    id: request.id,
    documentType: request.documentType,
    status: request.status,
    createdAt: request.createdAt,
    reviewedAt: request.reviewedAt,
  };
}

type CreateInput = z.infer<typeof createVerificationRequestSchema>;

// The submission side of reseller identity verification: a reseller uploads
// an ID photo and this sits PENDING. Approving/rejecting it (and flipping
// User.isVerified) is an admin action that arrives with the Phase 7 admin
// panel and its own auth — there's no admin identity to attach yet.
export async function submitVerificationRequest(userId: string, input: CreateInput) {
  const existingPending = await prisma.verificationRequest.findFirst({ where: { userId, status: "PENDING" } });
  if (existingPending) {
    throw AppError.badRequest("VERIFICATION_ALREADY_PENDING", "You already have a verification request under review");
  }

  const request = await prisma.verificationRequest.create({
    data: { userId, idDocumentUrl: input.idDocumentUrl, documentType: input.documentType },
  });
  return toPublicRequest(request);
}

export async function getMyLatestVerificationRequest(userId: string) {
  const request = await prisma.verificationRequest.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return request ? toPublicRequest(request) : null;
}

export async function presignVerificationDoc(contentType: string) {
  return createPresignedUpload("verification-docs", contentType);
}
