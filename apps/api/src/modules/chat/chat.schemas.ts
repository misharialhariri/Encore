import { z } from "zod";

export const startConversationSchema = z.object({
  listingId: z.string().uuid(),
});

export const sendMessageSchema = z
  .object({
    type: z.enum(["TEXT", "IMAGE", "OFFER_CARD"]),
    content: z.string().trim().max(2000).optional(),
    imageUrl: z.string().url().optional(),
    offerId: z.string().uuid().optional(),
  })
  .refine((data) => (data.type === "TEXT" ? Boolean(data.content) : true), { message: "content is required for text messages" })
  .refine((data) => (data.type === "IMAGE" ? Boolean(data.imageUrl) : true), { message: "imageUrl is required for image messages" })
  .refine((data) => (data.type === "OFFER_CARD" ? Boolean(data.offerId) : true), { message: "offerId is required for offer card messages" });

export const presignChatPhotoSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export const blockUserSchema = z.object({
  userId: z.string().uuid(),
});

export const messagesQuerySchema = z.object({
  beforeMessageId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
