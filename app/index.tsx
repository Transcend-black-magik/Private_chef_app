import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, useColorScheme, View } from "react-native";
import { router } from "expo-router";

import { getLaunchState } from "@/lib/app-state";
import { getPostAuthRoute } from "@/lib/auth-service";
import { getTheme } from "@/theme/theme";

export default function Index() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);

  useEffect(() => {
    async function bootstrap() {
      try {
        const launchState = await getLaunchState();

        if (launchState.session) {
          if (!launchState.session.profileComplete) {
            router.replace({
              pathname: "/auth-profile",
              params: {
                email: launchState.session.email,
                role: launchState.session.role,
              },
            });
            return;
          }

          router.replace(getPostAuthRoute(launchState.session.role));
          return;
        }

        if (!launchState.hasSeenOnboarding) {
          router.replace("/welcome");
          return;
        }

        router.replace("/signin");
      } catch {
        router.replace("/signin");
      }
    }

    void bootstrap();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.bg }]}>
      <ActivityIndicator size="large" color={activeTheme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
