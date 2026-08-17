import { apiClient, uploadToPresignedUrl } from "./client";

export type MessageType = "TEXT" | "IMAGE" | "OFFER_CARD";

export interface ConversationParty {
  id: string;
  displayName: string | null;
  profilePhotoUrl: string | null;
}

export interface ConversationListingInfo {
  id: string;
  title: string;
  coverImageUrl: string | null;
}

export interface Conversation {
  id: string;
  otherParty: ConversationParty;
  listing: ConversationListingInfo | null;
  lastMessageAt: string;
  createdAt: string;
}

export interface ConversationSummary extends Conversation {
  lastMessage: { type: MessageType; content: string | null; createdAt: string } | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  imageUrl: string | null;
  offerId: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function startConversation(listingId: string): Promise<Conversation> {
  const { data } = await apiClient.post("/chat/conversations", { listingId });
  return data.conversation;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const { data } = await apiClient.get("/chat/conversations");
  return data.conversations;
}

export async function getMessages(conversationId: string, beforeMessageId?: string): Promise<Message[]> {
  const { data } = await apiClient.get(`/chat/conversations/${conversationId}/messages`, {
    params: beforeMessageId ? { beforeMessageId } : undefined,
  });
  return data.messages;
}

export async function sendTextMessage(conversationId: string, content: string): Promise<Message> {
  const { data } = await apiClient.post(`/chat/conversations/${conversationId}/messages`, { type: "TEXT", content });
  return data.message;
}

export async function sendImageMessage(conversationId: string, imageUrl: string): Promise<Message> {
  const { data } = await apiClient.post(`/chat/conversations/${conversationId}/messages`, { type: "IMAGE", imageUrl });
  return data.message;
}

export async function sendOfferCardMessage(conversationId: string, offerId: string): Promise<Message> {
  const { data } = await apiClient.post(`/chat/conversations/${conversationId}/messages`, { type: "OFFER_CARD", offerId });
  return data.message;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await apiClient.post(`/chat/conversations/${conversationId}/read`);
}

export async function getChatPhotoUploadUrl(
  contentType: "image/jpeg" | "image/png" | "image/webp"
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const { data } = await apiClient.post("/chat/photo-upload-url", { contentType });
  return data;
}

export const uploadChatPhoto = uploadToPresignedUrl;

export async function listBlockedUsers(): Promise<ConversationParty[]> {
  const { data } = await apiClient.get("/chat/blocked");
  return data.blocked;
}

export async function blockUser(userId: string): Promise<void> {
  await apiClient.post("/chat/block", { userId });
}

export async function unblockUser(userId: string): Promise<void> {
  await apiClient.delete(`/chat/block/${userId}`);
}
