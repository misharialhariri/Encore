import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { createPresignedUpload } from "../../services/s3";
import type { Prisma } from "@prisma/client";

type UserWithCity = Prisma.UserGetPayload<{ include: { city: true } }>;

function toPublicUser(user: UserWithCity) {
  return {
    id: user.id,
    phoneNumber: user.phoneNumber,
    email: user.email,
    displayName: user.displayName,
    profilePhotoUrl: user.profilePhotoUrl,
    city: user.city ? { id: user.city.id, nameEn: user.city.nameEn, nameAr: user.city.nameAr } : null,
    userType: user.userType,
    isVerified: user.isVerified,
    languagePref: user.languagePref,
    biometricEnabled: user.biometricEnabled,
    createdAt: user.createdAt,
    needsProfileSetup: !user.displayName || !user.userType,
  };
}

export async function getMe(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { city: true },
  });
}

export async function getMePublic(userId: string) {
  const user = await getMe(userId).catch(() => {
    throw AppError.notFound("USER_NOT_FOUND", "User not found");
  });
  return toPublicUser(user);
}

export async function updateMe(userId: string, data: Prisma.UserUpdateInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    include: { city: true },
  });
  return toPublicUser(user);
}

export async function presignProfilePhoto(contentType: string) {
  return createPresignedUpload("profile-photos", contentType);
}
