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
import { router } from "expo-router";

import DiscoveryCookCard from "@/components/DiscoveryCookCard";
import { getCurrentUserRecord } from "@/lib/app-state";
import { fetchCookDirectory, filterCooks, sortCooks, type CookDirectoryRecord } from "@/lib/cook-data";
import { getExplorerContext } from "@/lib/explorer-context";
import { foodCategories, heroFoodImages } from "@/lib/food-visuals";
import { getTheme, theme } from "@/theme/theme";

export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [query, setQuery] = useState("");
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

  const previewResults = useMemo(
    () =>
      sortCooks(
        filterCooks({
          cooks: directory,
          searchQuery: query,
          selectedCuisine: "All",
          isAvailableNow: false,
          isVerifiedOnly: false,
        }),
        "popular",
      ).slice(0, 4),
    [directory, query],
  );

  function handleSearch() {
    router.push({
      pathname: "/search-results",
      params: { query: query.trim() },
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.headerBlock}>
        <Image source={heroFoodImages.pasta} style={styles.headerImage} contentFit="cover" />
        <View style={styles.headerShade} />
        <Text style={styles.title}>Search cooks</Text>
        <Text style={styles.subtitle}>
          Search by dish, cook name, or area around {explorerContext.cityLabel}.
        </Text>
      </View>

      <View style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={activeTheme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Jollof, private dining, ${explorerContext.cityLabel}...`}
            placeholderTextColor={activeTheme.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <Pressable style={styles.goButton} onPress={handleSearch}>
            <Text style={styles.goButtonText}>Go</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.categoryGrid}>
        {foodCategories.slice(0, 6).map((item) => (
          <Pressable
            key={item.label}
            style={styles.categoryPill}
            onPress={() =>
              router.push({
                pathname: "/search-results",
                params: { query: item.label },
              })
            }
          >
            <Ionicons name={item.icon} size={16} color={activeTheme.primaryDark} />
            <Text style={styles.categoryText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>Quick matches</Text>
          <Text style={styles.sectionSubtitle}>
            {query.trim()
              ? `${previewResults.length} strong matches for "${query.trim()}".`
              : `Start typing and we'll pull a focused preview around ${explorerContext.cityLabel}.`}
          </Text>
        </View>
        {query.trim() ? (
          <Pressable style={styles.seeAllButton} onPress={handleSearch}>
            <Text style={styles.seeAllText}>See all</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.stack}>
        {previewResults.map((cook) => (
          <DiscoveryCookCard key={cook.id} cook={cook} compact />
        ))}
      </View>
    </ScrollView>
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
    backButton: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
    backText: { color: activeTheme.text, fontSize: 15, fontWeight: "700" },
    headerBlock: {
      minHeight: 230,
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
      marginTop: -42,
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
      backgroundColor: activeTheme.surface,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    searchInput: { flex: 1, color: activeTheme.text, fontSize: 15 },
    goButton: {
      minWidth: 42,
      height: 34,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.accent,
    },
    goButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    categoryPill: {
      minHeight: 40,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 13,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    categoryText: { color: activeTheme.text, fontSize: 13, fontWeight: "800" },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionCopy: { flex: 1, gap: 4 },
    sectionTitle: { color: activeTheme.text, fontSize: 24, lineHeight: 30, fontWeight: "800" },
    sectionSubtitle: { color: activeTheme.textMuted, fontSize: 15, lineHeight: 22 },
    seeAllButton: {
      minHeight: 34,
      paddingHorizontal: 12,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surfaceElevated,
    },
    seeAllText: { color: activeTheme.text, fontSize: 13, fontWeight: "800" },
    stack: { gap: theme.spacing.md },
  });
