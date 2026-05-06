import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { getCurrentUserRecord, type StoredUser } from "@/lib/app-state";
import { heroFoodImages } from "@/lib/food-visuals";
import { mealCategories, mealItems } from "@/lib/meal-data";
import { subscribeToNotificationsForCurrentUser } from "@/lib/notifications";
import { getProfileCompletion, getProfileCompletionCopy } from "@/lib/profile-completion";
import { getTheme, theme } from "@/theme/theme";

const cookServices = [
  {
    title: "Private dining",
    body: "In-home dinners, family-style setups, and refined hosting requests.",
    icon: "restaurant-outline" as const,
    image: heroFoodImages.chef,
    route: "/complete-profile" as const,
  },
  {
    title: "Meal prep systems",
    body: "Weekly prep, fitness plans, calorie-aware menus, and repeat kitchen routines.",
    icon: "barbell-outline" as const,
    image: heroFoodImages.salad,
    route: "/complete-profile" as const,
  },
  {
    title: "Paid recipe studio",
    body: "Sell premium recipe access with structured methods, ingredients, and plating notes.",
    icon: "book-outline" as const,
    image: heroFoodImages.dessert,
    route: "/recipe-studio" as const,
  },
];

const marketplaceTools = [
  {
    title: "Search ranking",
    body: "Specialties, location, trust signals, and category coverage decide discovery strength.",
    icon: "search-outline" as const,
  },
  {
    title: "Recipe approval",
    body: "New paid recipes can move through review before they become public and searchable.",
    icon: "shield-checkmark-outline" as const,
  },
  {
    title: "Boost placement",
    body: "Promote your strongest services when you want more explorer attention this week.",
    icon: "megaphone-outline" as const,
  },
];

const actionCards = [
  {
    title: "Requests",
    body: "See fresh demand, follow up faster, and keep your response time sharp.",
    icon: "mail-open-outline" as const,
    route: "/requests" as const,
  },
  {
    title: "Profile",
    body: "Tighten your trust, area, specialties, and availability without hunting through settings.",
    icon: "create-outline" as const,
    route: "/complete-profile" as const,
  },
  {
    title: "Recipes",
    body: "Build paid recipe products that can earn even when you are not actively booking.",
    icon: "journal-outline" as const,
    route: "/recipe-studio" as const,
  },
];

export default function CookHomeScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width >= 900;
  const styles = createStyles(activeTheme, isWideWeb);

  const [user, setUser] = useState<StoredUser | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    async function loadUser() {
      const nextUser = await getCurrentUserRecord();

      if (!nextUser) {
        router.replace("/signin");
        return;
      }

      setUser(nextUser);
    }

    void loadUser();
  }, []);

  useEffect(
    () =>
      subscribeToNotificationsForCurrentUser((items) => {
        setUnreadNotifications(items.filter((item) => !item.read).length);
      }),
    [],
  );

  const firstName = useMemo(() => {
    if (!user) {
      return "Chef";
    }

    return (user.name.trim().split(" ")[0] || "Chef").replace(/[^a-zA-Z'-]/g, "") || "Chef";
  }, [user]);

  const completion = user ? getProfileCompletion(user) : null;
  const profileCopy = getProfileCompletionCopy("cook");
  const verificationStatus = user?.cookVerification?.status || "not_started";
  const selectedCategories = user?.availableMealCategories?.length
    ? user.availableMealCategories
    : mealCategories.slice(0, 4);

  const insightCards = useMemo(
    () => [
      {
        label: "Profile trust",
        value: completion ? `${completion.percent}%` : "--",
        tone: "soft" as const,
      },
      {
        label: "Verification",
        value:
          verificationStatus === "verified"
            ? "Verified"
            : verificationStatus === "pending_review"
              ? "Reviewing"
              : "Pending",
        tone: verificationStatus === "verified" ? ("primary" as const) : ("soft" as const),
      },
      {
        label: "Service area",
        value: user?.serviceAreaLabel || user?.city || "Not set",
        tone: "soft" as const,
      },
    ],
    [completion, user, verificationStatus],
  );

  const growthChecklist = useMemo(
    () => [
      {
        title: "Complete trust profile",
        body: "Sharper bios, specialties, safety notes, and area settings convert more explorer visits.",
        done: Boolean(completion && completion.percent >= 100),
      },
      {
        title: "Finish identity review",
        body: "Verified cooks look more reliable before the first message and booking decision.",
        done: verificationStatus === "verified",
      },
      {
        title: "Cover more meal moments",
        body: "Breakfast, lunch, dinner, healthy, and meal prep increase search entry points.",
        done: (user?.availableMealCategories?.length || 0) >= 4,
      },
    ],
    [completion, user, verificationStatus],
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, isWideWeb && styles.contentWide]}
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
    >
      <View style={styles.backgroundAura} />
      <View style={styles.backgroundTile} />

      <View style={[styles.heroStage, !isWideWeb && styles.heroStageMobileFullBleed]}>
        <Image source={heroFoodImages.chef} style={styles.heroImage} contentFit="cover" />
        <View style={styles.heroShade} />
        <View style={styles.heroTopRow}>
          <View style={styles.heroTopCopy}>
            <Text style={styles.eyebrow}>Cook Studio</Text>
            <Text style={styles.heroTitle}>Welcome back, {firstName}.</Text>
            <Text style={styles.heroSubtitle}>
              Run your cook profile like a premium service brand, not just a listing.
            </Text>
          </View>
          <Pressable style={styles.notificationButton} onPress={() => router.push("/notifications" as never)}>
            <Ionicons name="notifications-outline" size={20} color="#171713" />
            {unreadNotifications ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadNotifications}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.heroChipRow}>
          <View style={styles.heroChip}>
            <Ionicons name="sparkles-outline" size={14} color="#FFFFFF" />
            <Text style={styles.heroChipText}>
              {verificationStatus === "verified" ? "High trust profile" : "Trust still building"}
            </Text>
          </View>
          <View style={styles.heroChipMuted}>
            <Ionicons name="location-outline" size={14} color="#FFFFFF" />
            <Text style={styles.heroChipText}>{user?.serviceAreaLabel || user?.city || "Add area"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.insightRail}>
        {insightCards.map((item) => (
          <View
            key={item.label}
            style={[styles.insightCard, item.tone === "primary" && styles.insightCardPrimary]}
          >
            <Text style={[styles.insightLabel, item.tone === "primary" && styles.insightLabelPrimary]}>
              {item.label}
            </Text>
            <Text style={[styles.insightValue, item.tone === "primary" && styles.insightValuePrimary]} numberOfLines={1}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      {completion && completion.percent < 100 ? (
        <Pressable style={styles.completionSpotlight} onPress={() => router.push("/complete-profile")}>
          <Image source={heroFoodImages.platter} style={styles.completionImage} contentFit="cover" />
          <View style={styles.completionShade} />
          <View style={styles.completionContent}>
            <View style={styles.completionHeader}>
              <View style={styles.completionCopy}>
                <Text style={styles.completionEyebrow}>Next move</Text>
                <Text style={styles.completionTitle}>{profileCopy.title}</Text>
                <Text style={styles.completionBody}>{profileCopy.subtitle}</Text>
              </View>
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>{completion.percent}%</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${completion.percent}%` }]} />
            </View>
            <View style={styles.completionFooter}>
              <Text style={styles.completionLink}>{profileCopy.cta}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Command deck</Text>
          <Text style={styles.sectionBody}>The three fastest ways to tighten growth, demand, and revenue.</Text>
        </View>
      </View>
      <View style={styles.commandGrid}>
        {actionCards.map((card) => (
          <Pressable
            key={card.title}
            style={styles.commandCard}
            onPress={() => router.push(card.route as never)}
          >
            <View style={styles.commandIcon}>
              <Ionicons name={card.icon} size={18} color={activeTheme.primaryDark} />
            </View>
            <Text style={styles.commandTitle}>{card.title}</Text>
            <Text style={styles.commandBody}>{card.body}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.discoveryBoard}>
        <View style={styles.discoveryHeader}>
          <View>
            <Text style={styles.discoveryKicker}>Discovery setup</Text>
            <Text style={styles.discoveryTitle}>How explorers will read your offer</Text>
          </View>
          <Pressable style={styles.discoveryButton} onPress={() => router.push("/complete-profile" as never)}>
            <Text style={styles.discoveryButtonText}>Refine</Text>
          </Pressable>
        </View>

        <View style={styles.discoveryAreaRow}>
          <View style={styles.discoveryAreaCard}>
            <Text style={styles.discoveryAreaLabel}>Primary area</Text>
            <Text style={styles.discoveryAreaValue}>{user?.serviceAreaLabel || user?.city || "Set your area"}</Text>
            <Text style={styles.discoveryAreaBody}>
              {user?.serviceRadiusMiles
                ? `${user.serviceRadiusMiles} mile travel radius set`
                : "Add a travel radius to widen useful local matches."}
            </Text>
          </View>
          <View style={styles.discoveryAreaCard}>
            <Text style={styles.discoveryAreaLabel}>Search coverage</Text>
            <Text style={styles.discoveryAreaValue}>{selectedCategories.length} meal moments</Text>
            <Text style={styles.discoveryAreaBody}>Broader category coverage creates more ways to be discovered.</Text>
          </View>
        </View>

        <View style={styles.categoryWrap}>
          {selectedCategories.map((category) => (
            <View key={category} style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{category}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sampleMealRow}>
          {mealItems.slice(0, 4).map((item) => (
            <View key={item.id} style={styles.sampleMealPill}>
              <Text style={styles.sampleMealText}>{item.title}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Sellable formats</Text>
          <Text style={styles.sectionBody}>Build a cook business that does more than wait for one kind of request.</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={styles.serviceRow}
      >
        {cookServices.map((service) => (
          <Pressable
            key={service.title}
            style={styles.serviceCard}
            onPress={() => router.push(service.route as never)}
          >
            <Image source={service.image} style={styles.serviceImage} contentFit="cover" />
            <View style={styles.serviceShade} />
            <View style={styles.serviceBadge}>
              <Ionicons name={service.icon} size={18} color="#FFFFFF" />
            </View>
            <View style={styles.serviceCopy}>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceBody}>{service.body}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.marketplacePanel}>
        <View style={styles.marketplaceHeader}>
          <View>
            <Text style={styles.sectionTitle}>Marketplace engine</Text>
            <Text style={styles.sectionBody}>These levers shape how your profile and recipes perform in the app.</Text>
          </View>
          <Pressable style={styles.marketplaceButton} onPress={() => router.push("/recipe-studio" as never)}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.marketplaceButtonText}>Create</Text>
          </Pressable>
        </View>
        <View style={styles.toolGrid}>
          {marketplaceTools.map((tool) => (
            <View key={tool.title} style={styles.toolCard}>
              <View style={styles.toolIcon}>
                <Ionicons name={tool.icon} size={18} color={activeTheme.primaryDark} />
              </View>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolBody}>{tool.body}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.roadmapCard}>
        <Text style={styles.sectionTitle}>Growth roadmap</Text>
        <Text style={styles.sectionBody}>A tighter sequence for turning profile polish into real bookings.</Text>
        <View style={styles.roadmapList}>
          {growthChecklist.map((item, index) => (
            <View key={item.title} style={styles.roadmapItem}>
              <View style={[styles.roadmapIndex, item.done && styles.roadmapIndexDone]}>
                {item.done ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                  <Text style={styles.roadmapIndexText}>{index + 1}</Text>
                )}
              </View>
              <View style={styles.roadmapCopy}>
                <Text style={styles.roadmapTitle}>{item.title}</Text>
                <Text style={styles.roadmapBody}>{item.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryButton} onPress={() => router.push("/complete-profile" as never)}>
          <Text style={styles.secondaryButtonText}>Edit profile</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/requests" as never)}>
          <Text style={styles.primaryButtonText}>Open requests</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>, isWideWeb: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: activeTheme.bg,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.layout.screenTop,
      paddingBottom: 120,
      gap: theme.spacing.lg,
    },
    contentWide: {
      width: "100%",
      maxWidth: 1180,
      alignSelf: "center",
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      gap: theme.spacing.xl,
    },
    backgroundAura: {
      position: "absolute",
      top: -110,
      left: -30,
      right: -30,
      height: 280,
      borderBottomLeftRadius: 64,
      borderBottomRightRadius: 64,
      backgroundColor: activeTheme.warmSurface,
      transform: [{ rotate: "-4deg" }],
      opacity: activeTheme.bg === "#FFFFFF" ? 0.95 : 0.14,
    },
    backgroundTile: {
      position: "absolute",
      top: 340,
      right: -90,
      width: 220,
      height: 140,
      borderRadius: 40,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.safeSurface,
      transform: [{ rotate: "11deg" }],
      opacity: activeTheme.bg === "#FFFFFF" ? 0.72 : 0.12,
    },
    heroStage: {
      minHeight: isWideWeb ? 420 : 320,
      borderRadius: isWideWeb ? 42 : 36,
      overflow: "hidden",
      padding: isWideWeb ? theme.spacing.xl : theme.spacing.lg,
      justifyContent: "space-between",
      backgroundColor: "#151712",
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 16 },
      elevation: 8,
    },
    heroStageMobileFullBleed: {
      marginHorizontal: -theme.spacing.lg,
      marginTop: -theme.layout.screenTop,
      minHeight: 360,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
      paddingTop: theme.layout.screenTop,
    },
    heroImage: { ...StyleSheet.absoluteFillObject },
    heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.42)" },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16,
    },
    heroTopCopy: {
      flex: 1,
      gap: 8,
      maxWidth: isWideWeb ? 620 : 320,
    },
    eyebrow: {
      color: "#FFE0BD",
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0,
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: isWideWeb ? 52 : 34,
      lineHeight: isWideWeb ? 58 : 40,
      fontWeight: "900",
    },
    heroSubtitle: {
      color: "rgba(255,255,255,0.84)",
      fontSize: 15,
      lineHeight: 23,
      maxWidth: 420,
    },
    notificationButton: {
      width: 46,
      height: 46,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.92)",
    },
    notificationBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.secondaryAccent,
      paddingHorizontal: 5,
    },
    notificationBadgeText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "900",
    },
    heroChipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    heroChip: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 14,
      backgroundColor: "rgba(255,255,255,0.18)",
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    heroChipMuted: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 14,
      backgroundColor: "rgba(0,0,0,0.28)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.16)",
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    heroChipText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },
    insightRail: {
      flexDirection: "row",
      gap: 12,
      marginTop: -52,
      zIndex: 5,
    },
    insightCard: {
      flex: 1,
      minHeight: 98,
      borderRadius: 28,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      justifyContent: "space-between",
      shadowColor: activeTheme.shadow,
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
    },
    insightCardPrimary: {
      backgroundColor: activeTheme.primaryDark,
      borderColor: activeTheme.primaryDark,
    },
    insightLabel: {
      color: activeTheme.textMuted,
      fontSize: 12,
      fontWeight: "800",
    },
    insightLabelPrimary: {
      color: "rgba(255,255,255,0.76)",
    },
    insightValue: {
      color: activeTheme.text,
      fontSize: 18,
      fontWeight: "900",
    },
    insightValuePrimary: {
      color: "#FFFFFF",
    },
    completionSpotlight: {
      minHeight: 220,
      borderRadius: 32,
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
    completionImage: { ...StyleSheet.absoluteFillObject },
    completionShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.52)" },
    completionContent: {
      flex: 1,
      padding: theme.spacing.lg,
      justifyContent: "space-between",
      gap: 16,
    },
    completionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    completionCopy: {
      flex: 1,
      gap: 6,
    },
    completionEyebrow: {
      color: "#FFE0BD",
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    completionTitle: {
      color: "#FFFFFF",
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "900",
    },
    completionBody: {
      color: "rgba(255,255,255,0.84)",
      fontSize: 14,
      lineHeight: 21,
    },
    progressBadge: {
      minWidth: 62,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.16)",
      paddingHorizontal: 12,
      alignSelf: "flex-start",
    },
    progressBadgeText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "900",
    },
    progressTrack: {
      height: 10,
      borderRadius: theme.radius.pill,
      backgroundColor: "rgba(255,255,255,0.22)",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: theme.radius.pill,
      backgroundColor: "#FFFFFF",
    },
    completionFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    completionLink: {
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
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "900",
    },
    sectionBody: {
      color: activeTheme.textMuted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 4,
      maxWidth: isWideWeb ? 560 : undefined,
    },
    commandGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    commandCard: {
      width: isWideWeb ? "31.8%" : "100%",
      minHeight: 152,
      borderRadius: 28,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 10,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 0.45,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
    },
    commandIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.safeSurface,
    },
    commandTitle: {
      color: activeTheme.text,
      fontSize: 18,
      fontWeight: "900",
    },
    commandBody: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "700",
    },
    discoveryBoard: {
      borderRadius: 34,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 0.42,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
    },
    discoveryHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    discoveryKicker: {
      color: activeTheme.primaryDark,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    discoveryTitle: {
      color: activeTheme.text,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "900",
      marginTop: 4,
    },
    discoveryButton: {
      minHeight: 40,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 14,
      backgroundColor: activeTheme.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },
    discoveryButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "900",
    },
    discoveryAreaRow: {
      flexDirection: isWideWeb ? "row" : "column",
      gap: 12,
    },
    discoveryAreaCard: {
      flex: 1,
      borderRadius: 24,
      backgroundColor: activeTheme.surfaceElevated,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      gap: 6,
    },
    discoveryAreaLabel: {
      color: activeTheme.primaryDark,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    discoveryAreaValue: {
      color: activeTheme.text,
      fontSize: 19,
      fontWeight: "900",
    },
    discoveryAreaBody: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
    },
    categoryWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    categoryChip: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: 13,
      paddingVertical: 9,
      backgroundColor: activeTheme.safeSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    categoryChipText: {
      color: activeTheme.text,
      fontSize: 12,
      fontWeight: "900",
    },
    sampleMealRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    sampleMealPill: {
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.warmSurface,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },
    sampleMealText: {
      color: activeTheme.textMuted,
      fontSize: 12,
      fontWeight: "800",
    },
    serviceRow: {
      gap: 14,
      paddingRight: 6,
    },
    serviceCard: {
      width: isWideWeb ? 334 : 280,
      height: isWideWeb ? 270 : 236,
      borderRadius: 34,
      overflow: "hidden",
      padding: theme.spacing.lg,
      justifyContent: "space-between",
      backgroundColor: activeTheme.primaryDark,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    serviceImage: { ...StyleSheet.absoluteFillObject },
    serviceShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.42)" },
    serviceBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },
    serviceCopy: {
      gap: 8,
    },
    serviceTitle: {
      color: "#FFFFFF",
      fontSize: 27,
      lineHeight: 33,
      fontWeight: "900",
    },
    serviceBody: {
      color: "rgba(255,255,255,0.84)",
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "700",
    },
    marketplacePanel: {
      borderRadius: 34,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    marketplaceHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    marketplaceButton: {
      minHeight: 42,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 14,
      backgroundColor: activeTheme.primaryDark,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    marketplaceButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "900",
    },
    toolGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    toolCard: {
      width: isWideWeb ? "31.8%" : "100%",
      minHeight: 138,
      borderRadius: 24,
      backgroundColor: activeTheme.surfaceElevated,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      gap: 8,
    },
    toolIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: activeTheme.safeSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    toolTitle: {
      color: activeTheme.text,
      fontSize: 16,
      fontWeight: "900",
    },
    toolBody: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
    },
    roadmapCard: {
      borderRadius: 34,
      backgroundColor: activeTheme.safeSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    roadmapList: {
      gap: 14,
    },
    roadmapItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    roadmapIndex: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    roadmapIndexDone: {
      backgroundColor: activeTheme.primaryDark,
      borderColor: activeTheme.primaryDark,
    },
    roadmapIndexText: {
      color: activeTheme.text,
      fontSize: 12,
      fontWeight: "900",
    },
    roadmapCopy: {
      flex: 1,
      gap: 4,
    },
    roadmapTitle: {
      color: activeTheme.text,
      fontSize: 16,
      fontWeight: "900",
    },
    roadmapBody: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 56,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
    },
    secondaryButtonText: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "800",
    },
    primaryButton: {
      flex: 1,
      minHeight: 56,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primaryDark,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "900",
    },
  });
