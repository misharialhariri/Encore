import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { notify, NotificationType } from "../../services/notifications";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { rejectVerificationSchema } from "./adminVerification.schemas";

const REQUEST_INCLUDE = {
  user: { select: { id: true, displayName: true, phoneNumber: true } },
} satisfies Prisma.VerificationRequestInclude;

type AdminVerificationRequestWithUser = Prisma.VerificationRequestGetPayload<{ include: typeof REQUEST_INCLUDE }>;

function toAdminRequest(request: AdminVerificationRequestWithUser) {
  return {
    id: request.id,
    idDocumentUrl: request.idDocumentUrl,
    documentType: request.documentType,
    status: request.status,
    createdAt: request.createdAt,
    reviewedAt: request.reviewedAt,
    user: request.user,
  };
}

export async function listPendingRequests() {
  const requests = await prisma.verificationRequest.findMany({
    where: { status: "PENDING" },
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  return requests.map(toAdminRequest);
}

async function requirePendingRequest(requestId: string) {
  const request = await prisma.verificationRequest.findUnique({ where: { id: requestId } });
  if (!request) throw AppError.notFound("VERIFICATION_REQUEST_NOT_FOUND", "Verification request not found");
  if (request.status !== "PENDING") {
    throw AppError.badRequest("VERIFICATION_REQUEST_NOT_PENDING", "This request has already been reviewed");
  }
  return request;
}

export async function approveRequest(adminId: string, requestId: string) {
  const request = await requirePendingRequest(requestId);

  const [updated] = await prisma.$transaction([
    prisma.verificationRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", reviewedByAdminId: adminId, reviewedAt: new Date() },
      include: REQUEST_INCLUDE,
    }),
    prisma.user.update({ where: { id: request.userId }, data: { isVerified: true } }),
  ]);

  await notify(request.userId, NotificationType.VERIFICATION_UPDATE, {
    title: "You're verified",
    body: "Your identity verification was approved — you now show a verified badge.",
    data: { requestId },
  });

  return toAdminRequest(updated);
}

type RejectInput = z.infer<typeof rejectVerificationSchema>;

export async function rejectRequest(adminId: string, requestId: string, input: RejectInput) {
  const request = await requirePendingRequest(requestId);

  const updated = await prisma.verificationRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", reviewedByAdminId: adminId, reviewedAt: new Date() },
    include: REQUEST_INCLUDE,
  });

  await notify(request.userId, NotificationType.VERIFICATION_UPDATE, {
    title: "Verification rejected",
    body: input.reason ? `Your verification request was rejected: ${input.reason}` : "Your verification request was rejected. You can submit a new one.",
    data: { requestId },
  });

  return toAdminRequest(updated);
}
