import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";

import RoundedAvatar from "@/components/RoundedAvatar";
import { getCurrentUserRecord } from "@/lib/app-state";
import {
  fetchCookDirectory,
  sortCooks,
  type CookDirectoryRecord,
} from "@/lib/cook-data";
import { getExplorerContext } from "@/lib/explorer-context";
import {
  foodCategories,
  getCookImage,
  heroFoodImages,
} from "@/lib/food-visuals";
import { getProfileCompletion, getProfileCompletionCopy } from "@/lib/profile-completion";
import { recipeRecommendations } from "@/lib/recipe-data";
import { getSavedMealIds, toggleSavedMeal } from "@/lib/saved-items";
import { getSavedCookIds, toggleSavedCook } from "@/lib/saved-cooks";
import { mealItems } from "@/lib/meal-data";
import { getTheme, theme } from "@/theme/theme";

const logoLight = require("../../assets/images/logo_light.png");
const logoDark = require("../../assets/images/logo_dark.png");

const quickActions = [
  { label: "Gym", icon: "barbell-outline" as const, route: "/gym" as const },
  { label: "Taste guide", icon: "sparkles-outline" as const, route: "/meal-match" as const },
  { label: "Recipe", icon: "book-outline" as const, route: "/recipes" as const },
  { label: "Assistant", icon: "color-wand-outline" as const, route: "/cooking-assistant" as const },
];

const moodPrompts = [
  { label: "Dinner tonight", query: "Dinner tonight", icon: "moon-outline" as const },
  { label: "Meal prep", query: "Meal prep", icon: "calendar-clear-outline" as const },
  { label: "Family trays", query: "Family trays", icon: "people-outline" as const },
  { label: "Healthy focus", query: "Healthy", icon: "leaf-outline" as const },
];

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width >= 900;
  const styles = createStyles(activeTheme, isWideWeb);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [directory, setDirectory] = useState<CookDirectoryRecord[]>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(true);
  const [profilePercent, setProfilePercent] = useState(0);
  const [explorerContext, setExplorerContext] = useState(() => getExplorerContext(null));
  const [savedDishIds, setSavedDishIds] = useState<string[]>([]);
  const [savedFeaturedCookIds, setSavedFeaturedCookIds] = useState<string[]>([]);
  const profileCopy = getProfileCompletionCopy("explorer");

  useEffect(() => {
    async function loadExploreContext() {
      const [user, cooks, savedMeals, savedCooks] = await Promise.all([
        getCurrentUserRecord(),
        fetchCookDirectory(),
        getSavedMealIds(),
        getSavedCookIds(),
      ]);

      if (user) {
        setProfilePercent(getProfileCompletion(user).percent);
        setExplorerContext(getExplorerContext(user));
      }

      setSavedDishIds(savedMeals);
      setSavedFeaturedCookIds(savedCooks);
      setDirectory(cooks);
      setIsLoadingDirectory(false);
    }

    void loadExploreContext();
  }, []);

  const popularCooks = useMemo(() => sortCooks(directory, "popular"), [directory]);
  const featuredCook = popularCooks[0] ?? null;
  const featuredCooks = popularCooks.slice(0, 4);
  const quickMatches = popularCooks.slice(0, 5);
  const previewCook = featuredCook ?? {
    id: "preview",
    name: "Amaka's Kitchen",
    headline: "Warm bowls, family trays, and quiet handoff meals around your area.",
    location: explorerContext.cityLabel,
    specialties: ["Jollof", "Meal prep"],
    verified: true,
    profilePercent: 100,
    serviceAreaLabel: explorerContext.cityLabel,
    user: { photoUrl: "" },
  };
  const logoOpacity = scrollY.interpolate({
    inputRange: [220, 285],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  async function handleToggleSavedDish(mealId: string) {
    const nextSaved = await toggleSavedMeal(mealId);
    setSavedDishIds(nextSaved);
  }

  async function handleToggleSavedFeaturedCook(cookId: string) {
    const nextSaved = await toggleSavedCook(cookId);
    setSavedFeaturedCookIds(nextSaved);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundBand} />
      <View style={styles.backgroundTile} />
      {!isWideWeb ? (
        <Animated.View pointerEvents="none" style={[styles.floatingLogo, { opacity: logoOpacity }]}>
          <Image
            source={colorScheme === "dark" ? logoDark : logoLight}
            style={styles.floatingLogoImage}
            contentFit="contain"
          />
        </Animated.View>
      ) : null}
      <Animated.ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.content, isWideWeb && styles.contentWide]}
        showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
      <View style={[styles.heroPanel, !isWideWeb && styles.heroPanelMobileFullBleed]}>
        <View style={styles.heroImageLayer}>
          <Image source={heroFoodImages.explorer} style={styles.heroImage} contentFit="cover" />
        </View>
        <View style={styles.heroShade} />
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroHello}>Hello,</Text>
            <Text style={styles.heroTitle}>What would you like to cook today?</Text>
          </View>
          <Pressable style={styles.iconButton} onPress={() => router.push("/bookmark" as never)}>
            <Ionicons name="bookmark-outline" size={21} color="#171713" />
          </Pressable>
        </View>
        <Pressable style={styles.searchBar} onPress={() => router.push("/search")}>
          <Ionicons name="search" size={18} color={activeTheme.textMuted} />
          <Text style={styles.searchText}>Search cooks, dishes, or your area</Text>
          <Ionicons name="options-outline" size={18} color={activeTheme.textMuted} />
        </Pressable>
      </View>

      <View style={styles.quickActionRow}>
        {quickActions.map((item) => (
          <Pressable
            key={item.label}
            style={styles.quickAction}
            onPress={() => router.push(item.route as never)}
    >
            <Ionicons name={item.icon} size={20} color={activeTheme.primaryDark} />
            <Text style={styles.quickActionText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {profilePercent < 100 ? (
        <Pressable style={styles.progressCard} onPress={() => router.push("/complete-profile")}>
          <Image source={heroFoodImages.assistant} style={styles.progressImage} contentFit="cover" />
          <View style={styles.progressImageShade} />
          <View style={styles.progressContent}>
            <View style={styles.progressTop}>
              <View style={styles.progressCopy}>
                <Text style={styles.progressEyebrow}>Profile setup</Text>
                <Text style={styles.progressTitle}>{profileCopy.title}</Text>
                <Text style={styles.progressBody}>{profileCopy.subtitle}</Text>
              </View>
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>{profilePercent}%</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${profilePercent}%` }]} />
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressLink}>{profileCopy.cta}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.categoryRow}>
        {foodCategories.map((item) => (
          <Pressable
            key={item.label}
            style={styles.categoryPill}
            onPress={() =>
              router.push({ pathname: "/search-results", params: { category: item.label } })
            }
          >
            <Ionicons name={item.icon} size={16} color={activeTheme.primaryDark} />
            <Text style={styles.categoryText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Recommendation</Text>
        </View>
        <Pressable onPress={() => router.push("/recipes" as never)}>
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
      </View>
      <Animated.ScrollView
        horizontal
        style={styles.edgeCarousel}
        showsHorizontalScrollIndicator={false}
                bounces={false}
                overScrollMode="never" contentContainerStyle={styles.recommendationRow}>
        {recipeRecommendations.map((item) => (
          <Pressable
            key={item.id}
            style={styles.recommendationCard}
            onPress={() =>
              router.push({ pathname: "/recipe-detail", params: { id: item.id } } as never)
            }
          >
            <Image source={item.image} style={styles.recommendationImage} contentFit="cover" />
            <View style={styles.recommendationCopy}>
              <Text numberOfLines={1} style={styles.recommendationTitle}>{item.title}</Text>
              <Text style={styles.recommendationMeta}>By {item.author}</Text>
            </View>
          </Pressable>
        ))}
      </Animated.ScrollView>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Dishes of the Week</Text>
          <Text style={styles.sectionSubtitle}>A fast pick when you want a chef match now.</Text>
        </View>
      </View>
      <Animated.ScrollView
        horizontal
        style={styles.edgeCarousel}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={styles.dishWeekRow}
      >
        {mealItems.slice(4, 8).map((meal) => (
          <Pressable
            key={meal.id}
            style={styles.dishWeekCard}
            onPress={() =>
              router.push({ pathname: "/meal-item", params: { id: meal.id, category: meal.category, source: "dish_of_week" } } as never)
            }
          >
            <Image source={meal.image} style={styles.dishWeekImage} contentFit="cover" />
            <View style={styles.dishWeekShade} />
            <Pressable
              style={styles.dishSaveButton}
              onPress={(event) => {
                event.stopPropagation();
                void handleToggleSavedDish(meal.id);
              }}
            >
              <Ionicons
                name={savedDishIds.includes(meal.id) ? "heart" : "heart-outline"}
                size={18}
                color={savedDishIds.includes(meal.id) ? "#FF6B6B" : "#FFFFFF"}
              />
            </Pressable>
            <View style={styles.dishWeekCopy}>
              <Text numberOfLines={2} style={styles.dishWeekTitle}>{meal.title}</Text>
              <Text style={styles.dishWeekMeta}>{meal.kcal} kcal</Text>
              <View style={styles.dishWeekFooter}>
                <View style={styles.dishOrderButton}>
                  <Text style={styles.dishOrderText}>Checkout</Text>
                </View>
                <View style={styles.dishTime}>
                  <Ionicons name="time-outline" size={15} color="rgba(255,255,255,0.76)" />
                  <Text style={styles.dishTimeText}>{meal.minutes} min</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </Animated.ScrollView>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Featured cooks</Text>
          <Text style={styles.sectionSubtitle}>Strong matches from today&apos;s trusted profiles.</Text>
        </View>
      </View>

      <Animated.ScrollView
        horizontal
        style={styles.edgeCarousel}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={styles.featureRow}
      >
        {(featuredCooks.length ? featuredCooks : [previewCook]).map((cook, index) => (
          <Pressable
            key={cook.id}
            style={styles.featureCard}
            onPress={() =>
              cook.id === "preview"
                ? router.push("/search")
                : router.push({ pathname: "/cooks/[id]", params: { id: cook.id } })
            }
          >
            <Image source={getCookImage(index + cook.name.length)} style={styles.featureImage} contentFit="cover" />
            <View style={styles.featureShade} />
            <View style={styles.featureTop}>
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={14} color="#FFCA45" />
                <Text style={styles.ratingText}>4.{9 - (index % 3)}</Text>
              </View>
              <Pressable
                style={styles.heartButton}
                onPress={(event) => {
                  event.stopPropagation();
                  if (cook.id !== "preview") {
                    void handleToggleSavedFeaturedCook(cook.id);
                  }
                }}
              >
                <Ionicons
                  name={savedFeaturedCookIds.includes(cook.id) ? "heart" : "heart-outline"}
                  size={19}
                  color={savedFeaturedCookIds.includes(cook.id) ? "#FF6B6B" : "#FFFFFF"}
                />
              </Pressable>
            </View>
            <View style={styles.featureBottom}>
              <Text style={styles.featureEyebrow}>{index === 0 ? "Tonight's strong match" : "Trusted profile"}</Text>
              <Text numberOfLines={1} style={styles.featureTitle}>{cook.name}</Text>
              <Text numberOfLines={2} style={styles.featureBody}>{cook.headline}</Text>
              <View style={styles.featureMetaRow}>
                <View style={styles.featureMeta}>
                  <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                  <Text style={styles.featureMetaText}>
                    {cook.verified ? "Verified" : "Reviewing"}
                  </Text>
                </View>
                <View style={styles.featureMeta}>
                  <Ionicons name="location" size={14} color="#FFFFFF" />
                  <Text numberOfLines={1} style={styles.featureMetaText}>{cook.location}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </Animated.ScrollView>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>What feels right today?</Text>
          <Text style={styles.sectionSubtitle}>Choose a mood and we will narrow the cook list.</Text>
        </View>
      </View>
      <View style={styles.moodGrid}>
        {moodPrompts.map((prompt) => (
          <Pressable
            key={prompt.label}
            style={styles.moodCard}
            onPress={() =>
              router.push({ pathname: "/search-results", params: { query: prompt.query } })
            }
          >
            <View style={styles.moodIcon}>
              <Ionicons name={prompt.icon} size={18} color={activeTheme.primaryDark} />
            </View>
            <Text style={styles.moodText}>{prompt.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Popular cooks</Text>
          <Text style={styles.sectionSubtitle}>
            {isLoadingDirectory
              ? "Loading trusted cooks..."
              : `Trusted profiles around ${explorerContext.cityLabel}.`}
          </Text>
        </View>
        <Pressable onPress={() => router.push({ pathname: "/all-cooks", params: { sort: "popular" } })}>
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
      </View>

      <Animated.ScrollView
        horizontal
        style={styles.edgeCarousel}
        showsHorizontalScrollIndicator={false}
                bounces={false}
                overScrollMode="never" contentContainerStyle={styles.cookRow}>
        {(quickMatches.length ? quickMatches : [previewCook]).map((cook, index) => (
          <Pressable
            key={cook.id}
            style={styles.cookCard}
            onPress={() =>
              cook.id === "preview"
                ? router.push("/search")
                : router.push({ pathname: "/cooks/[id]", params: { id: cook.id } })
            }
          >
            <Image source={getCookImage(index)} style={styles.cookImage} contentFit="cover" />
            <View style={styles.cookTopLine}>
              <RoundedAvatar
                name={cook.name}
                photoUrl={cook.user.photoUrl}
                size={42}
                backgroundColor={activeTheme.accent}
              />
              <View style={styles.smallRating}>
                <Ionicons name="star" size={12} color="#FFCA45" />
                <Text style={styles.smallRatingText}>4.{9 - (index % 3)}</Text>
              </View>
            </View>
            <Text numberOfLines={1} style={styles.cookName}>{cook.name}</Text>
            <Text numberOfLines={1} style={styles.cookMeta}>{cook.specialties[0] || "Home cooking"}</Text>
            <View style={styles.cookFooter}>
              <Text style={styles.cookLocation}>{cook.serviceAreaLabel || cook.location}</Text>
              <Pressable
                style={styles.bookButton}
                onPress={() =>
                  cook.id === "preview"
                    ? router.push("/search")
                    : router.push({ pathname: "/booking-request", params: { cookId: cook.id } })
                }
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </Pressable>
        ))}
      </Animated.ScrollView>

      <View style={styles.companionCard}>
        <View style={styles.assistantHeroImageWrap}>
          <Image source={heroFoodImages.salad} style={styles.assistantHeroImage} contentFit="cover" />
        </View>
        <View style={styles.companionCopy}>
          <Text style={styles.companionTitle}>Your Personal Food AI Assistant</Text>
          <Text style={styles.companionBody}>
            I can suggest recipes, track calories, plan meals, and provide personalized nutrition advice daily.
          </Text>
          <Pressable style={styles.companionButton} onPress={() => router.push("/cooking-assistant" as never)}>
            <Ionicons name="sparkles" size={15} color="#FFFFFF" />
            <Text style={styles.companionButtonText}>Your Assistant</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.kitchenCard} onPress={() => router.push("/my-kitchen" as never)}>
        <View style={styles.kitchenHeader}>
          <View>
            <Text style={styles.kitchenEyebrow}>My Kitchen</Text>
            <Text style={styles.kitchenTitle}>Smart kitchen control</Text>
          </View>
          <View style={styles.kitchenIconButton}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.kitchenDevice}>
          <View>
            <Text style={styles.kitchenDeviceName}>Viking Oven</Text>
            <Text style={styles.kitchenStatus}>Pre heating</Text>
          </View>
          <Ionicons name="ellipsis-horizontal" size={18} color={activeTheme.textMuted} />
        </View>
        <View style={styles.kitchenMetricRow}>
          <View style={styles.kitchenMetric}>
            <Text style={styles.kitchenMetricLabel}>Remaining time</Text>
            <Text style={styles.kitchenMetricValue}>08:12</Text>
          </View>
          <View style={styles.kitchenMetric}>
            <Text style={styles.kitchenMetricLabel}>Temp.</Text>
            <Text style={styles.kitchenMetricValue}>180°C</Text>
          </View>
        </View>
      </Pressable>


      {/* <View style={styles.tastePanel}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Browse by taste</Text>
            <Text style={styles.sectionSubtitle}>Start from a craving.</Text>
          </View>
        </View>
        <View style={styles.tasteRow}>
          {tasteIdeas.map((chip) => (
            <Pressable
              key={chip}
              style={styles.tasteChip}
              onPress={() =>
                router.push({ pathname: "/search-results", params: { query: chip } })
              }
            >
              <Text style={styles.tasteChipText}>{chip}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.trustRow}>
        <MetricCard label="Verified cooks" value={verifiedCooks.length} />
        <MetricCard label="Complete profiles" value={completeProfileCooks.length} />
      </View> */}
      </Animated.ScrollView>
    </View>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>, isWideWeb: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: activeTheme.bg,
    },
    scrollArea: {
      flex: 1,
    },
    backgroundBand: {
      position: "absolute",
      top: 280,
      left: -40,
      right: -40,
      height: 220,
      borderRadius: 48,
      backgroundColor: activeTheme.warmSurface,
      transform: [{ rotate: "-3deg" }],
      opacity: activeTheme.bg === "#FFFFFF" ? 0.8 : 0.1,
    },
    backgroundTile: {
      position: "absolute",
      top: 520,
      right: -76,
      width: 210,
      height: 124,
      borderRadius: 34,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.safeSurface,
      transform: [{ rotate: "12deg" }],
      opacity: activeTheme.bg === "#FFFFFF" ? 0.68 : 0.1,
    },
    floatingLogo: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: theme.layout.screenTop + 88,
      zIndex: 20,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 6,
    },
    floatingLogoImage: {
      width: 132,
      height: 132,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: isWideWeb ? theme.spacing.lg : 0,
      paddingBottom: 120,
      gap: theme.spacing.lg,
    },
    contentWide: {
      width: "100%",
      maxWidth: 1180,
      alignSelf: "center",
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xxl,
      gap: theme.spacing.xl,
    },
    heroPanel: {
      minHeight: isWideWeb ? 420 : 252,
      borderRadius: isWideWeb ? 38 : 34,
      overflow: "hidden",
      padding: isWideWeb ? theme.spacing.xl : theme.spacing.lg,
      justifyContent: "space-between",
      backgroundColor: "#14160F",
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 16 },
      elevation: 8,
    },
    heroPanelMobileFullBleed: {
      marginHorizontal: -theme.spacing.lg,
      marginTop: 0,
      marginBottom: 4,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: 34,
      borderBottomRightRadius: 34,
      minHeight: 330,
      paddingTop: theme.layout.screenTop,
    },
    heroImageLayer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#14160F",
      overflow: "hidden",
    },
    heroImage: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
      transform: [{ scale: 1.04 }],
    },
    heroShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.18)",
    },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 14,
    },
    heroHello: {
      color: "#FFF7E8",
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 6,
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: isWideWeb ? 52 : 31,
      lineHeight: isWideWeb ? 58 : 37,
      fontWeight: "900",
      maxWidth: isWideWeb ? 580 : 280,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.92)",
    },
    searchBar: {
      minHeight: 54,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surface,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      maxWidth: isWideWeb ? 560 : undefined,
    },
    searchText: {
      flex: 1,
      color: activeTheme.textMuted,
      fontSize: 14,
      fontWeight: "600",
    },
    quickActionRow: {
      flexDirection: "row",
      gap: 10,
      maxWidth: isWideWeb ? 680 : undefined,
    },
    quickAction: {
      flex: 1,
      minHeight: 76,
      borderRadius: 22,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    quickActionText: {
      color: activeTheme.text,
      fontSize: 11,
      fontWeight: "800",
      textAlign: "center",
    },
    progressCard: {
      minHeight: 210,
      borderRadius: 30,
      overflow: "hidden",
      backgroundColor: activeTheme.primaryDark,
      borderWidth: 1,
      borderColor: activeTheme.border,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    progressImage: { ...StyleSheet.absoluteFillObject },
    progressImageShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.48)",
    },
    progressContent: {
      flex: 1,
      padding: theme.spacing.lg,
      justifyContent: "space-between",
      gap: 16,
    },
    progressTop: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
    progressCopy: { flex: 1, gap: 5 },
    progressEyebrow: {
      color: "#FFE0BD",
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    progressTitle: { color: "#FFFFFF", fontSize: 22, lineHeight: 28, fontWeight: "900" },
    progressBody: { color: "rgba(255,255,255,0.84)", fontSize: 13, lineHeight: 20 },
    progressBadge: {
      minWidth: 58,
      height: 38,
      borderRadius: theme.radius.pill,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    progressBadgeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
    progressTrack: {
      height: 9,
      borderRadius: theme.radius.pill,
      backgroundColor: "rgba(255,255,255,0.25)",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: theme.radius.pill,
      backgroundColor: "#FFFFFF",
    },
    progressFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    progressLink: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "900",
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      gap: 12,
    },
    sectionTitle: {
      color: activeTheme.text,
      fontSize: 22,
      lineHeight: 27,
      fontWeight: "900",
    },
    sectionSubtitle: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 3,
    },
    seeAllText: { color: activeTheme.primaryDark, fontSize: 13, fontWeight: "900" },
    inspirationRow: { gap: 12, paddingRight: 6 },
    inspirationCard: {
      width: isWideWeb ? 210 : 132,
      height: isWideWeb ? 132 : 92,
      borderRadius: 22,
      overflow: "hidden",
      padding: 12,
      justifyContent: "flex-end",
      backgroundColor: activeTheme.surfaceElevated,
    },
    inspirationImage: { ...StyleSheet.absoluteFillObject },
    cardShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.34)" },
    inspirationTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
    inspirationSubtitle: { color: "rgba(255,255,255,0.82)", fontSize: 11, fontWeight: "700" },
    categoryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      maxWidth: isWideWeb ? 760 : undefined,
    },
    categoryPill: {
      minHeight: 40,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    categoryText: { color: activeTheme.text, fontSize: 13, fontWeight: "800" },
    featureCard: {
      width: isWideWeb ? 360 : 284,
      height: isWideWeb ? 460 : 360,
      borderRadius: 34,
      overflow: "hidden",
      backgroundColor: activeTheme.primaryDark,
      padding: theme.spacing.lg,
      justifyContent: "space-between",
    },
    featureRow: { gap: 14, paddingHorizontal: theme.spacing.lg },
    featureImage: { ...StyleSheet.absoluteFillObject },
    featureShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.42)" },
    featureTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    ratingPill: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(0,0,0,0.42)",
    },
    ratingText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
    heartButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "rgba(0,0,0,0.32)",
      alignItems: "center",
      justifyContent: "center",
    },
    featureBottom: { gap: 8 },
    featureEyebrow: {
      color: "#FFE0BD",
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    featureTitle: {
      color: "#FFFFFF",
      fontSize: 30,
      lineHeight: 35,
      fontWeight: "900",
    },
    featureBody: { color: "rgba(255,255,255,0.86)", fontSize: 14, lineHeight: 21 },
    featureMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    featureMeta: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(255,255,255,0.16)",
    },
    featureMetaText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    recommendationRow: {
      gap: 12,
      paddingHorizontal: theme.spacing.lg,
    },
    edgeCarousel: {
      marginHorizontal: isWideWeb ? 0 : -theme.spacing.lg,
    },
    recommendationCard: {
      width: isWideWeb ? 210 : 138,
      borderRadius: 18,
      backgroundColor: activeTheme.surface,
      padding: 8,
      gap: 8,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    recommendationImage: {
      width: "100%",
      height: isWideWeb ? 150 : 106,
      borderRadius: 14,
    },
    recommendationShade: { display: "none" },
    recommendationRating: { display: "none" },
    recommendationRatingText: { display: "none" },
    recommendationCopy: { gap: 2 },
    recommendationTitle: { color: activeTheme.text, fontSize: 13, fontWeight: "900" },
    recommendationMeta: { color: activeTheme.textMuted, fontSize: 11, fontWeight: "700" },
    weekRecipeCard: {
      height: isWideWeb ? 260 : 170,
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    weekRecipeImage: {
      width: "100%",
      height: "100%",
    },
    weekAddButton: {
      position: "absolute",
      bottom: -2,
      alignSelf: "center",
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: activeTheme.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 6,
      borderColor: activeTheme.bg,
    },
    moodGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    moodCard: {
      width: "48%",
      minHeight: 92,
      borderRadius: 24,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      justifyContent: "space-between",
    },
    moodIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: activeTheme.safeSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    moodText: { color: activeTheme.text, fontSize: 15, fontWeight: "900" },
    dishWeekCard: {
      width: isWideWeb ? 300 : 244,
      height: isWideWeb ? 250 : 210,
      borderRadius: 30,
      overflow: "hidden",
      backgroundColor: "#20201D",
      padding: theme.spacing.lg,
      justifyContent: "flex-end",
    },
    dishWeekRow: { gap: 14, paddingHorizontal: theme.spacing.lg },
    dishSaveButton: {
      position: "absolute",
      top: 14,
      right: 14,
      zIndex: 4,
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.34)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },
    dishWeekCopy: {
      gap: 8,
      zIndex: 1,
    },
    dishWeekTitle: {
      color: "#FFFFFF",
      fontSize: 23,
      lineHeight: 28,
      fontWeight: "900",
    },
    dishWeekMeta: {
      color: "rgba(255,255,255,0.62)",
      fontSize: 13,
      fontWeight: "700",
    },
    dishWeekLabel: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
      marginTop: 4,
    },
    dishIngredientRow: {
      flexDirection: "row",
      gap: 8,
    },
    dishIngredientIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.12)",
    },
    dishWeekFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 6,
    },
    dishOrderButton: {
      minHeight: 44,
      borderRadius: theme.radius.pill,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
    },
    dishOrderText: {
      color: "#20201D",
      fontSize: 13,
      fontWeight: "900",
    },
    dishTime: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    dishTimeText: {
      color: "rgba(255,255,255,0.62)",
      fontSize: 12,
      fontWeight: "800",
    },
    dishWeekImage: {
      ...StyleSheet.absoluteFillObject,
    },
    dishWeekShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.42)",
    },
    cookRow: { gap: 14, paddingHorizontal: theme.spacing.lg },
    cookCard: {
      width: isWideWeb ? 260 : 214,
      borderRadius: 30,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: 12,
      gap: 10,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    cookImage: { height: isWideWeb ? 168 : 132, borderRadius: 24 },
    cookTopLine: {
      position: "absolute",
      top: 22,
      left: 22,
      right: 22,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    smallRating: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 6,
      backgroundColor: "rgba(0,0,0,0.46)",
      flexDirection: "row",
      gap: 4,
      alignItems: "center",
    },
    smallRatingText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
    cookName: { color: activeTheme.text, fontSize: 18, fontWeight: "900" },
    cookMeta: { color: activeTheme.textMuted, fontSize: 13, fontWeight: "700" },
    cookFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    cookLocation: {
      flex: 1,
      color: activeTheme.primaryDark,
      fontSize: 12,
      fontWeight: "800",
    },
    bookButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: activeTheme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    companionCard: {
      minHeight: isWideWeb ? 360 : 440,
      borderRadius: 34,
      overflow: "hidden",
      backgroundColor: activeTheme.safeSurface,
      padding: theme.spacing.lg,
      justifyContent: "space-between",
    },
    companionImage: { display: "none" },
    assistantHeroImageWrap: {
      alignSelf: "center",
      width: isWideWeb ? 250 : 220,
      height: isWideWeb ? 250 : 220,
      borderRadius: 125,
      overflow: "hidden",
      backgroundColor: activeTheme.surface,
      borderWidth: 10,
      borderColor: "rgba(255,255,255,0.52)",
    },
    assistantHeroImage: {
      width: "100%",
      height: "100%",
    },
    companionCopy: {
      gap: 10,
    },
    companionEyebrow: { display: "none" },
    companionTitle: { color: activeTheme.text, fontSize: 27, lineHeight: 34, fontWeight: "900" },
    companionBody: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    companionButton: {
      minHeight: 52,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 18,
      backgroundColor: activeTheme.primaryDark,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    companionButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
    kitchenCard: {
      borderRadius: 30,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 14,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    kitchenHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    kitchenEyebrow: {
      color: activeTheme.primaryDark,
      fontSize: 13,
      fontWeight: "900",
    },
    kitchenTitle: {
      color: activeTheme.text,
      fontSize: 23,
      lineHeight: 28,
      fontWeight: "900",
      marginTop: 4,
    },
    kitchenIconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: activeTheme.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },
    kitchenDevice: {
      minHeight: 82,
      borderRadius: 24,
      backgroundColor: activeTheme.surfaceElevated,
      padding: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    kitchenDeviceName: { color: activeTheme.text, fontSize: 16, fontWeight: "900" },
    kitchenStatus: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
      backgroundColor: activeTheme.accent,
      alignSelf: "flex-start",
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: theme.radius.pill,
      marginTop: 6,
    },
    kitchenMetricRow: { flexDirection: "row", gap: 10 },
    kitchenMetric: {
      flex: 1,
      minHeight: 92,
      borderRadius: 22,
      backgroundColor: activeTheme.surfaceElevated,
      padding: theme.spacing.md,
      justifyContent: "space-between",
    },
    kitchenMetricLabel: { color: activeTheme.textMuted, fontSize: 12, lineHeight: 16, fontWeight: "700" },
    kitchenMetricValue: { color: activeTheme.text, fontSize: 24, fontWeight: "800" },
    tastePanel: {
      borderRadius: 28,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 14,
    },
    tasteRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    tasteChip: {
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surfaceElevated,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    tasteChipText: { color: activeTheme.text, fontSize: 13, fontWeight: "800" },
    trustRow: { flexDirection: "row", gap: 12 },
    metricCard: {
      flex: 1,
      borderRadius: 24,
      backgroundColor: activeTheme.warmSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 4,
    },
    metricValue: { color: activeTheme.text, fontSize: 30, fontWeight: "900" },
    metricLabel: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  });
