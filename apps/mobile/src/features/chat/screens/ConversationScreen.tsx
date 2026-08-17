import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SharedListingRoutes } from "../../../navigation/types";
import { TextField } from "../../../components/TextField";
import { useAuthStore } from "../../../store/authStore";
import * as chatApi from "../../../api/chat";
import { extractApiErrorMessage } from "../../../api/client";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SharedListingRoutes, "Conversation">;

const POLL_INTERVAL_MS = 3000;

export function ConversationScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { conversationId } = route.params;

  const [conversation, setConversation] = useState<chatApi.ConversationSummary | null>(null);
  const [messages, setMessages] = useState<chatApi.Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<chatApi.Message>>(null);

  const loadConversationInfo = useCallback(async () => {
    const list = await chatApi.listConversations();
    const match = list.find((c) => c.id === conversationId) ?? null;
    setConversation(match);
    navigation.setOptions({ title: match?.otherParty.displayName ?? t("chat.title") });
  }, [conversationId, navigation, t]);

  const loadMessages = useCallback(async () => {
    const fetched = await chatApi.getMessages(conversationId);
    setMessages(fetched);
  }, [conversationId]);

  useEffect(() => {
    loadConversationInfo();
  }, [loadConversationInfo]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
      void chatApi.markConversationRead(conversationId);
      const interval = setInterval(() => {
        loadMessages();
        void chatApi.markConversationRead(conversationId);
      }, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [loadMessages, conversationId])
  );

  function handleBlock() {
    if (!conversation) return;
    Alert.alert(t("chat.blockUserTitle"), t("chat.blockUserConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("chat.block"),
        style: "destructive",
        onPress: async () => {
          await chatApi.blockUser(conversation.otherParty.id);
          navigation.goBack();
        },
      },
    ]);
  }

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleBlock} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.ink} />
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation]);

  async function handleSendText() {
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    setError(null);
    setText("");
    try {
      await chatApi.sendTextMessage(conversationId, content);
      await loadMessages();
      listRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not send message"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSendPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    setBusy(true);
    setError(null);
    try {
      const asset = result.assets[0];
      const contentType = asset.mimeType?.includes("png") ? "image/png" : asset.mimeType?.includes("webp") ? "image/webp" : "image/jpeg";
      const { uploadUrl, publicUrl } = await chatApi.getChatPhotoUploadUrl(contentType);
      await chatApi.uploadChatPhoto(uploadUrl, asset.uri, contentType);
      await chatApi.sendImageMessage(conversationId, publicUrl);
      await loadMessages();
      listRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not send photo"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      {conversation?.listing ? (
        <Pressable
          style={styles.listingBanner}
          onPress={() => navigation.navigate("ListingDetail", { listingId: conversation.listing!.id })}
        >
          {conversation.listing.coverImageUrl ? (
            <Image source={{ uri: conversation.listing.coverImageUrl }} style={styles.listingThumb} />
          ) : (
            <View style={[styles.listingThumb, styles.listingThumbPlaceholder]} />
          )}
          <Text style={styles.listingTitle} numberOfLines={1}>
            {conversation.listing.title}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isMine={item.senderId === currentUserId}
            onPressOfferCard={(offerId) => navigation.navigate("OfferThread", { offerId })}
          />
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.inputBar}>
        <Pressable onPress={handleSendPhoto} disabled={busy} style={styles.attachButton} hitSlop={8}>
          <Ionicons name="image-outline" size={24} color={colors.muted} />
        </Pressable>
        <View style={styles.textFieldWrap}>
          <TextField
            value={text}
            onChangeText={setText}
            placeholder={t("chat.messagePlaceholder")}
            multiline
            editable={!busy}
          />
        </View>
        <Pressable onPress={handleSendText} disabled={busy || !text.trim()} style={styles.sendButton} hitSlop={8}>
          <Ionicons name="send" size={20} color={text.trim() ? colors.accent : colors.muted} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({
  message,
  isMine,
  onPressOfferCard,
}: {
  message: chatApi.Message;
  isMine: boolean;
  onPressOfferCard: (offerId: string) => void;
}) {
  const { t } = useTranslation();

  if (message.type === "IMAGE" && message.imageUrl) {
    return (
      <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
        <Image source={{ uri: message.imageUrl }} style={styles.imageMessage} />
      </View>
    );
  }

  if (message.type === "OFFER_CARD" && message.offerId) {
    return (
      <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
        <Pressable style={styles.offerCard} onPress={() => onPressOfferCard(message.offerId!)}>
          <Ionicons name="pricetag-outline" size={16} color={colors.accent} />
          <Text style={styles.offerCardText}>{t("chat.viewOffer")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.paper },
  listingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  listingThumb: { width: 36, height: 36, borderRadius: radius.sm },
  listingThumbPlaceholder: { backgroundColor: colors.surfaceAlt },
  listingTitle: { flex: 1, fontSize: 13, color: colors.ink, fontWeight: "600" },
  messagesList: { padding: spacing.md, gap: spacing.xs },
  bubbleWrap: { maxWidth: "80%" },
  bubbleWrapMine: { alignSelf: "flex-end" },
  bubbleWrapTheirs: { alignSelf: "flex-start" },
  bubble: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginVertical: 2 },
  bubbleMine: { backgroundColor: colors.accent },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 14, color: colors.ink },
  bubbleTextMine: { color: colors.white },
  imageMessage: { width: 200, height: 200, borderRadius: radius.md, marginVertical: 2 },
  offerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginVertical: 2,
  },
  offerCardText: { fontSize: 13, fontWeight: "700", color: colors.accent },
  error: { color: colors.danger, fontSize: 12, paddingHorizontal: spacing.md },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  attachButton: { padding: spacing.xs, marginBottom: spacing.xs },
  textFieldWrap: { flex: 1 },
  sendButton: { padding: spacing.xs, marginBottom: spacing.xs },
});
