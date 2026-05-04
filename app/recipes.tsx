import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";

import { getCookImage, heroFoodImages } from "@/lib/food-visuals";
import { getTheme, theme } from "@/theme/theme";

const recipes = [
  { title: "Aegean Breeze Salad", meta: "20 minutes", image: heroFoodImages.salad },
  { title: "Italian Hot Pizza", meta: "25 minutes", image: heroFoodImages.pizza },
  { title: "Comfort Pasta", meta: "30 minutes", image: heroFoodImages.pasta },
  { title: "Family Rice Bowl", meta: "35 minutes", image: heroFoodImages.jollof },
];

export default function RecipesScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <Text style={styles.title}>Explore New Recipes</Text>
      <View style={styles.chipRow}>
        {["Salad", "Pizza", "Burger", "Steak", "Seafood"].map((item, index) => (
          <Pressable key={item} style={styles.chip} onPress={() => router.push({ pathname: "/search-results", params: { query: item } })}>
            <Image source={getCookImage(index)} style={styles.chipImage} contentFit="cover" />
            <Text style={styles.chipText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.recipeGrid}>
        {recipes.map((recipe) => (
          <Pressable key={recipe.title} style={styles.recipeCard} onPress={() => router.push({ pathname: "/search-results", params: { query: recipe.title } })}>
            <Image source={recipe.image} style={styles.recipeImage} contentFit="cover" />
            <View style={styles.recipeShade} />
            <View style={styles.recipeHeart}>
              <Ionicons name="heart" size={15} color={activeTheme.text} />
            </View>
            <Text style={styles.recipeTitle}>{recipe.title}</Text>
            <Text style={styles.recipeMeta}>{recipe.meta}</Text>
          </Pressable>
        ))}
      </View>
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
  });
