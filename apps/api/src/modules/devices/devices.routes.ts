import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middleware/auth";

export const devicesRouter = Router();

devicesRouter.use(requireAuth);

const registerSchema = z.object({
  pushToken: z.string().min(1),
  platform: z.enum(["IOS", "ANDROID"]),
});

devicesRouter.post("/", async (req, res) => {
  const { pushToken, platform } = registerSchema.parse(req.body);
  const device = await prisma.device.upsert({
    where: { userId_pushToken: { userId: req.userId!, pushToken } },
    update: { lastActiveAt: new Date(), platform },
    create: { userId: req.userId!, pushToken, platform },
  });
  res.status(201).json({ device });
});

devicesRouter.delete("/:pushToken", async (req, res) => {
  await prisma.device.deleteMany({ where: { userId: req.userId!, pushToken: req.params.pushToken } });
  res.status(204).send();
});
