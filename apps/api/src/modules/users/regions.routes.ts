import { Router } from "express";
import { prisma } from "../../config/prisma";

export const regionsRouter = Router();

regionsRouter.get("/", async (_req, res) => {
  const regions = await prisma.region.findMany({
    include: { cities: { orderBy: { nameEn: "asc" } } },
    orderBy: { nameEn: "asc" },
  });
  res.json({ regions });
});
