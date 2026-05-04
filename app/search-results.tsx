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
import { router, useLocalSearchParams } from "expo-router";

import DiscoveryCookCard from "@/components/DiscoveryCookCard";
import { getCurrentUserRecord } from "@/lib/app-state";
import {
  fetchCookDirectory,
  filterCooks,
  sortCooks,
  type CookDirectoryRecord,
} from "@/lib/cook-data";
import { getExplorerContext } from "@/lib/explorer-context";
import { getTheme, theme } from "@/theme/theme";

export default function SearchResultsScreen() {
  const params = useLocalSearchParams<{ query?: string }>();
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [query, setQuery] = useState(params.query ?? "");
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

  const results = useMemo(
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
      ),
    [directory, query],
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.headerBlock}>
        <Text style={styles.title}>Search results</Text>
        <Text style={styles.subtitle}>Keep refining the list for {explorerContext.cityLabel} without leaving the results page.</Text>
      </View>

      <View style={styles.searchCard}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={activeTheme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search again around ${explorerContext.cityLabel}`}
            placeholderTextColor={activeTheme.textMuted}
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>
          {results.length} {results.length === 1 ? "cook" : "cooks"} found
        </Text>
        <Text style={styles.resultSubtitle}>
          Sorted by the strongest mix of trust, completeness, and fit for homes around {explorerContext.cityLabel}.
        </Text>
      </View>

      <View style={styles.stack}>
        {results.map((cook) => (
          <DiscoveryCookCard key={cook.id} cook={cook} />
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
      backgroundColor: activeTheme.surface,
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
      backgroundColor: activeTheme.bg,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    searchInput: { flex: 1, color: activeTheme.text, fontSize: 15 },
    resultHeader: { gap: 4 },
    resultTitle: { color: activeTheme.text, fontSize: 24, lineHeight: 30, fontWeight: "800" },
    resultSubtitle: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 21 },
    stack: { gap: theme.spacing.md },
  });
