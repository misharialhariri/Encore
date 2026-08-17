import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";

export async function listSettings() {
  return prisma.platformSetting.findMany({ orderBy: { key: "asc" } });
}

export async function updateSetting(adminId: string, key: string, value: string) {
  return prisma.platformSetting.upsert({
    where: { key },
    update: { value, updatedByAdminId: adminId },
    create: { key, value, updatedByAdminId: adminId },
  });
}

export async function listBannedKeywords() {
  return prisma.bannedKeyword.findMany({ orderBy: { keyword: "asc" } });
}

export async function addBannedKeyword(keyword: string) {
  return prisma.bannedKeyword.upsert({ where: { keyword }, update: {}, create: { keyword } });
}

export async function removeBannedKeyword(id: string) {
  const keyword = await prisma.bannedKeyword.findUnique({ where: { id } });
  if (!keyword) throw AppError.notFound("BANNED_KEYWORD_NOT_FOUND", "Banned keyword not found");
  await prisma.bannedKeyword.delete({ where: { id } });
}
