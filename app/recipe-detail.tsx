import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";

import { getRecipeById } from "@/lib/recipe-data";
import { getTheme, theme } from "@/theme/theme";

export default function RecipeDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const recipe = getRecipeById(params.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <View style={styles.hero}>
        <Image source={recipe.image} style={styles.heroImage} contentFit="cover" />
        <View style={styles.heroActions}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={19} color={activeTheme.text} />
          </Pressable>
          <Pressable style={styles.iconButton}>
            <Ionicons name="bookmark-outline" size={18} color={activeTheme.text} />
          </Pressable>
        </View>
        <View style={styles.heroDots}>
          <View style={[styles.heroDot, styles.heroDotActive]} />
          <View style={styles.heroDot} />
          <View style={styles.heroDot} />
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>{recipe.title}</Text>
            <Text style={styles.author}>By {recipe.author}</Text>
          </View>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={15} color="#FFCA45" />
            <Text style={styles.ratingText}>{recipe.rating}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={15} color={activeTheme.textMuted} />
            <Text style={styles.metaText}>{recipe.time}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="stats-chart-outline" size={15} color={activeTheme.textMuted} />
            <Text style={styles.metaText}>{recipe.level}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="flame-outline" size={15} color={activeTheme.textMuted} />
            <Text style={styles.metaText}>{recipe.calories}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.bodyText}>{recipe.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <View style={styles.ingredientStack}>
            {recipe.ingredients.map((ingredient) => (
              <View key={ingredient.name} style={styles.ingredientRow}>
                <View style={styles.ingredientIcon}>
                  <Ionicons
                    name={ingredient.icon as keyof typeof Ionicons.glyphMap}
                    size={17}
                    color={activeTheme.primaryDark}
                  />
                </View>
                <Text style={styles.ingredientName}>{ingredient.name}</Text>
                <Text style={styles.ingredientAmount}>{ingredient.amount}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable style={styles.watchButton} onPress={() => router.push("/recipes" as never)}>
          <Ionicons name="play-circle" size={18} color="#FFFFFF" />
          <Text style={styles.watchButtonText}>Watch Videos</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    content: { paddingBottom: theme.spacing.xl },
    hero: {
      height: 350,
      overflow: "hidden",
      backgroundColor: activeTheme.bg,
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    heroActions: {
      position: "absolute",
      top: theme.layout.screenTop + 2,
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "rgba(255,255,255,0.88)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroDots: {
      position: "absolute",
      bottom: 54,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      gap: 5,
    },
    heroDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "rgba(255,255,255,0.56)",
    },
    heroDotActive: {
      width: 16,
      backgroundColor: "#FFFFFF",
    },
    sheet: {
      marginTop: -44,
      borderTopLeftRadius: 36,
      borderTopRightRadius: 36,
      backgroundColor: activeTheme.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    handle: {
      alignSelf: "center",
      width: 52,
      height: 5,
      borderRadius: 999,
      backgroundColor: activeTheme.border,
      marginBottom: 4,
    },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    titleCopy: { flex: 1, gap: 4 },
    title: { color: activeTheme.text, fontSize: 24, lineHeight: 31, fontWeight: "900" },
    author: { color: activeTheme.textMuted, fontSize: 13, fontWeight: "700" },
    ratingPill: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: activeTheme.surfaceElevated,
    },
    ratingText: { color: activeTheme.text, fontSize: 13, fontWeight: "900" },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    metaText: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
    section: { gap: 10 },
    sectionTitle: { color: activeTheme.text, fontSize: 18, fontWeight: "900" },
    bodyText: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    ingredientStack: { gap: 12 },
    ingredientRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    ingredientIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surfaceElevated,
    },
    ingredientName: { flex: 1, color: activeTheme.text, fontSize: 14, fontWeight: "800" },
    ingredientAmount: { color: activeTheme.textMuted, fontSize: 13, fontWeight: "700" },
    watchButton: {
      alignSelf: "center",
      minHeight: 52,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 24,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: activeTheme.primary,
    },
    watchButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  });
