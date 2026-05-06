import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";

import AnimatedSplashScreen from "@/components/AnimatedSplashScreen";
import AppBootScreen from "@/components/AppBootScreen";
import { getSession } from "@/lib/app-state";
import { startPresenceTracking } from "@/lib/presence";
import { getTheme } from "@/theme/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const [appReady, setAppReady] = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
      } finally {
        setAppReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appReady) {
      void SplashScreen.hideAsync();
    }
  }, [appReady]);

  useEffect(() => {
    if (!appReady || showAnimatedSplash) {
      return;
    }

    let stopPresence: () => void = () => undefined;

    async function trackPresence() {
      const session = await getSession();
      stopPresence = startPresenceTracking(session);
    }

    void trackPresence();

    return () => stopPresence();
  }, [appReady, showAnimatedSplash]);

  if (!appReady) {
    return <AppBootScreen />;
  }

  if (showAnimatedSplash) {
    return <AnimatedSplashScreen onFinish={() => setShowAnimatedSplash(false)} />;
  }

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: activeTheme.bg },
          fullScreenGestureShadowEnabled: false,
          animationMatchesGesture: true,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="search" options={{ animation: "fade" }} />
      </Stack>
    </>
  );
}
