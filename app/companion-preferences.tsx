import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { router } from "expo-router";

import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { getCurrentUserRecord, saveUserRecord, type StoredUser } from "@/lib/app-state";
import { toSafeUserErrorMessage } from "@/lib/async-guard";
import { getTheme, theme } from "@/theme/theme";

const tasteOptions = ["Spicy", "Comforting", "Fresh", "Smoky", "Light", "Rich"];
const portionOptions = ["Light plate", "Balanced", "Generous", "Meal prep"];
const gymOptions = ["None", "Lean bulk", "Cutting", "Recovery"];
const temperatureOptions = ["Warm meals", "Cold meals", "Both"];

export default function CompanionPreferencesScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [recommendationConsent, setRecommendationConsent] = useState(false);
  const [behaviorInsightsConsent, setBehaviorInsightsConsent] = useState(false);
  const [tasteProfile, setTasteProfile] = useState<string[]>([]);
  const [spicePreference, setSpicePreference] = useState("");
  const [mealTemperaturePreference, setMealTemperaturePreference] = useState("");
  const [gymGoal, setGymGoal] = useState("");
  const [portionPreference, setPortionPreference] = useState("");
  const [wantedIngredients, setWantedIngredients] = useState("");
  const [dislikedIngredients, setDislikedIngredients] = useState("");

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUserRecord();
      if (!currentUser) {
        router.replace("/signin");
        return;
      }

      setUser(currentUser);
      setRecommendationConsent(Boolean(currentUser.recommendationConsent));
      setBehaviorInsightsConsent(Boolean(currentUser.behaviorInsightsConsent));
      setTasteProfile(currentUser.tasteProfile ?? []);
      setSpicePreference(currentUser.spicePreference || "");
      setMealTemperaturePreference(currentUser.mealTemperaturePreference || "");
      setGymGoal(currentUser.gymGoal || "");
      setPortionPreference(currentUser.portionPreference || "");
      setWantedIngredients(currentUser.wantedIngredients || "");
      setDislikedIngredients(currentUser.dislikedIngredients || "");
    }

    void loadUser();
  }, []);

  function toggleTaste(value: string) {
    setTasteProfile((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function handleSave() {
    if (!user) {
      return;
    }

    Keyboard.dismiss();
    setIsSaving(true);
    setError("");

    try {
      const nextUser: StoredUser = {
        ...user,
        recommendationConsent,
        behaviorInsightsConsent,
        tasteProfile,
        spicePreference,
        mealTemperaturePreference,
        gymGoal,
        portionPreference,
        wantedIngredients: wantedIngredients.trim() || undefined,
        dislikedIngredients: dislikedIngredients.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };

      await saveUserRecord(nextUser);
      router.back();
    } catch (nextError) {
      setError(toSafeUserErrorMessage(nextError instanceof Error ? nextError.message : "", "We could not save your companion settings."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>Companion settings</Text>
          <Text style={styles.title}>Help the app feel more like your food companion.</Text>
          <Text style={styles.subtitle}>
            This stays permission-based. We only use the signals you allow so recommendations feel smarter without feeling invasive.
          </Text>
        </View>

        <View style={styles.permissionCard}>
          <Text style={styles.cardTitle}>Permission-led personalization</Text>
          <Pressable
            style={[styles.toggleRow, recommendationConsent && styles.toggleRowActive]}
            onPress={() => setRecommendationConsent((value) => !value)}
          >
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Use my taste and booking preferences</Text>
              <Text style={styles.toggleBody}>We can tune meal ideas from what you save, request, and explicitly tell us.</Text>
            </View>
            <View style={[styles.toggleBadge, recommendationConsent && styles.toggleBadgeActive]}>
              <Text style={styles.toggleBadgeText}>{recommendationConsent ? "On" : "Off"}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.toggleRow, behaviorInsightsConsent && styles.toggleRowActive]}
            onPress={() => setBehaviorInsightsConsent((value) => !value)}
          >
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Use in-app behavior and nearby context</Text>
              <Text style={styles.toggleBody}>We can use city, time of day, searches, and saved cooks to improve suggestions. No hidden tracking outside the app.</Text>
            </View>
            <View style={[styles.toggleBadge, behaviorInsightsConsent && styles.toggleBadgeActive]}>
              <Text style={styles.toggleBadgeText}>{behaviorInsightsConsent ? "On" : "Off"}</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What pulls you in?</Text>
          <View style={styles.chipRow}>
            {tasteOptions.map((option) => (
              <Pressable
                key={option}
                style={[styles.chip, tasteProfile.includes(option) && styles.chipActive]}
                onPress={() => toggleTaste(option)}
              >
                <Text style={[styles.chipText, tasteProfile.includes(option) && styles.chipTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Spice level</Text>
          <View style={styles.inlineRow}>
            {["Mild", "Balanced", "Hot"].map((option) => (
              <Pressable
                key={option}
                style={[styles.optionCard, spicePreference === option && styles.optionCardActive]}
                onPress={() => setSpicePreference(option)}
              >
                <Text style={[styles.optionText, spicePreference === option && styles.optionTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Meal temperature</Text>
          <View style={styles.inlineRow}>
            {temperatureOptions.map((option) => (
              <Pressable
                key={option}
                style={[styles.optionCard, mealTemperaturePreference === option && styles.optionCardActive]}
                onPress={() => setMealTemperaturePreference(option)}
              >
                <Text style={[styles.optionText, mealTemperaturePreference === option && styles.optionTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gym and portion guidance</Text>
          <View style={styles.inlineRow}>
            {gymOptions.map((option) => (
              <Pressable
                key={option}
                style={[styles.optionCard, gymGoal === option && styles.optionCardActive]}
                onPress={() => setGymGoal(option)}
              >
                <Text style={[styles.optionText, gymGoal === option && styles.optionTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inlineRow}>
            {portionOptions.map((option) => (
              <Pressable
                key={option}
                style={[styles.optionCard, portionPreference === option && styles.optionCardActive]}
                onPress={() => setPortionPreference(option)}
              >
                <Text style={[styles.optionText, portionPreference === option && styles.optionTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kitchen guidance</Text>
          <TextInput
            value={wantedIngredients}
            onChangeText={setWantedIngredients}
            placeholder="What do you want more of in your meals?"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.input}
          />
          <TextInput
            value={dislikedIngredients}
            onChangeText={setDislikedIngredients}
            placeholder="What do you never want in your meals?"
            placeholderTextColor={activeTheme.textMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={() => void handleSave()}>
          <Text style={styles.primaryButtonText}>Save companion settings</Text>
        </Pressable>
      </ScrollView>

      {isSaving ? (
        <AuthProcessingScreen
          title="Saving your companion settings"
          subtitle="We're updating the signals that shape your food ideas and safer recommendations."
        />
      ) : null}
    </KeyboardAvoidingView>
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
    backButton: { alignSelf: "flex-start" },
    backText: { color: activeTheme.text, fontSize: 15, fontWeight: "700" },
    headerBlock: { gap: 8 },
    eyebrow: { color: activeTheme.primaryDark, fontSize: 14, fontWeight: "800" },
    title: { color: activeTheme.text, fontSize: 31, lineHeight: 38, fontWeight: "800" },
    subtitle: { color: activeTheme.textMuted, fontSize: 15, lineHeight: 23 },
    permissionCard: {
      backgroundColor: activeTheme.warmSurface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    card: {
      backgroundColor: activeTheme.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    cardTitle: { color: activeTheme.text, fontSize: 20, fontWeight: "800" },
    toggleRow: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      backgroundColor: activeTheme.surface,
    },
    toggleRowActive: { backgroundColor: activeTheme.focusSurface },
    toggleCopy: { flex: 1, gap: 6 },
    toggleTitle: { color: activeTheme.text, fontSize: 15, fontWeight: "800" },
    toggleBody: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20 },
    toggleBadge: {
      minWidth: 48,
      height: 34,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surfaceElevated,
      paddingHorizontal: 10,
      alignSelf: "center",
    },
    toggleBadgeActive: { backgroundColor: activeTheme.primary },
    toggleBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surfaceElevated,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    chipActive: {
      backgroundColor: activeTheme.accentSoft,
      borderColor: activeTheme.accent,
    },
    chipText: { color: activeTheme.text, fontSize: 13, fontWeight: "700" },
    chipTextActive: { color: activeTheme.text },
    fieldLabel: { color: activeTheme.text, fontSize: 14, fontWeight: "800" },
    inlineRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    optionCard: {
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surfaceElevated,
    },
    optionCardActive: { backgroundColor: activeTheme.focusSurface, borderColor: activeTheme.primary },
    optionText: { color: activeTheme.text, fontSize: 13, fontWeight: "700" },
    optionTextActive: { color: activeTheme.primaryDark },
    input: {
      minHeight: 54,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      paddingHorizontal: 14,
      color: activeTheme.text,
      backgroundColor: activeTheme.surfaceElevated,
    },
    textArea: { minHeight: 96, paddingTop: 14, textAlignVertical: "top" },
    errorText: { color: activeTheme.danger, fontSize: 13, lineHeight: 20 },
    primaryButton: {
      minHeight: 56,
      borderRadius: theme.radius.md,
      backgroundColor: activeTheme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  });
