import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width >= 900;
  const styles = createStyles(activeTheme, isWideWeb);
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

  const visibleThreads = useMemo(() => {
    const latestByPartner = new Map<string, ChatThreadRecord>();

    threads.forEach((thread) => {
      const partnerIdentifier = role === "cook" ? thread.explorerId : thread.cookId;
      const currentThread = latestByPartner.get(partnerIdentifier);

      if (
        !currentThread ||
        (thread.lastMessageAt || "").localeCompare(currentThread.lastMessageAt || "") > 0
      ) {
        latestByPartner.set(partnerIdentifier, thread);
      }
    });

    return Array.from(latestByPartner.values()).sort((left, right) =>
      (right.lastMessageAt || "").localeCompare(left.lastMessageAt || ""),
    );
  }, [role, threads]);
  const totalUnread = useMemo(
    () =>
      currentUser
        ? visibleThreads.reduce((total, thread) => total + getThreadUnreadCount(thread, currentUser), 0)
        : 0,
    [currentUser, visibleThreads],
  );
  const onlineCount = useMemo(
    () =>
      visibleThreads.filter((thread) => {
        const partnerIdentifier = role === "cook" ? thread.explorerId : thread.cookId;
        const resolvedPartner = partnerMap[partnerIdentifier];
        return presenceMap[resolvedPartner?.id || partnerIdentifier]?.isOnline;
      }).length,
    [partnerMap, presenceMap, role, visibleThreads],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundBand} />
      <View style={styles.backgroundTile} />
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <View style={styles.headerRow}>
        <View style={styles.headerGlow} />
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Messages</Text>
          <Text style={styles.title}>Chats</Text>
          <Text style={styles.subtitle}>Keep booking conversations, updates, and handoff details in one place.</Text>
        </View>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>{visibleThreads.length}</Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <View style={styles.metricCard}>
          <Ionicons name="chatbubbles-outline" size={19} color={activeTheme.primaryDark} />
          <Text style={styles.metricValue}>{visibleThreads.length}</Text>
          <Text style={styles.metricLabel}>Threads</Text>
        </View>
        <View style={styles.metricCard}>
          <Ionicons name="mail-unread-outline" size={19} color={activeTheme.primaryDark} />
          <Text style={styles.metricValue}>{totalUnread}</Text>
          <Text style={styles.metricLabel}>Unread</Text>
        </View>
        <View style={styles.metricCard}>
          <Ionicons name="radio-button-on-outline" size={19} color={activeTheme.primaryDark} />
          <Text style={styles.metricValue}>{onlineCount}</Text>
          <Text style={styles.metricLabel}>Online</Text>
        </View>
      </View>

      <View style={styles.stack}>
        {!visibleThreads.length ? (
          <View style={styles.emptyCard}>
            <Ionicons name="chatbox-ellipses-outline" size={24} color={activeTheme.textMuted} />
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptyBody}>Booking conversations and live service handoffs will appear here.</Text>
          </View>
        ) : null}

        {visibleThreads.map((thread) => {
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
    </View>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>, isWideWeb: boolean) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    scrollArea: { flex: 1 },
    backgroundBand: {
      position: "absolute",
      top: -70,
      left: -40,
      right: -40,
      height: 230,
      borderBottomLeftRadius: 48,
      borderBottomRightRadius: 48,
      backgroundColor: activeTheme.warmSurface,
      transform: [{ rotate: "-3deg" }],
      opacity: activeTheme.bg === "#FFFFFF" ? 1 : 0.14,
    },
    backgroundTile: {
      position: "absolute",
      top: 128,
      right: -82,
      width: 220,
      height: 130,
      borderRadius: 34,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.safeSurface,
      transform: [{ rotate: "12deg" }],
      opacity: activeTheme.bg === "#FFFFFF" ? 0.72 : 0.12,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: isWideWeb ? theme.spacing.xxl : theme.layout.screenTop,
      paddingBottom: 120,
      gap: theme.spacing.lg,
      width: "100%",
      alignSelf: "center",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      borderRadius: 34,
      padding: theme.spacing.lg,
      minHeight: isWideWeb ? 300 : 250,
      overflow: "hidden",
      backgroundColor: activeTheme.primaryDark,
      borderWidth: 1,
      borderColor: activeTheme.primaryDark,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
      marginHorizontal: -theme.spacing.lg,
      marginTop: isWideWeb ? -theme.spacing.xxl : -theme.layout.screenTop,
      paddingTop: isWideWeb ? theme.spacing.xxl : theme.layout.screenTop,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    },
    headerGlow: {
      position: "absolute",
      right: -60,
      bottom: -80,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: "rgba(255,255,255,0.14)",
    },
    headerCopy: { flex: 1, gap: 5, paddingRight: 16 },
    kicker: { color: "#FFE0BD", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
    title: { color: "#FFFFFF", fontSize: isWideWeb ? 52 : 38, lineHeight: isWideWeb ? 58 : 44, fontWeight: "900" },
    subtitle: { color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 21, maxWidth: 560 },
    headerPill: {
      minWidth: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.16)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      paddingHorizontal: 10,
    },
    headerPillText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
    metricGrid: {
      flexDirection: "row",
      gap: 10,
      marginTop: -44,
    },
    metricCard: {
      flex: 1,
      minHeight: 112,
      borderRadius: 24,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      justifyContent: "space-between",
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    metricValue: { color: activeTheme.text, fontSize: 26, fontWeight: "900" },
    metricLabel: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
    stack: { gap: theme.spacing.md },
    emptyCard: {
      minHeight: 180,
      borderRadius: 28,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: theme.spacing.lg,
    },
    emptyTitle: { color: activeTheme.text, fontSize: 18, fontWeight: "900" },
    emptyBody: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },
    chatCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: 26,
      padding: theme.spacing.lg,
      minHeight: 96,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
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
