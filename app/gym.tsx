import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";

import { heroFoodImages } from "@/lib/food-visuals";
import { getTheme, theme } from "@/theme/theme";

const goals = [
  { label: "Lean bulk", icon: "barbell-outline" as const, note: "Protein-forward cook matches" },
  { label: "Cutting", icon: "flame-outline" as const, note: "Lighter meals with clear portions" },
  { label: "Recovery", icon: "heart-outline" as const, note: "Balanced meals after training" },
];

export default function GymScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.hero}>
        <Image source={heroFoodImages.salad} style={styles.heroImage} contentFit="cover" />
        <View style={styles.heroShade} />
        <Text style={styles.eyebrow}>Gym food mode</Text>
        <Text style={styles.title}>Match cooks to your training day.</Text>
        <Text style={styles.subtitle}>Choose a goal and jump into a guided meal search with nutrition in mind.</Text>
      </View>

      <View style={styles.goalStack}>
        {goals.map((goal) => (
          <Pressable
            key={goal.label}
            style={styles.goalCard}
            onPress={() => router.push({ pathname: "/search-results", params: { query: goal.label } })}
          >
            <View style={styles.goalIcon}>
              <Ionicons name={goal.icon} size={20} color={activeTheme.primaryDark} />
            </View>
            <View style={styles.goalCopy}>
              <Text style={styles.goalTitle}>{goal.label}</Text>
              <Text style={styles.goalNote}>{goal.note}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={activeTheme.textMuted} />
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.primaryButton} onPress={() => router.push("/meal-match")}>
        <Text style={styles.primaryButtonText}>Open taste guide</Text>
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    content: { padding: theme.spacing.lg, paddingTop: theme.layout.screenTop, gap: theme.spacing.lg },
    backButton: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
    backText: { color: activeTheme.text, fontSize: 15, fontWeight: "800" },
    hero: {
      minHeight: 300,
      borderRadius: 34,
      overflow: "hidden",
      padding: theme.spacing.lg,
      justifyContent: "flex-end",
      gap: 8,
      backgroundColor: activeTheme.primaryDark,
    },
    heroImage: { ...StyleSheet.absoluteFillObject },
    heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
    eyebrow: { color: "#FFE0BD", fontSize: 13, fontWeight: "900", textTransform: "uppercase" },
    title: { color: "#FFFFFF", fontSize: 32, lineHeight: 38, fontWeight: "900" },
    subtitle: { color: "rgba(255,255,255,0.84)", fontSize: 15, lineHeight: 23 },
    goalStack: { gap: 12 },
    goalCard: {
      minHeight: 86,
      borderRadius: 24,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    goalIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: activeTheme.safeSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    goalCopy: { flex: 1, gap: 3 },
    goalTitle: { color: activeTheme.text, fontSize: 17, fontWeight: "900" },
    goalNote: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 19 },
    primaryButton: {
      minHeight: 56,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  });
