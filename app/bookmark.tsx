import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from "react-native";

import LogoLoadingScreen from "@/components/LogoLoadingScreen";
import { type CookDirectoryRecord } from "@/lib/cook-data";
import { getCookImage, heroFoodImages } from "@/lib/food-visuals";
import { fetchSavedCooks } from "@/lib/saved-cooks";
import { getTheme, theme } from "@/theme/theme";

const bookmarkSections = [
  {
    title: "Recently Viewed",
    image: heroFoodImages.salad,
    count: "32+",
  },
  {
    title: "Made It",
    image: heroFoodImages.platter,
    count: "10",
  },
  {
    title: "Breakfast",
    image: heroFoodImages.dessert,
    count: "18",
  },
];

export default function BookmarkScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [savedCooks, setSavedCooks] = useState<CookDirectoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSaved() {
      const nextSaved = await fetchSavedCooks();
      setSavedCooks(nextSaved);
      setIsLoading(false);
    }

    void loadSaved();
  }, []);

  if (isLoading) {
    return <LogoLoadingScreen title="Loading bookmarks" subtitle="Gathering your saved recipes, cook profiles, and recent picks." />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <View style={styles.topBar}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={19} color={activeTheme.text} />
        </Pressable>
        <Text style={styles.title}>Bookmark</Text>
        <Pressable style={styles.iconButton} onPress={() => router.push("/search")}>
          <Ionicons name="search" size={18} color={activeTheme.text} />
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={activeTheme.textMuted} />
        <TextInput
          placeholder="Search saved recipes"
          placeholderTextColor={activeTheme.textMuted}
          style={styles.searchInput}
        />
      </View>

      {bookmarkSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.seeAll}>See all</Text>
          </View>
          <View style={styles.bookmarkRow}>
            <Pressable style={styles.wideCard} onPress={() => router.push("/recipes" as never)}>
              <Image source={section.image} style={styles.cardImage} contentFit="cover" />
              <View style={styles.cardShade} />
              <Text style={styles.cardTitle}>{section.title}</Text>
            </Pressable>
            <Pressable style={styles.smallStackCard} onPress={() => router.push("/recipes" as never)}>
              <Image source={getCookImage(section.title.length)} style={styles.cardImage} contentFit="cover" />
              <View style={styles.cardShade} />
              <Text style={styles.countText}>{section.count}</Text>
              <Text style={styles.countLabel}>Recipes</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Saved cooks</Text>
          <Text style={styles.seeAll}>{savedCooks.length}</Text>
        </View>
        {savedCooks.length ? (
          <View style={styles.savedGrid}>
            {savedCooks.slice(0, 4).map((cook, index) => (
              <Pressable
                key={cook.id}
                style={styles.savedCookCard}
                onPress={() => router.push({ pathname: "/cooks/[id]", params: { id: cook.id } })}
              >
                <Image source={getCookImage(index)} style={styles.savedCookImage} contentFit="cover" />
                <Text numberOfLines={1} style={styles.savedCookName}>{cook.name}</Text>
                <Text numberOfLines={1} style={styles.savedCookMeta}>{cook.specialties[0] || cook.location}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>Save cooks and recipes to keep them here.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    content: {
      width: "100%",
      alignSelf: "center",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.layout.screenTop,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    title: { color: activeTheme.text, fontSize: 28, fontWeight: "900" },
    searchBar: {
      minHeight: 52,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    searchInput: { flex: 1, color: activeTheme.text, fontSize: 14 },
    section: { gap: 12 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    sectionTitle: { color: activeTheme.text, fontSize: 20, fontWeight: "900" },
    seeAll: { color: activeTheme.primaryDark, fontSize: 13, fontWeight: "900" },
    bookmarkRow: { flexDirection: "row", gap: 10 },
    wideCard: {
      flex: 1.45,
      height: 118,
      borderRadius: 20,
      overflow: "hidden",
      justifyContent: "flex-end",
      padding: 12,
    },
    smallStackCard: {
      flex: 0.9,
      height: 118,
      borderRadius: 20,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
    },
    cardImage: { ...StyleSheet.absoluteFillObject },
    cardShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.34)" },
    cardTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
    countText: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
    countLabel: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
    savedGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    savedCookCard: {
      width: "48%",
      borderRadius: 22,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: 10,
      gap: 8,
    },
    savedCookImage: { width: "100%", height: 96, borderRadius: 16 },
    savedCookName: { color: activeTheme.text, fontSize: 15, fontWeight: "900" },
    savedCookMeta: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
    emptyText: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 21 },
  });
