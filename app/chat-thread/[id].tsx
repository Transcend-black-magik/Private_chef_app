import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import RoundedAvatar from "@/components/RoundedAvatar";
import { matchesAccountIdentifier } from "@/lib/account-identity";
import {
  getCurrentUserRecord,
  getUserByIdentifier,
  type StoredUser,
} from "@/lib/app-state";
import {
  getThreadPartnerReadAt,
  markThreadAsRead,
  sendMessageToThread,
  subscribeToMessagesForThread,
  subscribeToThreadById,
  type ChatMessageRecord,
  type ChatThreadRecord,
} from "@/lib/marketplace";
import { subscribeToPresence, type PresenceState } from "@/lib/presence";
import { getTheme, theme } from "@/theme/theme";

type ChatListItem =
  | { kind: "date"; id: string; label: string }
  | { kind: "message"; id: string; message: ChatMessageRecord };

function formatDayLabel(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return "Today";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
}

function formatMessageTime(value?: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildChatListItems(messages: ChatMessageRecord[]) {
  const items: ChatListItem[] = [];
  let lastDay = "";

  messages.forEach((message) => {
    const nextDay = formatDayLabel(message.createdAt);

    if (nextDay && nextDay !== lastDay) {
      items.push({
        kind: "date",
        id: `date-${nextDay}-${message.id}`,
        label: nextDay,
      });
      lastDay = nextDay;
    }

    items.push({
      kind: "message",
      id: message.id,
      message,
    });
  });

  return items;
}

export default function ChatThreadScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const params = useLocalSearchParams<{ id?: string }>();
  const listRef = useRef<FlatList<ChatListItem> | null>(null);
  const [thread, setThread] = useState<ChatThreadRecord | null | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [partnerUser, setPartnerUser] = useState<StoredUser | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [partnerPresence, setPartnerPresence] = useState<PresenceState | null>(null);

  useEffect(() => {
    let unsubscribeThread: () => void = () => undefined;
    let unsubscribeMessages: () => void = () => undefined;

    async function loadThread() {
      const nextCurrentUser = await getCurrentUserRecord();
      setCurrentUser(nextCurrentUser);

      unsubscribeThread = subscribeToThreadById(
        params.id ?? "",
        async (nextThread) => {
          setThread(nextThread);

          if (nextThread) {
            void markThreadAsRead(nextThread.id);

            if (nextCurrentUser) {
              const partnerIdentifier = matchesAccountIdentifier(nextThread.cookId, nextCurrentUser)
                ? nextThread.explorerId
                : nextThread.cookId;
              const nextPartnerUser = await getUserByIdentifier(partnerIdentifier);
              setPartnerUser(nextPartnerUser);
            }
          }
        },
        (nextError) => {
          setError(nextError.message);
        },
      );

      unsubscribeMessages = subscribeToMessagesForThread(
        params.id ?? "",
        (nextMessages) => {
          setMessages(nextMessages);
        },
        (nextError) => {
          setError(nextError.message);
        },
      );
    }

    void loadThread();

    return () => {
      unsubscribeThread();
      unsubscribeMessages();
    };
  }, [params.id]);

  useEffect(() => {
    if (!thread || !currentUser) {
      setPartnerPresence(null);
      return;
    }

    const partnerIdentifier =
      partnerUser?.id ||
      (matchesAccountIdentifier(thread.cookId, currentUser) ? thread.explorerId : thread.cookId);

    return subscribeToPresence([partnerIdentifier], (presenceMap) => {
      setPartnerPresence(presenceMap[partnerIdentifier] ?? null);
    });
  }, [currentUser, partnerUser, thread]);

  const chatItems = useMemo(() => buildChatListItems(messages), [messages]);

  useEffect(() => {
    if (!thread?.id || !currentUser) {
      return;
    }

    void markThreadAsRead(thread.id);
  }, [currentUser, messages.length, thread?.id, thread?.lastMessageAt]);

  function scrollToLatest(animated = true) {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }

  async function handleSend() {
    const outgoingDraft = draft.trim();

    if (!outgoingDraft) {
      return;
    }

    setError("");
    setDraft("");

    try {
      await sendMessageToThread(params.id ?? "", outgoingDraft);
      void markThreadAsRead(params.id ?? "");
      scrollToLatest(false);
    } catch (nextError) {
      setDraft(outgoingDraft);
      setError(nextError instanceof Error ? nextError.message : "We could not send that message.");
    }
  }

  if (thread === undefined) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  if (!thread) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>This conversation could not be found.</Text>
      </View>
    );
  }

  const title =
    currentUser && matchesAccountIdentifier(thread.cookId, currentUser)
      ? thread.explorerName
      : thread.cookName;
  const partnerReadAt = currentUser ? getThreadPartnerReadAt(thread, currentUser) : "";
  const threadBlocked =
    thread.isBlocked || thread.bookingStatus === "cancelled" || thread.bookingStatus === "declined";

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
        </Pressable>
        <RoundedAvatar
          name={title}
          photoUrl={partnerUser?.photoUrl}
          size={42}
          backgroundColor={activeTheme.accent}
        />
        <View style={styles.headerCopy}>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerTitle}>{title}</Text>
            {partnerPresence?.isOnline ? <View style={styles.activeBadge} /> : null}
          </View>
          <Text style={styles.headerSubtitle}>
            {partnerPresence?.isOnline ? "Online" : "Offline"}
          </Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        style={styles.messagesScreen}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        data={chatItems}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => scrollToLatest(messages.length < 8)}
        renderItem={({ item }) => {
          if (item.kind === "date") {
            return (
              <View style={styles.dateDivider}>
                <Text style={styles.dateDividerText}>{item.label}</Text>
              </View>
            );
          }

          const message = item.message;
          const mine = matchesAccountIdentifier(message.senderId, currentUser);
          const isRead =
            mine &&
            Boolean(
              partnerReadAt &&
                message.createdAt &&
                new Date(partnerReadAt).getTime() >= new Date(message.createdAt).getTime(),
            );

          return (
            <View style={[styles.messageBubble, mine ? styles.myBubble : styles.otherBubble]}>
              {!mine ? <Text style={styles.messageSender}>{message.senderName}</Text> : null}
              <Text style={[styles.messageBody, mine && styles.myBubbleText]}>{message.body}</Text>
              <View style={[styles.messageMetaRow, mine && styles.messageMetaRowMine]}>
                <Text style={[styles.messageTime, mine && styles.myBubbleMetaText]}>
                  {formatMessageTime(message.createdAt)}
                </Text>
                {mine ? (
                  <Ionicons
                    name="checkmark-done"
                    size={14}
                    color={isRead ? "#FFFFFF" : "rgba(255,255,255,0.72)"}
                  />
                ) : null}
              </View>
            </View>
          );
        }}
      />

      {threadBlocked ? (
        <View style={styles.blockedBanner}>
          <Text style={styles.blockedBannerText}>
            This thread is closed because the request is no longer active.
          </Text>
        </View>
      ) : (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.composerInput}
            multiline
            onFocus={() => scrollToLatest(true)}
          />
          <Pressable style={styles.sendButton} onPress={() => void handleSend()}>
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </KeyboardAvoidingView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    loadingScreen: {
      flex: 1,
      backgroundColor: activeTheme.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: { color: activeTheme.text, fontSize: 16, fontWeight: "700" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingTop: theme.layout.screenTop,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      backgroundColor: activeTheme.bg,
    },
    backButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
    },
    headerCopy: { flex: 1, gap: 2 },
    headerNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { color: activeTheme.text, fontSize: 18, fontWeight: "800" },
    activeBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2ECC71" },
    headerSubtitle: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "600" },
    messagesScreen: { flex: 1 },
    messagesContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    dateDivider: {
      alignSelf: "center",
      marginVertical: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surfaceElevated,
    },
    dateDividerText: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
    messageBubble: {
      maxWidth: "84%",
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      gap: 6,
    },
    myBubble: {
      alignSelf: "flex-end",
      backgroundColor: activeTheme.primary,
      borderBottomRightRadius: 6,
    },
    otherBubble: {
      alignSelf: "flex-start",
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderBottomLeftRadius: 6,
    },
    messageSender: { color: activeTheme.primaryDark, fontSize: 12, fontWeight: "700" },
    messageBody: { color: activeTheme.text, fontSize: 15, lineHeight: 21 },
    myBubbleText: { color: "#FFFFFF" },
    messageMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
    },
    messageMetaRowMine: { justifyContent: "flex-end" },
    messageTime: { color: activeTheme.textMuted, fontSize: 11, fontWeight: "600" },
    myBubbleMetaText: { color: "rgba(255,255,255,0.78)" },
    blockedBanner: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
    },
    blockedBannerText: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
    },
    composer: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-end",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.lg,
    },
    composerInput: {
      flex: 1,
      minHeight: 52,
      maxHeight: 120,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
      color: activeTheme.text,
      fontSize: 15,
      textAlignVertical: "top",
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primary,
    },
    errorText: {
      color: activeTheme.danger,
      fontSize: 13,
      lineHeight: 20,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
  });
