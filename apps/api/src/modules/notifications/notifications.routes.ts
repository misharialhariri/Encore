import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../utils/AppError";
import { ALL_NOTIFICATION_TYPES } from "../../services/notifications";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ notifications });
});

notificationsRouter.get("/unread-count", async (req, res) => {
  const count = await prisma.notification.count({ where: { userId: req.userId!, isRead: false } });
  res.json({ count });
});

notificationsRouter.post("/read-all", async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.userId!, isRead: false }, data: { isRead: true } });
  res.status(204).send();
});

notificationsRouter.post("/:id/read", async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification) throw AppError.notFound("NOTIFICATION_NOT_FOUND", "Notification not found");
  if (notification.userId !== req.userId) throw AppError.forbidden("NOT_YOUR_NOTIFICATION", "This isn't your notification");

  await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.status(204).send();
});

notificationsRouter.delete("/", async (req, res) => {
  await prisma.notification.deleteMany({ where: { userId: req.userId! } });
  res.status(204).send();
});

notificationsRouter.get("/preferences", async (req, res) => {
  const rows = await prisma.notificationPreference.findMany({ where: { userId: req.userId! } });
  const byType = new Map(rows.map((r) => [r.type, r.enabled]));
  const preferences = ALL_NOTIFICATION_TYPES.map((type) => ({ type, enabled: byType.get(type) ?? true }));
  res.json({ preferences });
});

const updatePreferenceSchema = z.object({
  type: z.enum(ALL_NOTIFICATION_TYPES as [string, ...string[]]),
  enabled: z.boolean(),
});

notificationsRouter.put("/preferences", async (req, res) => {
  const { type, enabled } = updatePreferenceSchema.parse(req.body);
  const preference = await prisma.notificationPreference.upsert({
    where: { userId_type: { userId: req.userId!, type } },
    update: { enabled },
    create: { userId: req.userId!, type, enabled },
  });
  res.json({ preference });
});
