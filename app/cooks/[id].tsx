import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";

import LogoLoadingScreen from "@/components/LogoLoadingScreen";
import RoundedAvatar from "@/components/RoundedAvatar";
import { getCookById, type CookDirectoryRecord } from "@/lib/cook-data";
import { toSafeUserErrorMessage } from "@/lib/async-guard";
import { getCookImage } from "@/lib/food-visuals";
import { mealItems, type MealItem } from "@/lib/meal-data";
import { fetchRatingsForTarget, submitCookRating, type RatingRecord } from "@/lib/ratings";
import { isCookSaved, toggleSavedCook } from "@/lib/saved-cooks";
import { getTheme, theme } from "@/theme/theme";

function getCookMeals(cook: CookDirectoryRecord) {
  const categories = cook.user.availableMealCategories || [];
  const searchable = [cook.user.specialtiesText, cook.bio, cook.tags.join(" ")].join(" ").toLowerCase();

  const matched = mealItems.filter(
    (item) =>
      categories.includes(item.category) ||
      searchable.includes(item.category.toLowerCase()) ||
      item.ingredients.some((ingredient) => searchable.includes(ingredient.toLowerCase())) ||
      searchable.includes(item.title.toLowerCase()),
  );

  return (matched.length ? matched : mealItems).slice(0, 8);
}

function availabilityForMeal(item: MealItem, index: number) {
  const windows = ["Today 6:30 PM", "Tomorrow 12:00 PM", "Tomorrow 7:00 PM", "Fri 5:30 PM"];
  if (item.category === "Breakfast") {
    return "Tomorrow 8:30 AM";
  }
  if (item.category === "Lunch") {
    return "Today 12:30 PM";
  }
  return windows[index % windows.length];
}

export default function CookDetailScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const params = useLocalSearchParams<{ id?: string }>();
  const [cook, setCook] = useState<CookDirectoryRecord | null | undefined>(undefined);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingBody, setRatingBody] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  useEffect(() => {
    async function loadCook() {
      const [nextCook, nextSaved, nextRatings] = await Promise.all([
        getCookById(params.id ?? ""),
        params.id ? isCookSaved(params.id) : Promise.resolve(false),
        params.id ? fetchRatingsForTarget("cook", params.id) : Promise.resolve([]),
      ]);

      setCook(nextCook);
      setIsSaved(nextSaved);
      setRatings(nextRatings);
    }

    void loadCook();
  }, [params.id]);

  async function handleSave() {
    if (!cook || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const nextSaved = await toggleSavedCook(cook.id);
      setIsSaved(nextSaved.includes(cook.id));
    } finally {
      setIsSaving(false);
    }
  }

  if (cook === undefined) {
    return <LogoLoadingScreen title="Loading chef profile" subtitle="Bringing in this cook's story, meals, and availability." />;
  }

  async function handleSubmitRating() {
    if (!cook || isSubmittingRating) {
      return;
    }

    setIsSubmittingRating(true);
    setRatingError("");

    try {
      const aggregate = await submitCookRating({
        cookId: cook.id,
        rating: ratingValue,
        body: ratingBody,
      });
      const [nextCook, nextRatings] = await Promise.all([
        getCookById(cook.id),
        fetchRatingsForTarget("cook", cook.id),
      ]);
      setCook(nextCook ? { ...nextCook, ...aggregate } : { ...cook, ...aggregate });
      setRatings(nextRatings);
      setRatingBody("");
    } catch (error) {
      setRatingError(toSafeUserErrorMessage(error instanceof Error ? error.message : "", "We could not save that rating."));
    } finally {
      setIsSubmittingRating(false);
    }
  }

  if (!cook) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyTitle}>Chef profile not found.</Text>
        <Pressable style={styles.orderButton} onPress={() => router.back()}>
          <Text style={styles.orderButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }
  const cookMeals = getCookMeals(cook);
  const ratingAverage = Number(cook.ratingAverage || 0);
  const ratingCount = Number(cook.ratingCount || 0);
  const ratingLabel = ratingCount > 0 ? ratingAverage.toFixed(1) : "New";

  return (
    <View style={styles.screen}>
      <Pressable style={[styles.roundIcon, styles.backButton]} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
      </Pressable>
      <Pressable style={[styles.roundIcon, styles.moreButton]} onPress={() => void handleSave()}>
        <Ionicons name={isSaved ? "heart" : "ellipsis-horizontal"} size={21} color="#FFFFFF" />
      </Pressable>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.hero}>
          <Image source={getCookImage(cook.id.length + cook.name.length)} style={styles.heroImage} contentFit="cover" />
          <View style={styles.heroShade} />
          <Text style={styles.accountTitle}>Account</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <RoundedAvatar
              name={cook.name}
              photoUrl={cook.user.photoUrl}
              size={58}
              backgroundColor={activeTheme.accent}
            />
            <View style={styles.profileCopy}>
              <View style={styles.nameRow}>
                <Text numberOfLines={1} style={styles.name}>{cook.name}</Text>
                {cook.verified ? <Ionicons name="checkmark-circle" size={16} color="#39A7FF" /> : null}
              </View>
              <Text style={styles.roleText}>Professional Chef</Text>
            </View>
            <Pressable
              style={styles.orderButton}
              onPress={() =>
                router.push({
                  pathname: "/booking-request",
                  params: { cookId: cook.id },
                })
              }
            >
              <Text style={styles.orderButtonText}>Order</Text>
            </Pressable>
          </View>

          <Text style={styles.bioText}>
            {cook.bio} <Text style={styles.readMoreText}>Read more</Text>
          </Text>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={15} color="#FFAA26" />
              <Text style={styles.statStrong}>{ratingLabel}</Text>
              <Text style={styles.statMuted}>({ratingCount} reviews)</Text>
            </View>
            <View style={styles.addButton}>
              <Ionicons name="add" size={19} color="#FF9B31" />
            </View>
            <View style={styles.statItem}>
              <Ionicons name="restaurant" size={15} color="#FF9B31" />
              <Text style={styles.statStrong}>{cook.yearsExperience} years</Text>
            </View>
          </View>
        </View>

        <View style={styles.mealsSection}>
          <View style={styles.mealsHeader}>
            <View>
              <Text style={styles.mealsTitle}>Meals by {cook.name.split(" ")[0]}</Text>
              <Text style={styles.mealsSubtitle}>Tap a dish to start checkout with this cook.</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealRow}>
            {cookMeals.map((item, index) => (
              <Pressable
                key={item.id}
                style={styles.mealCard}
                onPress={() =>
                  router.push({
                    pathname: "/meal-item",
                    params: { id: item.id, category: item.category, cookId: cook.id },
                  } as never)
                }
              >
                <Image source={item.image} style={styles.mealImage} contentFit="cover" />
                <Text numberOfLines={1} style={styles.mealName}>{item.title}</Text>
                <Text style={styles.mealTime}>{availabilityForMeal(item, index)}</Text>
                <Text style={styles.mealPrice}>{item.priceHint}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            style={styles.specialOrderCard}
            onPress={() =>
              router.push({
                pathname: "/booking-request",
                params: { cookId: cook.id },
              })
            }
          >
            <View style={styles.specialOrderIcon}>
              <Ionicons name="sparkles-outline" size={18} color={activeTheme.primaryDark} />
            </View>
            <View style={styles.specialOrderCopy}>
              <Text style={styles.specialOrderTitle}>Special order</Text>
              <Text style={styles.specialOrderBody}>Ask for a custom dish, diet plan, party tray, or private service.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={activeTheme.textMuted} />
          </Pressable>
          {cook.user.nutritionServices || cook.user.nutritionCredentials ? (
            <View style={styles.nutritionCard}>
              <View style={styles.specialOrderIcon}>
                <Ionicons name="nutrition-outline" size={18} color={activeTheme.primaryDark} />
              </View>
              <View style={styles.specialOrderCopy}>
                <Text style={styles.specialOrderTitle}>Nutrition support</Text>
                {cook.user.nutritionCredentials ? (
                  <Text style={styles.specialOrderBody}>{cook.user.nutritionCredentials}</Text>
                ) : null}
                {cook.user.nutritionServices ? (
                  <Text style={styles.specialOrderBody}>{cook.user.nutritionServices}</Text>
                ) : null}
                {cook.user.nutritionDisclaimer ? (
                  <Text style={styles.nutritionDisclaimer}>{cook.user.nutritionDisclaimer}</Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.reviewsHeader}>
          <Text style={styles.reviewsTitle}>Reviews</Text>
          <Text style={styles.viewAllText}>{ratingCount ? `${ratingAverage.toFixed(1)} average` : "First impressions"}</Text>
        </View>

        <View style={styles.ratingFormCard}>
          <Text style={styles.ratingFormTitle}>Rate {cook.name.split(" ")[0]}</Text>
          <View style={styles.starPicker}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} onPress={() => setRatingValue(value)}>
                <Ionicons
                  name={value <= ratingValue ? "star" : "star-outline"}
                  size={28}
                  color="#FFAA26"
                />
              </Pressable>
            ))}
          </View>
          <TextInput
            value={ratingBody}
            onChangeText={setRatingBody}
            placeholder="Share what other explorers should know"
            placeholderTextColor={activeTheme.textMuted}
            multiline
            style={styles.ratingInput}
          />
          {ratingError ? <Text style={styles.ratingError}>{ratingError}</Text> : null}
          <Pressable
            style={[styles.ratingSubmitButton, isSubmittingRating && styles.ratingSubmitButtonDisabled]}
            disabled={isSubmittingRating}
            onPress={() => void handleSubmitRating()}
          >
            <Text style={styles.ratingSubmitText}>{isSubmittingRating ? "Saving..." : "Submit rating"}</Text>
          </Pressable>
        </View>

        {ratings.length ? (
          ratings.map((rating) => (
            <View key={rating.id} style={styles.reviewCard}>
              <View style={styles.reviewTop}>
                <RoundedAvatar name={rating.reviewerName} size={48} backgroundColor="#F0B49B" />
                <View style={styles.reviewCopy}>
                  <Text style={styles.reviewName}>{rating.reviewerName}</Text>
                  <Text style={styles.reviewDate}>
                    {rating.createdAt ? new Date(rating.createdAt).toLocaleDateString() : "Recent"}
                  </Text>
                </View>
                <View style={styles.reviewRating}>
                  <Ionicons name="star" size={13} color="#FFAA26" />
                  <Text style={styles.reviewRatingText}>{rating.rating.toFixed(1)}</Text>
                </View>
              </View>
              <Text style={styles.reviewBody}>
                {rating.body || "Rated this cook after a Private Chef experience."}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewBody}>No reviews yet. Book or rate this cook after an experience.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    content: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: theme.spacing.xl,
      width: "100%",
      alignSelf: "center",
    },
    roundIcon: {
      position: "absolute",
      top: theme.layout.screenTop,
      zIndex: 30,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.34)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
    },
    backButton: { left: theme.spacing.lg },
    moreButton: { right: theme.spacing.lg },
    hero: {
      height: 300,
      overflow: "hidden",
      backgroundColor: activeTheme.primaryDark,
      justifyContent: "flex-end",
      padding: theme.spacing.lg,
    },
    heroImage: { ...StyleSheet.absoluteFillObject },
    heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.22)" },
    accountTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
    profileCard: {
      marginHorizontal: theme.spacing.lg,
      marginTop: -22,
      borderRadius: 28,
      backgroundColor: activeTheme.surface,
      padding: theme.spacing.lg,
      gap: 16,
      borderWidth: 1,
      borderColor: activeTheme.border,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    profileTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    profileCopy: { flex: 1, gap: 2 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    name: { flex: 1, color: activeTheme.text, fontSize: 17, fontWeight: "900" },
    roleText: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
    orderButton: {
      minHeight: 44,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFAD5B",
    },
    orderButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
    bioText: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 21 },
    readMoreText: { color: "#FFAD5B", fontWeight: "900" },
    divider: { height: 1, backgroundColor: activeTheme.border },
    statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    statStrong: { color: activeTheme.text, fontSize: 13, fontWeight: "900" },
    statMuted: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#FFBD77",
      backgroundColor: activeTheme.surface,
    },
    reviewsHeader: {
      paddingHorizontal: theme.spacing.lg,
      marginTop: 28,
      marginBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    mealsSection: {
      paddingHorizontal: theme.spacing.lg,
      marginTop: 28,
      gap: 14,
    },
    mealsHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    mealsTitle: { color: activeTheme.text, fontSize: 19, lineHeight: 24, fontWeight: "900" },
    mealsSubtitle: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 19, marginTop: 3 },
    mealRow: { gap: 12, paddingRight: theme.spacing.lg },
    mealCard: {
      width: 158,
      borderRadius: 24,
      backgroundColor: activeTheme.surface,
      padding: 10,
      gap: 7,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    mealImage: { width: "100%", height: 112, borderRadius: 18 },
    mealName: { color: activeTheme.text, fontSize: 14, fontWeight: "900" },
    mealTime: { color: activeTheme.primaryDark, fontSize: 12, fontWeight: "900" },
    mealPrice: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
    specialOrderCard: {
      minHeight: 74,
      borderRadius: 22,
      backgroundColor: activeTheme.safeSurface,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    specialOrderIcon: {
      width: 40,
      height: 40,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
    },
    specialOrderCopy: { flex: 1, gap: 3 },
    specialOrderTitle: { color: activeTheme.text, fontSize: 15, fontWeight: "900" },
    specialOrderBody: { color: activeTheme.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700" },
    nutritionCard: {
      minHeight: 92,
      borderRadius: 22,
      backgroundColor: activeTheme.surface,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    nutritionDisclaimer: { color: activeTheme.textMuted, fontSize: 11, lineHeight: 16, fontWeight: "700", fontStyle: "italic" },
    reviewsTitle: { color: activeTheme.text, fontSize: 19, fontWeight: "900" },
    viewAllText: { color: "#FFAD5B", fontSize: 13, fontWeight: "800" },
    reviewCard: {
      marginHorizontal: theme.spacing.lg,
      borderRadius: 24,
      backgroundColor: activeTheme.surface,
      padding: theme.spacing.lg,
      gap: 14,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    reviewTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    reviewCopy: { flex: 1 },
    reviewName: { color: activeTheme.text, fontSize: 14, fontWeight: "900" },
    reviewDate: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
    reviewRating: {
      minHeight: 32,
      borderRadius: 10,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: activeTheme.warmSurface,
    },
    reviewRatingText: { color: "#FF9B31", fontSize: 13, fontWeight: "900" },
    reviewBody: { color: activeTheme.text, fontSize: 13, lineHeight: 20 },
    ratingFormCard: {
      marginHorizontal: theme.spacing.lg,
      borderRadius: 24,
      backgroundColor: activeTheme.safeSurface,
      padding: theme.spacing.lg,
      gap: 12,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    ratingFormTitle: { color: activeTheme.text, fontSize: 16, fontWeight: "900" },
    starPicker: { flexDirection: "row", gap: 7 },
    ratingInput: {
      minHeight: 92,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surface,
      color: activeTheme.text,
      padding: theme.spacing.md,
      fontSize: 14,
      textAlignVertical: "top",
    },
    ratingError: { color: activeTheme.danger, fontSize: 12, lineHeight: 18, fontWeight: "700" },
    ratingSubmitButton: {
      minHeight: 44,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primaryDark,
    },
    ratingSubmitButtonDisabled: { opacity: 0.55 },
    ratingSubmitText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
    emptyScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      backgroundColor: activeTheme.bg,
      padding: theme.spacing.lg,
    },
    emptyTitle: { color: activeTheme.text, fontSize: 22, fontWeight: "900", textAlign: "center" },
  });
