import { StyleSheet, Text, useColorScheme, View } from "react-native";

import { getTheme, theme } from "@/theme/theme";

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);

  return (
    <View style={[styles.container, { backgroundColor: activeTheme.bg }]}>
      <Text style={[styles.title, { color: activeTheme.text }]}>Profile Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
});
