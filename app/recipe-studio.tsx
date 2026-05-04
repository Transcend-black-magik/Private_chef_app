import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from "react-native";

import { heroFoodImages } from "@/lib/food-visuals";
import { getTheme, theme } from "@/theme/theme";

const reviewSteps = [
  { title: "Draft", body: "Add title, photos, price, ingredients, and preview copy." },
  { title: "Review", body: "Recipes are checked before public discovery or paid unlock." },
  { title: "Promote", body: "Boost approved recipes or services when you want more reach." },
];

export default function RecipeStudioScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <View style={styles.hero}>
        <Image source={heroFoodImages.dessert} style={styles.heroImage} contentFit="cover" />
        <View style={styles.heroShade} />
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={19} color={activeTheme.text} />
        </Pressable>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>Recipe studio</Text>
          <Text style={styles.title}>Sell recipes after review.</Text>
          <Text style={styles.subtitle}>
            Publish free previews, charge for full methods, and promote approved recipe packs.
          </Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Create paid recipe</Text>
        <TextInput placeholder="Recipe title" placeholderTextColor={activeTheme.textMuted} style={styles.input} />
        <TextInput placeholder="Short preview for explorers" placeholderTextColor={activeTheme.textMuted} style={[styles.input, styles.textArea]} multiline />
        <View style={styles.inputRow}>
          <TextInput placeholder="Unlock price" placeholderTextColor={activeTheme.textMuted} style={[styles.input, styles.inputHalf]} keyboardType="decimal-pad" />
          <TextInput placeholder="Prep time" placeholderTextColor={activeTheme.textMuted} style={[styles.input, styles.inputHalf]} />
        </View>
        <TextInput placeholder="Tags: jollof, meal prep, high protein..." placeholderTextColor={activeTheme.textMuted} style={styles.input} />
        <Pressable style={styles.primaryButton}>
          <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Submit for review</Text>
        </Pressable>
      </View>

      <View style={styles.stepGrid}>
        {reviewSteps.map((step, index) => (
          <View key={step.title} style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepBody}>{step.body}</Text>
          </View>
        ))}
      </View>

      <View style={styles.promoCard}>
        <View style={styles.promoIcon}>
          <Ionicons name="megaphone-outline" size={20} color={activeTheme.primaryDark} />
        </View>
        <View style={styles.promoCopy}>
          <Text style={styles.promoTitle}>Promotion stays after approval</Text>
          <Text style={styles.promoBody}>
            Paid promotion is only available for reviewed recipes and trusted cook services.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    content: { paddingBottom: 120, gap: theme.spacing.lg },
    hero: {
      minHeight: 330,
      overflow: "hidden",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.layout.screenTop,
      paddingBottom: theme.spacing.lg,
      justifyContent: "space-between",
      backgroundColor: activeTheme.primaryDark,
    },
    heroImage: { ...StyleSheet.absoluteFillObject },
    heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.42)" },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "rgba(255,255,255,0.9)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: { gap: 8 },
    eyebrow: { color: "#FFE0BD", fontSize: 13, fontWeight: "900", textTransform: "uppercase" },
    title: { color: "#FFFFFF", fontSize: 36, lineHeight: 42, fontWeight: "900", maxWidth: 340 },
    subtitle: { color: "rgba(255,255,255,0.84)", fontSize: 15, lineHeight: 23, maxWidth: 360 },
    formCard: {
      marginHorizontal: theme.spacing.lg,
      marginTop: -34,
      borderRadius: 30,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    sectionTitle: { color: activeTheme.text, fontSize: 22, fontWeight: "900" },
    input: {
      minHeight: 52,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.bg,
      color: activeTheme.text,
      paddingHorizontal: theme.spacing.md,
      fontSize: 15,
      fontWeight: "700",
    },
    textArea: { minHeight: 96, paddingTop: 14, textAlignVertical: "top" },
    inputRow: { flexDirection: "row", gap: 10 },
    inputHalf: { flex: 1 },
    primaryButton: {
      minHeight: 54,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
    stepGrid: { marginHorizontal: theme.spacing.lg, gap: 12 },
    stepCard: {
      borderRadius: 24,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      gap: 8,
    },
    stepNumber: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: activeTheme.safeSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    stepNumberText: { color: activeTheme.primaryDark, fontSize: 14, fontWeight: "900" },
    stepTitle: { color: activeTheme.text, fontSize: 17, fontWeight: "900" },
    stepBody: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20, fontWeight: "700" },
    promoCard: {
      marginHorizontal: theme.spacing.lg,
      borderRadius: 26,
      backgroundColor: activeTheme.warmSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      flexDirection: "row",
      gap: 12,
    },
    promoIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: activeTheme.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    promoCopy: { flex: 1, gap: 5 },
    promoTitle: { color: activeTheme.text, fontSize: 17, fontWeight: "900" },
    promoBody: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  });
