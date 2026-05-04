import { ActivityIndicator, Image, StyleSheet, Text, useColorScheme, View } from "react-native";

import { getTheme, theme } from "@/theme/theme";

type AuthProcessingScreenProps = {
  title: string;
  subtitle: string;
};

export default function AuthProcessingScreen({
  title,
  subtitle,
}: AuthProcessingScreenProps) {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const logoSource =
    colorScheme === "dark"
      ? require("@/assets/images/logo_dark.png")
      : require("@/assets/images/logo_light.png");

  return (
    <View style={[styles.overlay, { backgroundColor: activeTheme.bg }]}>
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
      <Text style={[styles.title, { color: activeTheme.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: activeTheme.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
    zIndex: 20,
  },
  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.5,
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
    maxWidth: 280,
  },
});
