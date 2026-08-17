import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { notify, NotificationType } from "../../services/notifications";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { rejectListingSchema, resolveReportSchema } from "./adminModeration.schemas";

const LISTING_SUMMARY_INCLUDE = {
  images: { orderBy: { position: "asc" as const } },
  reseller: { select: { id: true, displayName: true, phoneNumber: true, email: true } },
} satisfies Prisma.ListingInclude;

type AdminListingWithRelations = Prisma.ListingGetPayload<{ include: typeof LISTING_SUMMARY_INCLUDE }>;

function toAdminListing(listing: AdminListingWithRelations) {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    askingPrice: listing.askingPrice.toNumber(),
    status: listing.status,
    createdAt: listing.createdAt,
    reseller: listing.reseller,
    images: listing.images.map((img) => img.url),
  };
}

export async function listPendingListings() {
  const listings = await prisma.listing.findMany({
    where: { status: "PENDING_REVIEW" },
    include: LISTING_SUMMARY_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  return listings.map(toAdminListing);
}

async function requirePendingListing(listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw AppError.notFound("LISTING_NOT_FOUND", "Listing not found");
  if (listing.status !== "PENDING_REVIEW") {
    throw AppError.badRequest("LISTING_NOT_PENDING", "This listing isn't awaiting review");
  }
  return listing;
}

export async function approveListing(listingId: string) {
  const listing = await requirePendingListing(listingId);
  const updated = await prisma.listing.update({ where: { id: listingId }, data: { status: "ACTIVE" }, include: LISTING_SUMMARY_INCLUDE });

  await notify(listing.resellerId, NotificationType.LISTING_MODERATED, {
    title: "Listing approved",
    body: `"${listing.title}" is now live`,
    data: { listingId },
  });

  return toAdminListing(updated);
}

type RejectInput = z.infer<typeof rejectListingSchema>;

export async function rejectListing(listingId: string, input: RejectInput) {
  const listing = await requirePendingListing(listingId);
  const updated = await prisma.listing.update({ where: { id: listingId }, data: { status: "REMOVED" }, include: LISTING_SUMMARY_INCLUDE });

  await notify(listing.resellerId, NotificationType.LISTING_MODERATED, {
    title: "Listing rejected",
    body: input.reason ? `"${listing.title}" was rejected: ${input.reason}` : `"${listing.title}" was rejected`,
    data: { listingId },
  });

  return toAdminListing(updated);
}

const REPORT_INCLUDE = {
  reporter: { select: { id: true, displayName: true, phoneNumber: true } },
  listing: { select: { id: true, title: true, status: true } },
} satisfies Prisma.ReportInclude;

type AdminReportWithRelations = Prisma.ReportGetPayload<{ include: typeof REPORT_INCLUDE }>;

function toAdminReport(report: AdminReportWithRelations) {
  return {
    id: report.id,
    targetType: report.targetType,
    listingId: report.listingId,
    listing: report.listing,
    reportedUserId: report.reportedUserId,
    reason: report.reason,
    description: report.description,
    status: report.status,
    createdAt: report.createdAt,
    reporter: report.reporter,
  };
}

export async function listOpenReports() {
  const reports = await prisma.report.findMany({
    where: { status: "OPEN" },
    include: REPORT_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  return reports.map(toAdminReport);
}

type ResolveReportInput = z.infer<typeof resolveReportSchema>;

export async function resolveReport(adminId: string, reportId: string, input: ResolveReportInput) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw AppError.notFound("REPORT_NOT_FOUND", "Report not found");

  if (input.removeListing && report.listingId) {
    await prisma.listing.update({ where: { id: report.listingId }, data: { status: "REMOVED" } });
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: { status: input.status, reviewedByAdminId: adminId },
    include: REPORT_INCLUDE,
  });
  return toAdminReport(updated);
}
