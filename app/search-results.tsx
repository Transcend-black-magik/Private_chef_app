import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";

import { getCurrentUserRecord } from "@/lib/app-state";
import {
  fetchCookDirectory,
  filterCooks,
  sortCooks,
  type CookDirectoryRecord,
} from "@/lib/cook-data";
import { getExplorerContext } from "@/lib/explorer-context";
import { heroFoodImages } from "@/lib/food-visuals";
import { getMealItemsByCategory, mealCategories, type MealCategoryKey } from "@/lib/meal-data";
import { getTheme, theme } from "@/theme/theme";

export default function SearchResultsScreen() {
  const params = useLocalSearchParams<{ query?: string; category?: string }>();
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const initialCategory = mealCategories.includes((params.category || params.query) as MealCategoryKey)
    ? ((params.category || params.query) as MealCategoryKey)
    : "";
  const [query, setQuery] = useState(
    params.query && params.query !== initialCategory ? params.query : "",
  );
  const [directory, setDirectory] = useState<CookDirectoryRecord[]>([]);
  const [explorerContext, setExplorerContext] = useState(() => getExplorerContext(null));

  useEffect(() => {
    async function loadDirectory() {
      const [nextDirectory, currentUser] = await Promise.all([
        fetchCookDirectory(),
        getCurrentUserRecord(),
      ]);
      setDirectory(nextDirectory);
      setExplorerContext(getExplorerContext(currentUser));
    }

    void loadDirectory();
  }, []);

  const categoryItems = useMemo(() => {
    if (!initialCategory) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    return getMealItemsByCategory(initialCategory).filter((item) => {
      if (!normalizedQuery) {
        return true;
      }

      return [item.title, item.subtitle, item.category, item.ingredients.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [initialCategory, query]);
  const results = useMemo(() => {
    const baseResults = filterCooks({
      cooks: directory,
      searchQuery: query || initialCategory,
      selectedCuisine: "All",
      isAvailableNow: false,
      isVerifiedOnly: false,
    });
    const categoryResults = initialCategory
      ? baseResults.filter((cook) => cook.user.availableMealCategories?.includes(initialCategory))
      : baseResults;

    return sortCooks(categoryResults, "popular");
  }, [directory, initialCategory, query]);

  return (
    <View style={styles.screen}>
      <Pressable style={styles.fixedBackButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
      </Pressable>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <View style={styles.headerBlock}>
        <Image source={heroFoodImages.platter} style={styles.headerImage} contentFit="cover" />
        <View style={styles.headerShade} />
        <Text style={styles.title}>Search results</Text>
        <Text style={styles.subtitle}>Keep refining trusted cooks for {explorerContext.cityLabel}.</Text>
      </View>

      <View style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={activeTheme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={initialCategory ? `Search ${initialCategory.toLowerCase()} ideas` : `Search again around ${explorerContext.cityLabel}`}
            placeholderTextColor={activeTheme.textMuted}
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>
          {initialCategory ? `${initialCategory} ideas` : `${results.length} ${results.length === 1 ? "cook" : "cooks"} found`}
        </Text>
        <Text style={styles.resultSubtitle}>
          {initialCategory
            ? `Pick a ${initialCategory.toLowerCase()} idea and we will look for cooks who can handle it soon.`
            : `Sorted by the strongest mix of trust, completeness, and fit for homes around ${explorerContext.cityLabel}.`}
        </Text>
      </View>

      {categoryItems.length ? (
        <View style={styles.mealGrid}>
          {categoryItems.map((item) => (
            <Pressable
              key={item.id}
              style={styles.mealCard}
              onPress={() => router.push({ pathname: "/meal-item", params: { id: item.id, category: initialCategory } } as never)}
            >
              <Image source={item.image} style={styles.mealImage} contentFit="cover" />
              <View style={styles.mealCopy}>
                <Text style={styles.mealTitle}>{item.title}</Text>
                <Text numberOfLines={2} style={styles.mealSubtitle}>{item.subtitle}</Text>
                <View style={styles.mealMetaRow}>
                  <Text style={styles.mealMeta}>{item.minutes} min</Text>
                  <Text style={styles.mealMeta}>{item.priceHint}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!initialCategory ? (
        <View style={styles.stack}>
          {results.map((cook) => (
            <Pressable
              key={cook.id}
              style={styles.cookResult}
              onPress={() => router.push({ pathname: "/cooks/[id]", params: { id: cook.id } } as never)}
            >
              <Text style={styles.cookResultTitle}>{cook.name}</Text>
              <Text numberOfLines={2} style={styles.cookResultBody}>{cook.headline}</Text>
              <View style={styles.mealMetaRow}>
                <Text style={styles.mealMeta}>{cook.location}</Text>
                <Text style={styles.mealMeta}>{cook.yearsExperience} yrs</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      </ScrollView>
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
      width: "100%",
      maxWidth: Platform.OS === "web" ? 1040 : undefined,
      alignSelf: "center",
    },
    fixedBackButton: {
      position: "absolute",
      top: theme.layout.screenTop,
      left: theme.spacing.lg,
      zIndex: 30,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    headerBlock: {
      minHeight: 220,
      borderRadius: 34,
      overflow: "hidden",
      padding: theme.spacing.lg,
      justifyContent: "flex-end",
      gap: 6,
      backgroundColor: activeTheme.primaryDark,
    },
    headerImage: { ...StyleSheet.absoluteFillObject },
    headerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.38)" },
    title: { color: "#FFFFFF", fontSize: 32, lineHeight: 37, fontWeight: "900" },
    subtitle: { color: "rgba(255,255,255,0.84)", fontSize: 15, lineHeight: 23 },
    searchCard: {
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: 28,
      padding: theme.spacing.md,
      marginTop: -40,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    searchRow: {
      minHeight: 56,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.bg,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    searchInput: { flex: 1, color: activeTheme.text, fontSize: 15 },
    searchInputLocked: { color: activeTheme.textMuted },
    resultHeader: { gap: 4 },
    resultTitle: { color: activeTheme.text, fontSize: 24, lineHeight: 30, fontWeight: "800" },
    resultSubtitle: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 21 },
    stack: { gap: theme.spacing.md },
    mealGrid: { gap: 12 },
    mealCard: {
      flexDirection: "row",
      gap: 12,
      borderRadius: 28,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: 10,
    },
    mealImage: {
      width: 112,
      height: 112,
      borderRadius: 22,
    },
    mealCopy: { flex: 1, gap: 6, justifyContent: "center" },
    mealTitle: { color: activeTheme.text, fontSize: 18, fontWeight: "900" },
    mealSubtitle: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 19 },
    mealMetaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    mealMeta: {
      color: activeTheme.primaryDark,
      fontSize: 12,
      fontWeight: "900",
      backgroundColor: activeTheme.safeSurface,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    cookResult: {
      borderRadius: 24,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 8,
    },
    cookResultTitle: { color: activeTheme.text, fontSize: 18, fontWeight: "900" },
    cookResultBody: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20 },
  });
