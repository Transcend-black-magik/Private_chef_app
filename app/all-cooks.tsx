import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import DiscoveryCookCard from "@/components/DiscoveryCookCard";
import { getCurrentUserRecord } from "@/lib/app-state";
import {
  fetchCookDirectory,
  sortCooks,
  type CookDirectoryRecord,
  type CookSortMode,
} from "@/lib/cook-data";
import { getExplorerContext } from "@/lib/explorer-context";
import { getTheme, theme } from "@/theme/theme";

const sortOptions: { label: string; value: CookSortMode }[] = [
  { label: "Popular", value: "popular" },
  { label: "Verified", value: "verified" },
  { label: "Complete", value: "complete" },
  { label: "Area", value: "nearby" },
];

export default function AllCooksScreen() {
  const params = useLocalSearchParams<{ sort?: string }>();
  const initialSort = (params.sort as CookSortMode) || "popular";
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [sortMode, setSortMode] = useState<CookSortMode>(initialSort);
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

  const cooks = useMemo(() => sortCooks(directory, sortMode), [directory, sortMode]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.headerBlock}>
        <Text style={styles.title}>All cooks</Text>
        <Text style={styles.subtitle}>Browse the full directory for {explorerContext.cityLabel} with a calmer sort system instead of a crowded home screen.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                bounces={false}
                overScrollMode="never" contentContainerStyle={styles.sortRow}>
        {sortOptions.map((option) => {
          const active = option.value === sortMode;
          return (
            <Pressable
              key={option.value}
              style={[styles.sortChip, active && styles.sortChipActive]}
              onPress={() => setSortMode(option.value)}
            >
              <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.stack}>
        {cooks.map((cook) => (
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
    sortRow: { gap: 10, paddingRight: 10 },
    sortChip: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    sortChipActive: {
      backgroundColor: activeTheme.primary,
      borderColor: activeTheme.primary,
    },
    sortChipText: { color: activeTheme.text, fontSize: 14, fontWeight: "700" },
    sortChipTextActive: { color: "#FFFFFF" },
    stack: { gap: theme.spacing.md },
  });
