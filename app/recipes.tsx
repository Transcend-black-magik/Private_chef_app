import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from "react-native";

import { getCookImage, heroFoodImages } from "@/lib/food-visuals";
import { recipeRecommendations } from "@/lib/recipe-data";
import { getSavedRecipeIds, toggleSavedRecipe } from "@/lib/saved-items";
import { getTheme, theme } from "@/theme/theme";

const recipeAccessOptions = [
  {
    title: "Free app recipe",
    meta: "Free",
    body: "Quick steps and core ingredients from Cook for Me.",
    cta: "Browse free recipes",
    icon: "book-outline",
    tone: "free",
  },
  {
    title: "Chef recipe pack",
    meta: "Paid by chef",
    body: "Measurements, ingredient logic, prep order, and professional chef notes.",
    cta: "Find chef packs",
    icon: "ribbon-outline",
    tone: "chef",
  },
  {
    title: "Have a cook make it",
    meta: "Full service",
    body: "Book a cook when you want recipe planning, ingredients, and execution handled.",
    cta: "Find cooks",
    icon: "restaurant-outline",
    tone: "service",
  },
] as const;

export default function RecipesScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [query, setQuery] = useState("");
  const [selectedAccess, setSelectedAccess] = useState<(typeof recipeAccessOptions)[number]["tone"]>("free");
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([]);
  const accessToneStyles = {
    free: styles.freeOption,
    chef: styles.chefOption,
    service: styles.serviceOption,
  };
  const selectedAccessOption =
    recipeAccessOptions.find((option) => option.tone === selectedAccess) ?? recipeAccessOptions[0];
  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return recipeRecommendations;
    }

    return recipeRecommendations.filter((recipe) =>
      [recipe.title, recipe.author, recipe.time, recipe.level].join(" ").toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  useEffect(() => {
    async function loadSavedRecipes() {
      setSavedRecipeIds(await getSavedRecipeIds());
    }

    void loadSavedRecipes();
  }, []);

  async function handleToggleSavedRecipe(recipeId: string) {
    const nextSaved = await toggleSavedRecipe(recipeId);
    setSavedRecipeIds(nextSaved);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <Text style={styles.title}>Explore New Recipes</Text>
      <View style={styles.flowPanel}>
        <Image source={heroFoodImages.recipe} style={styles.accessImage} contentFit="cover" />
        <View style={styles.accessShade} />
        <View style={styles.flowContent}>
          <Text style={styles.accessKicker}>Recipe flow</Text>
          <Text style={styles.accessTitle}>Search a dish, pick the version, then choose who guides it.</Text>
          <View style={styles.flowSteps}>
            {["Find dish", "Choose source", "Start cooking"].map((step, index) => (
              <View key={step} style={styles.flowStepGroup}>
                <View style={[styles.flowStepDot, index === 1 && styles.flowStepDotActive]}>
                  <Text style={styles.flowStepNumber}>{index + 1}</Text>
                </View>
                <Text style={styles.flowStepText}>{step}</Text>
                {index < 2 ? <View style={styles.flowConnector} /> : null}
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.sourceFlow}>
        {recipeAccessOptions.map((option) => (
          <Pressable
            key={option.title}
            style={[
              styles.sourceStep,
              accessToneStyles[option.tone],
              selectedAccess === option.tone && styles.sourceStepActive,
            ]}
            onPress={() => setSelectedAccess(option.tone)}
          >
            <View style={styles.sourceIcon}>
              <Ionicons name={option.icon as keyof typeof Ionicons.glyphMap} size={18} color={activeTheme.primaryDark} />
            </View>
            <View style={styles.sourceCopy}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionMeta}>{option.meta}</Text>
            </View>
            <Ionicons
              name={selectedAccess === option.tone ? "checkmark-circle" : "chevron-forward"}
              size={18}
              color={activeTheme.primaryDark}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.sourceDetail}>
        <View style={styles.sourceDetailIcon}>
          <Ionicons
            name={selectedAccessOption.icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={activeTheme.primaryDark}
          />
        </View>
        <View style={styles.sourceDetailCopy}>
          <Text style={styles.sourceDetailTitle}>{selectedAccessOption.title}</Text>
          <Text style={styles.sourceDetailBody}>{selectedAccessOption.body}</Text>
        </View>
        <Pressable
          style={styles.sourceAction}
          onPress={() => {
            if (selectedAccess === "service") {
              router.push("/all-cooks" as never);
            }
          }}
        >
          <Text style={styles.sourceActionText}>{selectedAccessOption.cta}</Text>
        </Pressable>
      </View>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={activeTheme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search recipes"
          placeholderTextColor={activeTheme.textMuted}
          style={styles.searchInput}
        />
        {query ? (
          <Pressable style={styles.clearButton} onPress={() => setQuery("")}>
            <Ionicons name="close" size={16} color={activeTheme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.chipRow}>
        {["Salad", "Pizza", "Burger", "Steak", "Seafood"].map((item, index) => (
          <Pressable key={item} style={styles.chip} onPress={() => setQuery(item)}>
            <Image source={getCookImage(index)} style={styles.chipImage} contentFit="cover" />
            <Text style={styles.chipText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.recipeGrid}>
        {filteredRecipes.map((recipe) => (
          <Pressable
            key={recipe.id}
            style={styles.recipeCard}
            onPress={() => router.push({ pathname: "/recipe-detail", params: { id: recipe.id } })}
          >
            <Image source={recipe.image} style={styles.recipeImage} contentFit="cover" />
            <View style={styles.recipeShade} />
            <Pressable
              style={styles.recipeHeart}
              onPress={(event) => {
                event.stopPropagation();
                void handleToggleSavedRecipe(recipe.id);
              }}
            >
              <Ionicons
                name={savedRecipeIds.includes(recipe.id) ? "heart" : "heart-outline"}
                size={15}
                color={savedRecipeIds.includes(recipe.id) ? activeTheme.secondaryAccent : activeTheme.text}
              />
            </Pressable>
            <Text style={styles.recipeTitle}>{recipe.title}</Text>
            <Text style={styles.recipeMeta}>{recipe.time} • {recipe.level}</Text>
          </Pressable>
        ))}
      </View>
      {!filteredRecipes.length ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={24} color={activeTheme.textMuted} />
          <Text style={styles.emptyText}>No recipes found. Try another craving.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    content: { padding: theme.spacing.lg, paddingTop: theme.layout.screenTop, gap: theme.spacing.lg },
    backButton: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
    backText: { color: activeTheme.text, fontSize: 15, fontWeight: "800" },
    title: { color: activeTheme.text, fontSize: 32, lineHeight: 38, fontWeight: "900" },
    flowPanel: {
      minHeight: 168,
      borderRadius: 28,
      overflow: "hidden",
      padding: theme.spacing.lg,
      justifyContent: "flex-end",
      backgroundColor: activeTheme.surfaceElevated,
    },
    accessImage: { ...StyleSheet.absoluteFillObject },
    accessShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(16,20,15,0.38)" },
    flowContent: { gap: 16 },
    accessKicker: { color: "#FFE0BD", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
    accessTitle: { color: "#FFFFFF", fontSize: 24, lineHeight: 30, fontWeight: "900" },
    flowSteps: { flexDirection: "row", alignItems: "center", gap: 8 },
    flowStepGroup: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7 },
    flowStepDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.22)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.28)",
    },
    flowStepDotActive: { backgroundColor: "#FFFFFF" },
    flowStepNumber: { color: activeTheme.text, fontSize: 12, fontWeight: "900" },
    flowStepText: { flex: 1, color: "#FFFFFF", fontSize: 11, lineHeight: 14, fontWeight: "900" },
    flowConnector: { flex: 0.25, height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.35)" },
    sourceFlow: { gap: 10 },
    sourceStep: {
      minHeight: 68,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sourceStepActive: {
      borderColor: activeTheme.primaryDark,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    freeOption: { backgroundColor: activeTheme.safeSurface },
    chefOption: { backgroundColor: activeTheme.warmSurface },
    serviceOption: { backgroundColor: activeTheme.focusSurface },
    sourceIcon: {
      width: 34,
      height: 34,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    sourceCopy: { flex: 1, gap: 2 },
    optionTitle: { color: activeTheme.text, fontSize: 14, lineHeight: 18, fontWeight: "900" },
    optionMeta: { color: activeTheme.primaryDark, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
    sourceDetail: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surface,
      padding: theme.spacing.md,
      gap: 12,
    },
    sourceDetailIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.safeSurface,
    },
    sourceDetailCopy: { gap: 5 },
    sourceDetailTitle: { color: activeTheme.text, fontSize: 18, lineHeight: 23, fontWeight: "900" },
    sourceDetailBody: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20, fontWeight: "700" },
    sourceAction: {
      minHeight: 46,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primary,
      paddingHorizontal: 18,
    },
    sourceActionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
    searchRow: {
      minHeight: 56,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surface,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    searchInput: { flex: 1, color: activeTheme.text, fontSize: 15, fontWeight: "700" },
    clearButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surfaceElevated,
    },
    chipRow: { flexDirection: "row", gap: 12 },
    chip: { alignItems: "center", gap: 7 },
    chipImage: { width: 56, height: 56, borderRadius: 28 },
    chipText: { color: activeTheme.text, fontSize: 12, fontWeight: "800" },
    recipeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    recipeCard: {
      width: "48%",
      height: 210,
      borderRadius: 28,
      overflow: "hidden",
      padding: theme.spacing.md,
      justifyContent: "flex-end",
      backgroundColor: activeTheme.surfaceElevated,
    },
    recipeImage: { ...StyleSheet.absoluteFillObject },
    recipeShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
    recipeHeart: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "rgba(255,255,255,0.86)",
      alignItems: "center",
      justifyContent: "center",
    },
    recipeTitle: { color: "#FFFFFF", fontSize: 18, lineHeight: 23, fontWeight: "900" },
    recipeMeta: { color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: "800", marginTop: 5 },
    emptyState: {
      minHeight: 160,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surface,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: theme.spacing.lg,
    },
    emptyText: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 21, fontWeight: "700", textAlign: "center" },
  });
