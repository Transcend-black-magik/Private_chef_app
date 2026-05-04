import { StyleSheet, Text, useColorScheme, View } from "react-native";

import { getTheme, theme } from "@/theme/theme";

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.bg }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: activeTheme.surface, borderColor: activeTheme.border },
        ]}
      >
        <Text style={[styles.title, { color: activeTheme.text }]}>Home Screen</Text>
        <Text style={[styles.subtitle, { color: activeTheme.textMuted }]}>
          Theme tokens are ready for your feed, categories, and meal cards.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
});
