import React, { useCallback, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ChatStackParamList } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import * as chatApi from "../../../api/chat";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<ChatStackParamList, "ChatList">;

export function ChatListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<chatApi.ConversationSummary[]>([]);

  const load = useCallback(() => {
    chatApi.listConversations().then(setConversations);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, 5000);
      return () => clearInterval(interval);
    }, [load])
  );

  return (
    <ScreenContainer scroll={false}>
      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t("chat.empty")}</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationRow conversation={item} onPress={() => navigation.navigate("Conversation", { conversationId: item.id })} />
          )}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
        />
      )}
    </ScreenContainer>
  );
}

function ConversationRow({ conversation, onPress }: { conversation: chatApi.ConversationSummary; onPress: () => void }) {
  const { t } = useTranslation();
  const preview =
    conversation.lastMessage?.type === "IMAGE"
      ? t("chat.photoPreview")
      : conversation.lastMessage?.type === "OFFER_CARD"
        ? t("chat.offerPreview")
        : conversation.lastMessage?.content ?? "";

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {conversation.otherParty.profilePhotoUrl ? (
        <Image source={{ uri: conversation.otherParty.profilePhotoUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>{(conversation.otherParty.displayName ?? "?").charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>
            {conversation.otherParty.displayName ?? t("chat.title")}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
        {conversation.listing ? (
          <Text style={styles.listingTitle} numberOfLines={1}>
            {conversation.listing.title}
          </Text>
        ) : null}
        {preview ? (
          <Text style={styles.preview} numberOfLines={1}>
            {preview}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 20, fontWeight: "700", color: colors.accent },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink, flex: 1 },
  listingTitle: { fontSize: 12, color: colors.accent, marginTop: 2 },
  preview: { fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginStart: spacing.xs,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  divider: { height: 1, backgroundColor: colors.border },
});
