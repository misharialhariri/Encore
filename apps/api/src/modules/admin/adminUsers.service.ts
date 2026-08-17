import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import type { UserStatus } from "@prisma/client";

const USER_SUMMARY_SELECT = {
  id: true,
  phoneNumber: true,
  email: true,
  displayName: true,
  userType: true,
  isVerified: true,
  status: true,
  createdAt: true,
} as const;

export async function searchUsers(query?: string) {
  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { displayName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phoneNumber: { contains: query } },
          ],
        }
      : undefined,
    select: USER_SUMMARY_SELECT,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return users;
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SUMMARY_SELECT });
  if (!user) throw AppError.notFound("USER_NOT_FOUND", "User not found");

  const [listingsCount, ordersAsBuyerCount, reportsFiledCount, reportsAgainstCount] = await Promise.all([
    prisma.listing.count({ where: { resellerId: userId } }),
    prisma.order.count({ where: { buyerId: userId } }),
    prisma.report.count({ where: { reporterId: userId } }),
    prisma.report.count({ where: { reportedUserId: userId } }),
  ]);

  return { ...user, listingsCount, ordersAsBuyerCount, reportsFiledCount, reportsAgainstCount };
}

async function setStatus(userId: string, status: UserStatus) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound("USER_NOT_FOUND", "User not found");
  return prisma.user.update({ where: { id: userId }, data: { status }, select: USER_SUMMARY_SELECT });
}

export const suspendUser = (userId: string) => setStatus(userId, "SUSPENDED");
export const banUser = (userId: string) => setStatus(userId, "BANNED");
export const reactivateUser = (userId: string) => setStatus(userId, "ACTIVE");
