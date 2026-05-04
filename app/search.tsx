import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import DiscoveryCookCard from "@/components/DiscoveryCookCard";
import { getCurrentUserRecord } from "@/lib/app-state";
import { fetchCookDirectory, filterCooks, sortCooks, type CookDirectoryRecord } from "@/lib/cook-data";
import { getExplorerContext } from "@/lib/explorer-context";
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.headerBlock}>
        <Text style={styles.title}>Search cooks</Text>
        <Text style={styles.subtitle}>
          Search by dish, cook name, or area around {explorerContext.cityLabel}, then preview the strongest matches before opening the full list.
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
    },
    backButton: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
    backText: { color: activeTheme.text, fontSize: 15, fontWeight: "700" },
    headerBlock: { gap: 6 },
    title: { color: activeTheme.text, fontSize: 30, lineHeight: 34, fontWeight: "800" },
    subtitle: { color: activeTheme.textMuted, fontSize: 15, lineHeight: 23 },
    searchCard: {
      backgroundColor: activeTheme.warmSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
    },
    searchRow: {
      minHeight: 56,
      borderRadius: theme.radius.md,
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
      backgroundColor: activeTheme.primary,
    },
    goButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
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
