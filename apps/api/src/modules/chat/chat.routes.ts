import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import * as chatService from "./chat.service";
import { blockUserSchema, messagesQuerySchema, presignChatPhotoSchema, sendMessageSchema, startConversationSchema } from "./chat.schemas";

export const chatRouter = Router();

chatRouter.use(requireAuth);

chatRouter.post("/conversations", async (req, res) => {
  const { listingId } = startConversationSchema.parse(req.body);
  const conversation = await chatService.startConversation(req.userId!, listingId);
  res.status(201).json({ conversation });
});

chatRouter.get("/conversations", async (req, res) => {
  const conversations = await chatService.listConversations(req.userId!);
  res.json({ conversations });
});

chatRouter.get("/conversations/:id/messages", async (req, res) => {
  const { beforeMessageId, limit } = messagesQuerySchema.parse(req.query);
  const messages = await chatService.getMessages(req.userId!, req.params.id, beforeMessageId, limit);
  res.json({ messages });
});

chatRouter.post("/conversations/:id/messages", async (req, res) => {
  const input = sendMessageSchema.parse(req.body);
  const message = await chatService.sendMessage(req.userId!, req.params.id, input);
  res.status(201).json({ message });
});

chatRouter.post("/conversations/:id/read", async (req, res) => {
  await chatService.markRead(req.userId!, req.params.id);
  res.status(204).send();
});

chatRouter.post("/photo-upload-url", async (req, res) => {
  const { contentType } = presignChatPhotoSchema.parse(req.body);
  const result = await chatService.presignChatPhoto(contentType);
  res.json(result);
});

chatRouter.get("/blocked", async (req, res) => {
  const blocked = await chatService.listBlocked(req.userId!);
  res.json({ blocked });
});

chatRouter.post("/block", async (req, res) => {
  const { userId } = blockUserSchema.parse(req.body);
  await chatService.blockUser(req.userId!, userId);
  res.status(204).send();
});

chatRouter.delete("/block/:userId", async (req, res) => {
  await chatService.unblockUser(req.userId!, req.params.userId);
  res.status(204).send();
});
