import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { router } from "expo-router";

import RoundedAvatar from "@/components/RoundedAvatar";
import {
  getAccountIdentifiers,
  toSafeFieldKey,
  uniqueStrings,
} from "@/lib/account-identity";
import {
  getCurrentUserRecord,
  getUserByIdentifier,
  type StoredUser,
} from "@/lib/app-state";
import {
  archiveThreadForCurrentUser,
  deleteThreadForCurrentUser,
  getThreadUnreadCount,
  subscribeToThreadsForCurrentUser,
  type ChatThreadRecord,
} from "@/lib/marketplace";
import { subscribeToPresence, type PresenceState } from "@/lib/presence";
import { getTheme, theme } from "@/theme/theme";

export default function ChatsScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [role, setRole] = useState<"explorer" | "cook">("explorer");
  const [threads, setThreads] = useState<ChatThreadRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceState>>({});
  const [partnerMap, setPartnerMap] = useState<Record<string, { id: string; photoUrl: string }>>({});

  useEffect(() => {
    let unsubscribeThreads: () => void = () => undefined;

    async function loadChats() {
      const nextCurrentUser = await getCurrentUserRecord();

      if (nextCurrentUser) {
        setCurrentUser(nextCurrentUser);
        setRole(nextCurrentUser.role);
      }

      unsubscribeThreads = subscribeToThreadsForCurrentUser((nextThreads) => {
        setThreads(nextThreads);
      });
    }

    void loadChats();

    return () => {
      unsubscribeThreads();
    };
  }, []);

  useEffect(() => {
    if (!threads.length) {
      setPartnerMap({});
      return;
    }

    let cancelled = false;

    async function loadPartnerMap() {
      const entries = await Promise.all(
        threads.map(async (thread) => {
          const identifier = role === "cook" ? thread.explorerId : thread.cookId;
          const user = await getUserByIdentifier(identifier);
          return [identifier, { id: user?.id || identifier, photoUrl: user?.photoUrl || "" }] as const;
        }),
      );

      if (!cancelled) {
        setPartnerMap(Object.fromEntries(entries));
      }
    }

    void loadPartnerMap();

    return () => {
      cancelled = true;
    };
  }, [role, threads]);

  useEffect(() => {
    const identifiers = Object.values(partnerMap)
      .map((item) => item.id)
      .filter(Boolean);

    if (!currentUser || !identifiers.length) {
      setPresenceMap({});
      return;
    }

    return subscribeToPresence(identifiers, setPresenceMap);
  }, [currentUser, partnerMap]);

  function formatThreadTime(value?: string) {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();

    return new Intl.DateTimeFormat("en-US", sameDay ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric" }).format(date);
  }

  function markThreadReadLocally(threadId: string) {
    if (!currentUser) {
      return;
    }

    const identifiers = getAccountIdentifiers(currentUser);

    setThreads((currentThreads) =>
      currentThreads.map((thread) => {
        if (thread.id !== threadId) {
          return thread;
        }

        const matchingIdentifiers = uniqueStrings(
          thread.participantIds.filter((participantId) =>
            identifiers.some(
              (identifier) => participantId.toLowerCase() === identifier.toLowerCase(),
            ),
          ),
        );

        const keysToClear = matchingIdentifiers.length ? matchingIdentifiers : identifiers;
        const nextUnreadCountBy = { ...thread.unreadCountBy };
        const nextLastReadAtBy = { ...thread.lastReadAtBy };
        const now = new Date().toISOString();

        keysToClear.forEach((identifier) => {
          nextUnreadCountBy[toSafeFieldKey(identifier)] = 0;
          nextLastReadAtBy[toSafeFieldKey(identifier)] = now;
        });

        return {
          ...thread,
          unreadCountBy: nextUnreadCountBy,
          lastReadAtBy: nextLastReadAtBy,
        };
      }),
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Chats</Text>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>{threads.length}</Text>
        </View>
      </View>

      <View style={styles.stack}>
        {threads.map((thread) => {
          const partnerName = role === "cook" ? thread.explorerName : thread.cookName;
          const partnerIdentifier = role === "cook" ? thread.explorerId : thread.cookId;
          const unreadCount = currentUser ? getThreadUnreadCount(thread, currentUser) : 0;
          const resolvedPartner = partnerMap[partnerIdentifier];
          const partnerPresence = presenceMap[resolvedPartner?.id || partnerIdentifier];

          return (
            <Pressable
              key={thread.id}
              style={styles.chatCard}
              onPress={() => {
                markThreadReadLocally(thread.id);
                router.push({
                  pathname: "/chat-thread/[id]",
                  params: { id: thread.id },
                });
              }}
            >
              <RoundedAvatar
                name={partnerName}
                photoUrl={resolvedPartner?.photoUrl}
                size={54}
                backgroundColor={activeTheme.accent}
              />
              <View style={styles.chatBody}>
                <View style={styles.chatTopRow}>
                  <View style={styles.chatTitleBlock}>
                    <View style={styles.nameRow}>
                      <Text style={styles.chatName}>{partnerName}</Text>
                      {partnerPresence?.isOnline ? <View style={styles.activeBadge} /> : null}
                    </View>
                    <Text numberOfLines={1} style={styles.chatPreview}>
                      {thread.lastMessageText || "No messages yet"}
                    </Text>
                  </View>
                  <View style={styles.chatMetaBlock}>
                    <Text style={styles.chatTime}>{formatThreadTime(thread.lastMessageAt)}</Text>
                    {unreadCount ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                {thread.isBlocked ? (
                  <View style={styles.closedActions}>
                    <Pressable
                      style={styles.closedButton}
                      onPress={() => void archiveThreadForCurrentUser(thread.id)}
                    >
                      <Text style={styles.closedButtonText}>Archive</Text>
                    </Pressable>
                    <Pressable
                      style={styles.closedButton}
                      onPress={() => void deleteThreadForCurrentUser(thread.id)}
                    >
                      <Text style={styles.closedButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.layout.screenTop,
      paddingBottom: 120,
      gap: theme.spacing.md,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    },
    title: { color: activeTheme.text, fontSize: 30, lineHeight: 34, fontWeight: "800" },
    headerPill: {
      minWidth: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surfaceElevated,
      borderWidth: 1,
      borderColor: activeTheme.border,
      paddingHorizontal: 10,
    },
    headerPillText: { color: activeTheme.text, fontSize: 13, fontWeight: "800" },
    stack: { gap: theme.spacing.md },
    chatCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      minHeight: 82,
    },
    chatBody: { flex: 1, gap: 4 },
    chatTopRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    chatTitleBlock: { gap: 2, flex: 1 },
    chatMetaBlock: { alignItems: "flex-end", gap: 6 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    chatName: { color: activeTheme.text, fontSize: 16, fontWeight: "800" },
    activeBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2ECC71" },
    chatTime: { color: activeTheme.textMuted, fontSize: 13, fontWeight: "600" },
    chatPreview: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    unreadBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primary,
    },
    unreadBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    closedActions: { flexDirection: "row", gap: 8, marginTop: 4 },
    closedButton: {
      minHeight: 30,
      paddingHorizontal: 10,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.bg,
    },
    closedButtonText: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
  });
