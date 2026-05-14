import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, router, usePathname } from "expo-router";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  AppState,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";

import {
  clearSession,
  getCurrentUserRecord,
  getLocalActiveSessionId,
  getSession,
  type UserSession,
} from "@/lib/app-state";
import { getThreadUnreadCount, subscribeToThreadsForCurrentUser } from "@/lib/marketplace";
import { startPresenceTracking } from "@/lib/presence";
import { getTheme } from "@/theme/theme";

export default function AppTabsLayout() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const showWebNav = Platform.OS === "web" && width >= 900;
  const [session, setSession] = useState<UserSession | null | undefined>(undefined);
  const [chatBadgeCount, setChatBadgeCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    async function loadSession() {
      const currentSession = await getSession();

      if (!currentSession) {
        router.replace("/signin");
        return;
      }

      if (!currentSession.profileComplete) {
        router.replace({
          pathname: "/auth-profile",
          params: {
            email: currentSession.email,
            role: currentSession.role,
          },
        });
        return;
      }

      setSession(currentSession);
    }

    void loadSession();
  }, []);

  useEffect(() => {
    if (!session) {
      setChatBadgeCount(undefined);
      return;
    }

    const stopPresence = startPresenceTracking(session);
    const unsubscribeThreads = subscribeToThreadsForCurrentUser((threads) => {
      const unreadTotal = threads.reduce(
        (total, thread) => total + getThreadUnreadCount(thread, session),
        0,
      );

      setChatBadgeCount(unreadTotal > 0 ? unreadTotal : undefined);
    });

    return () => {
      stopPresence();
      unsubscribeThreads();
    };
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    async function enforceSingleDeviceSession() {
      const [localSessionId, currentUser] = await Promise.all([
        getLocalActiveSessionId(),
        getCurrentUserRecord(),
      ]);

      if (
        currentUser?.activeSessionId &&
        localSessionId &&
        currentUser.activeSessionId !== localSessionId
      ) {
        await clearSession();
        router.replace("/signin");
      }
    }

    void enforceSingleDeviceSession();

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void enforceSingleDeviceSession();
      }
    });
    const interval = setInterval(() => {
      void enforceSingleDeviceSession();
    }, 12000);

    return () => {
      appStateSubscription.remove();
      clearInterval(interval);
    };
  }, [pathname, session]);

  if (!session) {
    return <View style={{ flex: 1, backgroundColor: activeTheme.bg }} />;
  }

  const isCook = session.role === "cook";
  const sharedChatOptions = {
    title: "Chats",
    tabBarBadge: chatBadgeCount,
    tabBarBadgeStyle: {
      backgroundColor: activeTheme.secondaryAccent,
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "900" as const,
    },
  } as const;
  const tabsScreenOptions = ({ route }: { route: { name: string } }) => ({
    headerShown: false,
    tabBarActiveTintColor: activeTheme.primary,
    tabBarInactiveTintColor: activeTheme.textMuted,
    tabBarStyle: {
      backgroundColor: activeTheme.surface,
      borderTopColor: "transparent",
      borderRadius: 30,
      height: 76,
      display: showWebNav ? "none" as const : "flex" as const,
      marginHorizontal: 18,
      marginBottom: 14,
      paddingTop: 9,
      paddingBottom: 10,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
      position: "absolute" as const,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: "700" as const,
    },
    tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: 42,
          height: 34,
          borderRadius: 999,
          backgroundColor: focused ? activeTheme.primary : "transparent",
        }}
      >
        <Ionicons name={getTabIcon(route.name)} size={size ?? 22} color={focused ? "#FFFFFF" : color} />
      </View>
    ),
  });

  return (
    <View
      style={[
        styles.shell,
        showWebNav && styles.webShell,
        { backgroundColor: showWebNav ? "#FFFFFF" : activeTheme.bg },
      ]}
    >
      {showWebNav ? (
        <WebNav
          activeTheme={activeTheme}
          isCook={isCook}
          pathname={pathname}
          chatBadgeCount={chatBadgeCount}
        />
      ) : null}
      <View style={[styles.tabsWrap, showWebNav && styles.webContent]}>
        <Tabs key={isCook ? "cook-tabs" : "explorer-tabs"} screenOptions={tabsScreenOptions}>
          <Tabs.Screen name="explore" options={isCook ? { href: null } : { title: "Explore" }} />
          <Tabs.Screen name="bookings" options={isCook ? { href: null } : { title: "Bookings" }} />
          <Tabs.Screen name="cook-home" options={isCook ? { title: "Home" } : { href: null }} />
          <Tabs.Screen name="requests" options={isCook ? { title: "Requests" } : { href: null }} />
          <Tabs.Screen name="chats" options={sharedChatOptions} />
          <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        </Tabs>
      </View>
    </View>
  );
}

function WebNav({
  activeTheme,
  isCook,
  pathname,
  chatBadgeCount,
}: {
  activeTheme: ReturnType<typeof getTheme>;
  isCook: boolean;
  pathname: string;
  chatBadgeCount?: number;
}) {
  const items = isCook
    ? [
        { label: "Home", route: "/cook-home", icon: "home-outline" as const },
        { label: "Requests", route: "/requests", icon: "clipboard-outline" as const },
        { label: "Chats", route: "/chats", icon: "chatbubbles-outline" as const },
        { label: "Profile", route: "/profile", icon: "person-outline" as const },
      ]
    : [
        { label: "Explore", route: "/explore", icon: "compass-outline" as const },
        { label: "Bookings", route: "/bookings", icon: "calendar-outline" as const },
        { label: "Chats", route: "/chats", icon: "chatbubbles-outline" as const },
        { label: "Profile", route: "/profile", icon: "person-outline" as const },
      ];

  return (
    <View style={[styles.webNav, { borderRightColor: activeTheme.border }]}>
      <Pressable style={styles.brandButton} onPress={() => router.push(isCook ? "/cook-home" : "/explore")}>
        <View style={[styles.brandMark, { backgroundColor: activeTheme.primaryDark }]}>
          <Ionicons name="restaurant" size={18} color="#FFFFFF" />
        </View>
        <View>
          <Text style={[styles.brandText, { color: activeTheme.text }]}>Private Chef</Text>
          <Text style={[styles.brandSubtext, { color: activeTheme.textMuted }]}>Kitchen companion</Text>
        </View>
      </Pressable>

      <View style={styles.webNavItems}>
        {items.map((item) => {
          const active = pathname === item.route || pathname.endsWith(item.route);
          return (
            <Pressable
              key={item.route}
              style={[
                styles.webNavItem,
                {
                  backgroundColor: active ? activeTheme.primaryDark : "transparent",
                  borderColor: active ? activeTheme.primaryDark : activeTheme.border,
                },
              ]}
              onPress={() => router.push(item.route as never)}
            >
              <Ionicons name={item.icon} size={16} color={active ? "#FFFFFF" : activeTheme.text} />
              <Text style={[styles.webNavText, { color: active ? "#FFFFFF" : activeTheme.text }]}>
                {item.label}
              </Text>
              {item.route === "/chats" && chatBadgeCount ? (
                <View style={[styles.webBadge, { backgroundColor: activeTheme.secondaryAccent }]}>
                  <Text style={styles.webBadgeText}>{chatBadgeCount}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getTabIcon(routeName: string): keyof typeof Ionicons.glyphMap {
  switch (routeName) {
    case "explore":
      return "compass";
    case "bookings":
      return "calendar";
    case "cook-home":
      return "home";
    case "requests":
      return "clipboard";
    case "chats":
      return "chatbubbles";
    case "profile":
      return "person";
    default:
      return "ellipse";
  }
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  webShell: {
    flexDirection: "row",
  },
  tabsWrap: {
    flex: 1,
  },
  webContent: {
    backgroundColor: "#FFFFFF",
  },
  webNav: {
    width: 286,
    borderRightWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 28,
    gap: 34,
    backgroundColor: "#FFFDF7",
  },
  brandButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 18,
    fontWeight: "900",
  },
  brandSubtext: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  webNavItems: {
    gap: 10,
  },
  webNavItem: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  webNavText: {
    fontSize: 13,
    fontWeight: "900",
  },
  webBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  webBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
});
