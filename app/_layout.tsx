import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";

import AnimatedSplashScreen from "@/components/AnimatedSplashScreen";
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

  if (!appReady) {
    return null;
  }

  if (showAnimatedSplash) {
    return <AnimatedSplashScreen onFinish={() => setShowAnimatedSplash(false)} />;
  }

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: activeTheme.bg },
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}
