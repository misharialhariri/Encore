import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { validate } from "../../middleware/validate";

export const brandsRouter = Router();

const listBrandsQuerySchema = z.object({
  query: z.string().trim().max(100).optional(),
});

brandsRouter.get("/", validate(listBrandsQuerySchema, "query"), async (req, res) => {
  const { query } = req.query as unknown as z.infer<typeof listBrandsQuerySchema>;

  const brands = await prisma.brand.findMany({
    where: {
      isActive: true,
      ...(query
        ? { OR: [{ nameEn: { contains: query, mode: "insensitive" } }, { nameAr: { contains: query } }] }
        : {}),
    },
    orderBy: { nameEn: "asc" },
    take: 20,
  });

  res.json({ brands });
});
