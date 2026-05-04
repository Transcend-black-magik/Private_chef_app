import { ActivityIndicator, Image, StyleSheet, Text, useColorScheme, View } from "react-native";

import { getTheme, theme } from "@/theme/theme";

export default function AppBootScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const logoSource =
    colorScheme === "dark"
      ? require("@/assets/images/logo_dark.png")
      : require("@/assets/images/logo_light.png");

  return (
    <View style={[styles.screen, { backgroundColor: activeTheme.bg }]}>
      <View
        style={[
          styles.glow,
          {
            backgroundColor:
              colorScheme === "dark" ? activeTheme.surfaceElevated : activeTheme.accentSoft,
          },
        ]}
      />
      <Image source={logoSource} resizeMode="contain" style={styles.logo} />
      <ActivityIndicator size="small" color={activeTheme.primary} />
      <Text style={[styles.title, { color: activeTheme.text }]}>Getting Cook for Me ready</Text>
      <Text style={[styles.subtitle, { color: activeTheme.textMuted }]}>
        Loading your trusted cooks, profile state, and live experience.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.45,
  },
  logo: {
    width: 220,
    height: 110,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 300,
  },
});
