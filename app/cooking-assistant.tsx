import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";

import { heroFoodImages } from "@/lib/food-visuals";
import { getTheme, theme } from "@/theme/theme";

const assistantPrompts = [
  "Suggest dinner from what I have",
  "Plan a high-protein week",
  "Find a cook for family trays",
  "Build a quiet handoff meal",
];

export default function CookingAssistantScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <View style={styles.hero}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
        </Pressable>
        <View style={styles.heroImageWrap}>
          <Image source={heroFoodImages.salad} style={styles.heroImage} contentFit="cover" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.title}>Your Personal Food AI Assistant</Text>
          <Text style={styles.subtitle}>Suggest recipes, track calories, plan meals, and find the right cook.</Text>
          <Pressable style={styles.assistantButton} onPress={() => router.push("/meal-match")}>
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            <Text style={styles.assistantButtonText}>Start assistant</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.promptStack}>
        {assistantPrompts.map((prompt) => (
          <Pressable key={prompt} style={styles.promptCard} onPress={() => router.push({ pathname: "/search-results", params: { query: prompt } })}>
            <Text style={styles.promptText}>{prompt}</Text>
            <Ionicons name="arrow-forward" size={17} color={activeTheme.primaryDark} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.safeSurface },
    content: { padding: theme.spacing.lg, paddingTop: theme.layout.screenTop, gap: theme.spacing.lg },
    hero: {
      minHeight: 520,
      borderRadius: 38,
      overflow: "hidden",
      backgroundColor: activeTheme.safeSurface,
      padding: theme.spacing.lg,
      justifyContent: "space-between",
    },
    heroImageWrap: {
      alignSelf: "center",
      width: 245,
      height: 245,
      borderRadius: 123,
      overflow: "hidden",
      borderWidth: 12,
      borderColor: "rgba(255,255,255,0.55)",
      backgroundColor: activeTheme.surface,
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.74)",
    },
    heroCopy: { gap: 12 },
    title: { color: activeTheme.text, fontSize: 34, lineHeight: 42, fontWeight: "900" },
    subtitle: { color: activeTheme.textMuted, fontSize: 15, lineHeight: 23 },
    assistantButton: {
      minHeight: 54,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primaryDark,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    assistantButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
    promptStack: { gap: 10 },
    promptCard: {
      minHeight: 58,
      borderRadius: 20,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      paddingHorizontal: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    promptText: { flex: 1, color: activeTheme.text, fontSize: 15, fontWeight: "800" },
  });
