import { Router } from "express";
import { prisma } from "../../config/prisma";

export const styleTagsRouter = Router();

styleTagsRouter.get("/", async (_req, res) => {
  const styleTags = await prisma.styleTag.findMany({ orderBy: { nameEn: "asc" } });
  res.json({ styleTags });
});
