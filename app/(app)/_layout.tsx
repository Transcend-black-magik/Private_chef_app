import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { useColorScheme, View } from "react-native";

import { getSession, type UserSession } from "@/lib/app-state";
import { getThreadUnreadCount, subscribeToThreadsForCurrentUser } from "@/lib/marketplace";
import { startPresenceTracking } from "@/lib/presence";
import { getTheme } from "@/theme/theme";

export default function AppTabsLayout() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
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
    },
  } as const;
  const tabsScreenOptions = ({ route }: { route: { name: string } }) => ({
    headerShown: false,
    tabBarActiveTintColor: activeTheme.primary,
    tabBarInactiveTintColor: activeTheme.textMuted,
    tabBarStyle: {
      backgroundColor: activeTheme.surface,
      borderTopColor: activeTheme.border,
      height: 84,
      paddingTop: 10,
      paddingBottom: 14,
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: "700" as const,
    },
    tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: 42,
          height: 30,
          borderRadius: 999,
          backgroundColor: focused ? activeTheme.accentSoft : "transparent",
        }}
      >
        <Ionicons name={getTabIcon(route.name)} size={size ?? 22} color={color} />
      </View>
    ),
  });

  return (
    <Tabs key={isCook ? "cook-tabs" : "explorer-tabs"} screenOptions={tabsScreenOptions}>
      <Tabs.Screen name="explore" options={isCook ? { href: null } : { title: "Explore" }} />
      <Tabs.Screen name="bookings" options={isCook ? { href: null } : { title: "Bookings" }} />
      <Tabs.Screen name="cook-home" options={isCook ? { title: "Home" } : { href: null }} />
      <Tabs.Screen name="requests" options={isCook ? { title: "Requests" } : { href: null }} />
      <Tabs.Screen name="chats" options={sharedChatOptions} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
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
