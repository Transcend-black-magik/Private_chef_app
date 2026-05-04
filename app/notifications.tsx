import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { getCurrentUserRecord, type StoredUser } from "@/lib/app-state";
import {
  markNotificationRead,
  subscribeToNotificationsForCurrentUser,
  type AppNotificationRecord,
} from "@/lib/notifications";
import { getTheme, theme } from "@/theme/theme";

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [notifications, setNotifications] = useState<AppNotificationRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    void getCurrentUserRecord().then(setCurrentUser);
    return subscribeToNotificationsForCurrentUser(setNotifications);
  }, []);

  const visibleNotifications =
    currentUser?.role === "cook"
      ? notifications.filter((item) => item.type !== "chat_message" || !item.read)
      : notifications;

  function openNotification(item: AppNotificationRecord) {
    void markNotificationRead(item.id);

    if (item.threadId) {
      router.push({ pathname: "/chat-thread/[id]", params: { id: item.threadId } });
      return;
    }

    router.back();
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      stickyHeaderIndices={[0]}
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
    >
      <View style={styles.topRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{notifications.filter((item) => !item.read).length}</Text>
        </View>
      </View>

      <View style={styles.stack}>
        {visibleNotifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing new yet</Text>
            <Text style={styles.emptyBody}>Booking requests, chat messages, and payment updates will appear here.</Text>
          </View>
        ) : null}

        {visibleNotifications.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.notificationCard, !item.read && styles.notificationCardUnread]}
            onPress={() => openNotification(item)}
          >
            <View style={styles.iconCircle}>
              <Ionicons
                name={
                  item.type === "chat_message"
                    ? "chatbubble-ellipses-outline"
                    : item.type === "booking_request"
                      ? "receipt-outline"
                      : "notifications-outline"
                }
                size={19}
                color={activeTheme.primaryDark}
              />
            </View>
            <View style={styles.notificationCopy}>
              <View style={styles.notificationTop}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                {!item.read ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.notificationBody}>{item.body}</Text>
              {item.createdAt ? (
                <Text style={styles.notificationTime}>
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(item.createdAt))}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
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
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
      width: "100%",
      maxWidth: 780,
      alignSelf: "center",
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      backgroundColor: activeTheme.bg,
      paddingBottom: theme.spacing.md,
      zIndex: 5,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    title: { flex: 1, color: activeTheme.text, fontSize: 30, fontWeight: "900" },
    countPill: {
      minWidth: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primary,
      paddingHorizontal: 10,
    },
    countText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
    stack: { gap: 12 },
    emptyCard: {
      borderRadius: 28,
      padding: theme.spacing.lg,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      gap: 6,
    },
    emptyTitle: { color: activeTheme.text, fontSize: 18, fontWeight: "900" },
    emptyBody: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    notificationCard: {
      flexDirection: "row",
      gap: 12,
      borderRadius: 28,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
    },
    notificationCardUnread: {
      borderColor: activeTheme.primary,
      backgroundColor: activeTheme.safeSurface,
    },
    iconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surfaceElevated,
    },
    notificationCopy: { flex: 1, gap: 5 },
    notificationTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    notificationTitle: { flex: 1, color: activeTheme.text, fontSize: 16, fontWeight: "900" },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: activeTheme.secondaryAccent,
    },
    notificationBody: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 21 },
    notificationTime: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
  });
