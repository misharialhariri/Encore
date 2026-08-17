import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";

export async function getResellerProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      city: true,
      listings: {
        where: { status: "ACTIVE" },
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) throw AppError.notFound("USER_NOT_FOUND", "Reseller not found");

  const [totalSold, ratingAgg] = await Promise.all([
    prisma.order.count({ where: { resellerId: userId, status: "COMPLETED" } }),
    prisma.review.aggregate({ where: { resellerId: userId }, _avg: { rating: true }, _count: true }),
  ]);

  return {
    id: user.id,
    displayName: user.displayName,
    profilePhotoUrl: user.profilePhotoUrl,
    city: user.city ? { nameEn: user.city.nameEn, nameAr: user.city.nameAr } : null,
    memberSince: user.createdAt,
    isVerified: user.isVerified,
    totalSold,
    averageRating: ratingAgg._avg.rating,
    reviewCount: ratingAgg._count,
    activeListings: user.listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      askingPrice: listing.askingPrice.toNumber(),
      coverImageUrl: listing.images[0]?.url ?? null,
    })),
  };
}
