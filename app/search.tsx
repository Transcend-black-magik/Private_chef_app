import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";

import DiscoveryCookCard from "@/components/DiscoveryCookCard";
import { fetchCookDirectory, filterCooks, sortCooks, type CookDirectoryRecord } from "@/lib/cook-data";
import { foodCategories, heroFoodImages } from "@/lib/food-visuals";
import { getMealItemsByCategory, mealCategories, mealItems } from "@/lib/meal-data";
import { getTheme, theme } from "@/theme/theme";

export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<(typeof mealCategories)[number] | null>(null);
  const [sheetSearchOpen, setSheetSearchOpen] = useState(false);
  const [sheetQuery, setSheetQuery] = useState("");
  const [directory, setDirectory] = useState<CookDirectoryRecord[]>([]);
  const activeQuery = submittedQuery || query;
  const sheetTranslateY = useMemo(() => new Animated.Value(0), []);
  const sheetOffsetY = useMemo(() => ({ current: 0 }), []);
  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
        onPanResponderMove: (_, gesture) => {
          sheetTranslateY.setValue(Math.max(-90, Math.min(gesture.dy + sheetOffsetY.current, 230)));
        },
        onPanResponderRelease: (_, gesture) => {
          const nextValue = gesture.dy + sheetOffsetY.current;

          if (nextValue > 150) {
            setSelectedCategory(null);
            sheetOffsetY.current = 0;
            sheetTranslateY.setValue(0);
            return;
          }

          const snapTo = nextValue < -45 ? -90 : 0;
          sheetOffsetY.current = snapTo;
          Animated.spring(sheetTranslateY, { toValue: snapTo, useNativeDriver: true }).start();
        },
      }),
    [sheetOffsetY, sheetTranslateY],
  );

  useEffect(() => {
    async function loadDirectory() {
      const nextDirectory = await fetchCookDirectory();
      setDirectory(nextDirectory);
    }

    void loadDirectory();
  }, []);

  const cookResults = useMemo(
    () =>
      sortCooks(
        filterCooks({
          cooks: directory,
          searchQuery: activeQuery,
          selectedCuisine: "All",
          isAvailableNow: false,
          isVerifiedOnly: false,
        }),
        "popular",
      ),
    [activeQuery, directory],
  );
  const mealResults = useMemo(() => {
    const normalizedQuery = activeQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return mealItems.slice(0, 4);
    }

    return mealItems.filter((item) =>
      [item.title, item.subtitle, item.category, item.ingredients.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [activeQuery]);
  const categoryModalItems = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    const normalizedQuery = sheetQuery.trim().toLowerCase();
    return getMealItemsByCategory(selectedCategory).filter((item) => {
      if (!normalizedQuery) {
        return true;
      }

      return [item.title, item.subtitle, item.ingredients.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [selectedCategory, sheetQuery]);

  function handleSearch() {
    setSubmittedQuery(query.trim());
  }

  function openCategory(category: (typeof mealCategories)[number]) {
    setSelectedCategory(category);
    setSheetQuery("");
    setSheetSearchOpen(false);
    sheetOffsetY.current = 0;
    sheetTranslateY.setValue(0);
  }

  return (
    <View style={styles.screen}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={19} color="#171713" />
      </Pressable>
      <View style={styles.headerBlock}>
        <Image source={heroFoodImages.pasta} style={styles.headerImage} contentFit="cover" />
        <View style={styles.headerShade} />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Find food fast</Text>
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={activeTheme.textMuted} />
          <TextInput
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              if (!value.trim()) {
                setSubmittedQuery("");
              }
            }}
            placeholder="Search cooks, dishes, or your area"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoFocus
          />
          {query ? (
            <Pressable
              style={styles.clearButton}
              onPress={() => {
                setQuery("");
                setSubmittedQuery("");
              }}
            >
              <Ionicons name="close" size={16} color={activeTheme.textMuted} />
            </Pressable>
          ) : null}
          <Pressable style={styles.goButton} onPress={handleSearch}>
            <Ionicons name="options-outline" size={18} color={activeTheme.textMuted} />
          </Pressable>
        </View>
      </View>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                  bounces={false}
                  overScrollMode="never">

      {!query.trim() ? (
        <View style={styles.shortcutSection}>
          <View style={styles.shortcutHeader}>
            <Text style={styles.shortcutKicker}>Quick paths</Text>
            <Text style={styles.shortcutTitle}>Choose a meal moment</Text>
          </View>
          <View style={styles.categoryGrid}>
            {foodCategories.slice(0, 6).map((item) => {
              const isMealCategory = mealCategories.includes(item.label);
              const categoryCount = isMealCategory ? getMealItemsByCategory(item.label).length : 0;
              return (
              <Pressable
                key={item.label}
                style={styles.categoryPill}
                onPress={() => openCategory(item.label)}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons name={item.icon} size={16} color={activeTheme.primaryDark} />
                </View>
                <Text style={styles.categoryText}>{item.label}</Text>
                <Text style={styles.categoryMeta}>
                  {isMealCategory ? `${categoryCount} meals` : "Explore"}
                </Text>
              </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>
            {activeQuery.trim() ? `Results for "${activeQuery.trim()}"` : "Start with a craving"}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {activeQuery.trim()
              ? `${mealResults.length} meal ideas and ${cookResults.length} cooks matched your search.`
              : `Type a dish or choose breakfast, lunch, or dinner for the next-page meal flow.`}
          </Text>
        </View>
      </View>

      <Text style={styles.listTitle}>{activeQuery.trim() ? "Matching meals" : "Meal ideas"}</Text>

      <View style={styles.mealRail}>
        {mealResults.slice(0, 6).map((item) => (
          <Pressable
            key={item.id}
            style={styles.mealCard}
            onPress={() => router.push({ pathname: "/meal-item", params: { id: item.id, category: item.category } } as never)}
          >
            <Image source={item.image} style={styles.mealImage} contentFit="cover" />
            <View style={styles.mealCopy}>
              <Text numberOfLines={1} style={styles.mealTitle}>{item.title}</Text>
              <Text numberOfLines={2} style={styles.mealSubtitle}>{item.subtitle}</Text>
              <View style={styles.mealMetaRow}>
                <Text style={styles.mealMeta}>{item.minutes} min</Text>
                <Text style={styles.mealMeta}>{item.priceHint}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      <Text style={styles.listTitle}>{activeQuery.trim() ? "Matching cooks" : "Popular cooks near you"}</Text>

      <View style={styles.stack}>
        {cookResults.slice(0, activeQuery.trim() ? 12 : 4).map((cook) => (
          <DiscoveryCookCard key={cook.id} cook={cook} compact />
        ))}
      </View>
      {activeQuery.trim() && !mealResults.length && !cookResults.length ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={24} color={activeTheme.textMuted} />
          <Text style={styles.emptyText}>No matches yet. Try a dish, cuisine, cook name, or neighborhood.</Text>
        </View>
      ) : null}

      <Modal visible={Boolean(selectedCategory)} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.sheetBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <Pressable style={styles.sheetDismissArea} onPress={() => setSelectedCategory(null)} />
          <Animated.View style={[styles.categorySheet, { transform: [{ translateY: sheetTranslateY }] }]}>
            <View style={styles.dragZone} {...sheetPanResponder.panHandlers}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBlock}>
                <Text style={styles.sheetKicker}>Available now</Text>
                <Text style={styles.sheetTitle}>{selectedCategory}</Text>
              </View>
              <Pressable
                style={[styles.sheetIconButton, sheetSearchOpen && styles.sheetIconButtonActive]}
                onPress={() => setSheetSearchOpen((value) => !value)}
              >
                <Ionicons name="search" size={18} color={sheetSearchOpen ? "#FFFFFF" : activeTheme.text} />
              </Pressable>
            </View>
            {sheetSearchOpen ? (
              <View style={styles.sheetSearchRow}>
                <Ionicons name="search" size={17} color={activeTheme.textMuted} />
                <TextInput
                  value={sheetQuery}
                  onChangeText={setSheetQuery}
                  placeholder={`Search ${selectedCategory?.toLowerCase()} dishes`}
                  placeholderTextColor={activeTheme.textMuted}
                  style={styles.sheetSearchInput}
                  autoFocus
                />
              </View>
            ) : null}
            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
              {categoryModalItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.sheetMealCard}
                  onPress={() => {
                    setSelectedCategory(null);
                    router.push({ pathname: "/meal-item", params: { id: item.id, category: item.category } } as never);
                  }}
                >
                  <Image source={item.image} style={styles.sheetMealImage} contentFit="cover" />
                  <View style={styles.sheetMealCopy}>
                    <Text numberOfLines={1} style={styles.sheetMealTitle}>{item.title}</Text>
                    <Text numberOfLines={2} style={styles.sheetMealBody}>{item.subtitle}</Text>
                    <View style={styles.mealMetaRow}>
                      <Text style={styles.mealMeta}>{item.minutes} min</Text>
                      <Text style={styles.mealMeta}>{item.priceHint}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={activeTheme.textMuted} />
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
      </ScrollView>
    </View>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    scrollArea: { flex: 1 },
    content: {
      paddingHorizontal: 0,
      paddingTop: 244,
      paddingBottom: 0,
      gap: theme.spacing.md,
      width: "100%",
      alignSelf: "center",
    },
    backButton: {
      position: "absolute",
      top: theme.layout.screenTop - 8,
      left: theme.spacing.lg,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.92)",
      zIndex: 30,
      elevation: 30,
    },
    headerBlock: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      elevation: 20,
      minHeight: 230,
      overflow: "hidden",
      padding: theme.spacing.md,
      paddingTop: theme.layout.screenTop - 8,
      justifyContent: "space-between",
      gap: 8,
      backgroundColor: "#14160F",
      borderBottomLeftRadius: 34,
      borderBottomRightRadius: 34,
    },
    headerImage: { ...StyleSheet.absoluteFillObject },
    headerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.18)" },
    headerCopy: { gap: 4, maxWidth: 280, marginTop: 46 },
    heroHello: {
      color: "#FFF7E8",
      fontSize: 14,
      fontWeight: "700",
    },
    title: { color: "#FFFFFF", fontSize: 28, lineHeight: 34, fontWeight: "900" },
    searchRow: {
      minHeight: 54,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surface,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 0,
    },
    searchInput: { flex: 1, color: activeTheme.text, fontSize: 14, fontWeight: "600" },
    clearButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surfaceElevated,
    },
    goButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
    },
    shortcutSection: {
      paddingHorizontal: theme.spacing.lg,
      gap: 12,
    },
    shortcutHeader: { gap: 3 },
    shortcutKicker: {
      color: activeTheme.primaryDark,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    shortcutTitle: { color: activeTheme.text, fontSize: 20, lineHeight: 25, fontWeight: "900" },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    categoryPill: {
      minHeight: 48,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    categoryIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.safeSurface,
    },
    categoryText: { color: activeTheme.text, fontSize: 13, fontWeight: "800" },
    categoryMeta: { color: activeTheme.textMuted, fontSize: 11, fontWeight: "800" },
    sectionHeader: {
      paddingHorizontal: theme.spacing.lg,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionCopy: { flex: 1, gap: 4 },
    sectionTitle: { color: activeTheme.text, fontSize: 24, lineHeight: 30, fontWeight: "800" },
    sectionSubtitle: { color: activeTheme.textMuted, fontSize: 15, lineHeight: 22 },
    listTitle: {
      paddingHorizontal: theme.spacing.lg,
      color: activeTheme.text,
      fontSize: 19,
      lineHeight: 24,
      fontWeight: "900",
    },
    mealRail: { paddingHorizontal: theme.spacing.lg, gap: 12 },
    mealCard: {
      flexDirection: "row",
      gap: 12,
      minHeight: 126,
      backgroundColor: activeTheme.surface,
      padding: 10,
      borderRadius: 26,
    },
    mealImage: { width: 106, height: 106, borderRadius: 22 },
    mealCopy: { flex: 1, justifyContent: "center", gap: 6 },
    mealTitle: { color: activeTheme.text, fontSize: 17, fontWeight: "900" },
    mealSubtitle: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 19 },
    mealMetaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    mealMeta: {
      color: activeTheme.primaryDark,
      fontSize: 11,
      fontWeight: "900",
      backgroundColor: activeTheme.safeSurface,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    stack: { gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
    emptyState: {
      marginHorizontal: theme.spacing.lg,
      minHeight: 150,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: activeTheme.surface,
      borderRadius: 24,
      padding: theme.spacing.lg,
    },
    emptyText: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },
    sheetBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "transparent",
    },
    sheetDismissArea: { flex: 1 },
    categorySheet: {
      maxHeight: "90%",
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: activeTheme.bg,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: 10,
      paddingBottom: theme.spacing.xl,
      gap: 12,
    },
    dragZone: { alignItems: "center", paddingVertical: 5 },
    sheetHandle: {
      width: 48,
      height: 5,
      borderRadius: 999,
      backgroundColor: activeTheme.border,
    },
    sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    sheetTitleBlock: { flex: 1, gap: 2 },
    sheetKicker: { color: activeTheme.primaryDark, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
    sheetTitle: { color: activeTheme.text, fontSize: 27, lineHeight: 32, fontWeight: "900" },
    sheetIconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    sheetIconButtonActive: { backgroundColor: activeTheme.primaryDark, borderColor: activeTheme.primaryDark },
    sheetSearchRow: {
      minHeight: 50,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surface,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },
    sheetSearchInput: { flex: 1, color: activeTheme.text, fontSize: 14, fontWeight: "700" },
    sheetList: { marginHorizontal: -theme.spacing.lg, paddingHorizontal: theme.spacing.lg },
    sheetMealCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 24,
      backgroundColor: activeTheme.surface,
      padding: 10,
      marginBottom: 12,
    },
    sheetMealImage: { width: 82, height: 82, borderRadius: 20 },
    sheetMealCopy: { flex: 1, gap: 5 },
    sheetMealTitle: { color: activeTheme.text, fontSize: 16, fontWeight: "900" },
    sheetMealBody: { color: activeTheme.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  });
