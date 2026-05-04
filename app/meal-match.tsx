import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { router } from "expo-router";

import { buildMealSuggestions, type MealSignal } from "@/lib/meal-guide";
import { getTheme, theme } from "@/theme/theme";

const optionSets = {
  spiceLevel: ["mild", "balanced", "hot"],
  mealMood: ["comforting", "fresh", "indulgent", "focused"],
  mealTemperature: ["warm", "cold", "either"],
  gymGoal: ["none", "lean_bulk", "cutting", "recovery"],
  appetite: ["light", "steady", "hungry"],
} as const;

const labels: Record<string, string> = {
  mild: "Mild",
  balanced: "Balanced",
  hot: "Hot",
  comforting: "Comforting",
  fresh: "Fresh",
  indulgent: "Indulgent",
  focused: "Focused",
  warm: "Warm",
  cold: "Cold",
  either: "Either",
  none: "No gym focus",
  lean_bulk: "Lean bulk",
  cutting: "Cutting",
  recovery: "Recovery",
  light: "Light appetite",
  steady: "Steady",
  hungry: "Really hungry",
};

export default function MealMatchScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [signal, setSignal] = useState<MealSignal>({
    spiceLevel: "balanced",
    mealMood: "comforting",
    mealTemperature: "warm",
    gymGoal: "none",
    appetite: "steady",
  });

  const suggestions = useMemo(() => buildMealSuggestions(signal), [signal]);

  function update<Key extends keyof MealSignal>(key: Key, value: MealSignal[Key]) {
    setSignal((current) => ({ ...current, [key]: value }));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>Taste guide</Text>
        <Text style={styles.title}>Let the app help you decide what to eat.</Text>
        <Text style={styles.subtitle}>
          Tell us the feeling, not the exact dish. We’ll turn your mood, energy, and taste into a smarter starting point.
        </Text>
      </View>

      <View style={styles.quizCard}>
        <FilterBlock
          title="Spice"
          options={optionSets.spiceLevel}
          selected={signal.spiceLevel}
          styles={styles}
          onSelect={(value) => update("spiceLevel", value as MealSignal["spiceLevel"])}
        />
        <FilterBlock
          title="Mood"
          options={optionSets.mealMood}
          selected={signal.mealMood}
          styles={styles}
          onSelect={(value) => update("mealMood", value as MealSignal["mealMood"])}
        />
        <FilterBlock
          title="Temperature"
          options={optionSets.mealTemperature}
          selected={signal.mealTemperature}
          styles={styles}
          onSelect={(value) => update("mealTemperature", value as MealSignal["mealTemperature"])}
        />
        <FilterBlock
          title="Gym focus"
          options={optionSets.gymGoal}
          selected={signal.gymGoal}
          styles={styles}
          onSelect={(value) => update("gymGoal", value as MealSignal["gymGoal"])}
        />
        <FilterBlock
          title="Appetite"
          options={optionSets.appetite}
          selected={signal.appetite}
          styles={styles}
          onSelect={(value) => update("appetite", value as MealSignal["appetite"])}
        />
      </View>

      <View style={styles.resultsCard}>
        <Text style={styles.resultsTitle}>Your strongest directions</Text>
        <View style={styles.resultsStack}>
          {suggestions.map((suggestion) => (
            <View
              key={suggestion.title}
              style={[
                styles.suggestionCard,
                suggestion.accent === "fresh"
                  ? styles.suggestionFresh
                  : suggestion.accent === "focused"
                    ? styles.suggestionFocused
                    : styles.suggestionWarm,
              ]}
            >
              <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
              <Text style={styles.suggestionBody}>{suggestion.body}</Text>
              <Pressable
                style={styles.suggestionButton}
                onPress={() =>
                  router.push({
                    pathname: "/search-results",
                    params: { query: suggestion.searchQuery },
                  })
                }
              >
                <Text style={styles.suggestionButtonText}>Find cooks for this</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function FilterBlock({
  title,
  options,
  selected,
  styles,
  onSelect,
}: {
  title: string;
  options: readonly string[];
  selected: string;
  styles: ReturnType<typeof createStyles>;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.filterBlock}>
      <Text style={styles.filterTitle}>{title}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => (
          <Pressable
            key={option}
            style={[styles.optionChip, selected === option && styles.optionChipActive]}
            onPress={() => onSelect(option)}
          >
            <Text style={[styles.optionChipText, selected === option && styles.optionChipTextActive]}>
              {labels[option] || option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.layout.screenTop,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    backButton: { alignSelf: "flex-start" },
    backText: { color: activeTheme.text, fontSize: 15, fontWeight: "700" },
    headerBlock: { gap: 8 },
    eyebrow: { color: activeTheme.primaryDark, fontSize: 14, fontWeight: "800" },
    title: { color: activeTheme.text, fontSize: 31, lineHeight: 38, fontWeight: "800" },
    subtitle: { color: activeTheme.textMuted, fontSize: 15, lineHeight: 23 },
    quizCard: {
      backgroundColor: activeTheme.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    filterBlock: { gap: 10 },
    filterTitle: { color: activeTheme.text, fontSize: 15, fontWeight: "800" },
    optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    optionChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surfaceElevated,
    },
    optionChipActive: {
      backgroundColor: activeTheme.accentSoft,
      borderColor: activeTheme.accent,
    },
    optionChipText: { color: activeTheme.text, fontSize: 13, fontWeight: "700" },
    optionChipTextActive: { color: activeTheme.text },
    resultsCard: {
      backgroundColor: activeTheme.safeSurface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    resultsTitle: { color: activeTheme.text, fontSize: 20, fontWeight: "800" },
    resultsStack: { gap: 12 },
    suggestionCard: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      gap: 10,
    },
    suggestionWarm: { backgroundColor: activeTheme.warmSurface },
    suggestionFresh: { backgroundColor: activeTheme.safeSurface },
    suggestionFocused: { backgroundColor: activeTheme.focusSurface },
    suggestionTitle: { color: activeTheme.text, fontSize: 16, fontWeight: "800" },
    suggestionBody: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 21 },
    suggestionButton: {
      alignSelf: "flex-start",
      minHeight: 36,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primary,
    },
    suggestionButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  });
