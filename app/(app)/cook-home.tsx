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
    title: "Home cooking",
    body: "Private dining, weekly meals, family trays, and in-home cooking requests.",
    icon: "restaurant-outline" as const,
    image: heroFoodImages.jollof,
    route: "/complete-profile" as const,
  },
  {
    title: "Nutrition support",
    body: "Offer meal prep, calorie-aware menus, gym goals, and nutritionist-style plans.",
    icon: "fitness-outline" as const,
    image: heroFoodImages.salad,
    route: "/complete-profile" as const,
  },
  {
    title: "Paid recipes",
    body: "Upload recipes, set a price, and let explorers pay to unlock the full method.",
    icon: "book-outline" as const,
    image: heroFoodImages.dessert,
    route: "/recipe-studio" as const,
  },
];

const marketplaceTools = [
  { title: "Recipe review queue", body: "New public recipes wait for review before they become discoverable.", icon: "shield-checkmark-outline" as const },
  { title: "Promotion boosts", body: "Pay for featured placement when you want more eyes on a service or recipe.", icon: "megaphone-outline" as const },
  { title: "Search signals", body: "Specialties, service area, nutrition notes, and recipe tags shape explorer search.", icon: "search-outline" as const },
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

  const requestStats = useMemo(
    () => [
      { label: "Profile trust", value: completion ? `${completion.percent}%` : "--" },
      {
        label: "Verification",
        value:
          user?.cookVerification?.status === "verified"
            ? "Verified"
            : user?.cookVerification?.status === "pending_review"
              ? "Reviewing"
              : "Pending",
      },
      { label: "Service area", value: user?.serviceAreaLabel || user?.city || "Not set" },
    ],
    [completion, user],
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, isWideWeb && styles.contentWide]}
      showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
    >
      <View style={styles.backgroundBand} />
      <View style={styles.backgroundTile} />

      <View style={[styles.headerPanel, !isWideWeb && styles.headerPanelMobileFullBleed]}>
        <Image source={heroFoodImages.chef} style={styles.headerImage} contentFit="cover" />
        <View style={styles.headerShade} />
        <View style={styles.headerTopRow}>
          <Text style={styles.eyebrow}>Cook Home</Text>
          <Pressable style={styles.notificationButton} onPress={() => router.push("/notifications" as never)}>
            <Ionicons name="notifications-outline" size={20} color="#171713" />
            {unreadNotifications ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadNotifications}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <Text style={styles.title}>Welcome back, {firstName}.</Text>
        <Text style={styles.subtitle}>
          Keep your trust signals, service area, and incoming interest in one calm place.
        </Text>
      </View>

      {completion && completion.percent < 100 ? (
        <Pressable style={styles.completeProfileCard} onPress={() => router.push("/complete-profile")}>
          <Image source={heroFoodImages.platter} style={styles.completeProfileImage} contentFit="cover" />
          <View style={styles.completeProfileShade} />
          <View style={styles.completeProfileContent}>
            <View style={styles.completeProfileHeader}>
              <View style={styles.completeProfileCopy}>
                <Text style={styles.completeProfileEyebrow}>Cook profile</Text>
                <Text style={styles.completeProfileTitle}>{profileCopy.title}</Text>
                <Text style={styles.completeProfileSubtitle}>{profileCopy.subtitle}</Text>
              </View>
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>{completion.percent}%</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${completion.percent}%` }]} />
            </View>
            <View style={styles.completeProfileFooter}>
              <Text style={styles.completeProfileLink}>{profileCopy.cta}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.statsRow}>
        {requestStats.map((item) => (
          <View key={item.label} style={styles.statCard}>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Services you can sell</Text>
          <Text style={styles.sectionBody}>Build the supply side explorers search for: cooks, nutrition support, and paid recipes.</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                bounces={false}
                overScrollMode="never" contentContainerStyle={styles.serviceRow}>
        {cookServices.map((service) => (
          <Pressable
            key={service.title}
            style={styles.serviceCard}
            onPress={() => router.push(service.route as never)}
          >
            <Image source={service.image} style={styles.serviceImage} contentFit="cover" />
            <View style={styles.serviceShade} />
            <View style={styles.serviceIcon}>
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
            <Text style={styles.cardTitle}>Marketplace engine</Text>
            <Text style={styles.cardText}>Everything here feeds discovery, paid recipe access, and promotion.</Text>
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

      <View style={styles.availabilityCard}>
        <View style={styles.availabilityTop}>
          <View>
            <Text style={styles.cardTitle}>
              {user?.cookVerification?.status === "verified"
                ? "Ready for stronger discovery."
                : "Trust signals still need attention."}
            </Text>
            <Text style={styles.cardText}>
              {user?.cookVerification?.status === "verified"
                ? "Explorers can find your service area, cooking specialties, safety details, and nutrition tags."
                : "Finish profile details so explorer search can match you to meals, nutrition needs, and local bookings."}
            </Text>
          </View>
          <View style={styles.availabilityPill}>
            <Text style={styles.availabilityText}>
              {user?.serviceAreaLabel || "Set service area"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.availabilityCard}>
        <Text style={styles.cardTitle}>Immediate meal matching</Text>
        <Text style={styles.cardText}>
          Choose these in profile setup so explorers searching breakfast, lunch, dinner, meal prep, healthy, or dessert can match with you faster.
        </Text>
        <View style={styles.categoryRow}>
          {mealCategories.map((category) => {
            const selected = user?.availableMealCategories?.includes(category);
            return (
              <View key={category} style={[styles.categoryChip, selected && styles.categoryChipActive]}>
                <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>
                  {category}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={styles.suggestionRow}>
          {mealItems.slice(0, 4).map((item) => (
            <View key={item.id} style={styles.suggestionPill}>
              <Text style={styles.suggestionPillText}>{item.title}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryButton} onPress={() => router.push("/complete-profile")}>
          <Text style={styles.secondaryButtonText}>Edit profile</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/requests")}>
          <Text style={styles.primaryButtonText}>View requests</Text>
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
    backgroundBand: {
      position: "absolute",
      top: -70,
      left: -40,
      right: -40,
      height: 230,
      borderBottomLeftRadius: 48,
      borderBottomRightRadius: 48,
      backgroundColor: activeTheme.warmSurface,
      transform: [{ rotate: "-3deg" }],
      opacity: activeTheme.bg === "#FFFFFF" ? 1 : 0.14,
    },
    backgroundTile: {
      position: "absolute",
      top: 128,
      right: -82,
      width: 220,
      height: 130,
      borderRadius: 34,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.safeSurface,
      transform: [{ rotate: "12deg" }],
      opacity: activeTheme.bg === "#FFFFFF" ? 0.72 : 0.12,
    },
    headerPanel: {
      minHeight: isWideWeb ? 420 : 260,
      borderRadius: isWideWeb ? 38 : 34,
      overflow: "hidden",
      padding: isWideWeb ? theme.spacing.xl : theme.spacing.lg,
      justifyContent: "flex-end",
      gap: 8,
      backgroundColor: activeTheme.primaryDark,
    },
    headerPanelMobileFullBleed: {
      marginHorizontal: -theme.spacing.lg,
      marginTop: -theme.layout.screenTop,
      borderRadius: 0,
      minHeight: 330,
      paddingTop: theme.layout.screenTop,
    },
    headerImage: { ...StyleSheet.absoluteFillObject },
    headerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.38)" },
    headerTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "auto",
    },
    notificationButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
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
    eyebrow: {
      color: "#FFE0BD",
      fontSize: 14,
      fontWeight: "900",
    },
    title: {
      color: "#FFFFFF",
      fontSize: isWideWeb ? 52 : 32,
      lineHeight: isWideWeb ? 58 : 38,
      fontWeight: "900",
      maxWidth: isWideWeb ? 620 : 340,
    },
    subtitle: {
      color: "rgba(255,255,255,0.84)",
      fontSize: 16,
      lineHeight: 24,
      maxWidth: 350,
    },
    completeProfileCard: {
      minHeight: 220,
      overflow: "hidden",
      backgroundColor: activeTheme.primaryDark,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: 30,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    completeProfileImage: { ...StyleSheet.absoluteFillObject },
    completeProfileShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    completeProfileContent: {
      flex: 1,
      padding: theme.spacing.lg,
      justifyContent: "space-between",
      gap: 16,
    },
    completeProfileHeader: {
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    completeProfileCopy: {
      flex: 1,
      gap: 6,
    },
    completeProfileEyebrow: {
      color: "#FFE0BD",
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    completeProfileTitle: {
      color: "#FFFFFF",
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "900",
    },
    completeProfileSubtitle: {
      color: "rgba(255,255,255,0.84)",
      fontSize: 14,
      lineHeight: 21,
    },
    progressBadge: {
      minWidth: 62,
      height: 36,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primary,
      alignSelf: "flex-start",
      paddingHorizontal: 12,
    },
    progressBadgeText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
    progressTrack: {
      height: 10,
      borderRadius: theme.radius.pill,
      backgroundColor: "rgba(255,255,255,0.25)",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: theme.radius.pill,
      backgroundColor: "#FFFFFF",
    },
    completeProfileFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    completeProfileLink: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "900",
    },
    statsRow: {
      flexDirection: "row",
      gap: 12,
      maxWidth: isWideWeb ? 760 : undefined,
    },
    statCard: {
      flex: 1,
      minHeight: 96,
      borderRadius: theme.radius.lg,
      backgroundColor: activeTheme.surfaceElevated,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      justifyContent: "space-between",
    },
    statValue: {
      color: activeTheme.text,
      fontSize: 18,
      fontWeight: "800",
    },
    statLabel: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      gap: 12,
    },
    cardTitle: {
      color: activeTheme.text,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "800",
    },
    cardText: {
      color: activeTheme.textMuted,
      fontSize: 15,
      lineHeight: 23,
    },
    serviceRow: {
      gap: 14,
      paddingRight: 6,
    },
    serviceCard: {
      width: isWideWeb ? 320 : 248,
      height: isWideWeb ? 260 : 220,
      borderRadius: 30,
      overflow: "hidden",
      backgroundColor: activeTheme.primaryDark,
      padding: theme.spacing.lg,
      justifyContent: "space-between",
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    serviceImage: { ...StyleSheet.absoluteFillObject },
    serviceShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.42)",
    },
    serviceIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    serviceCopy: { gap: 8 },
    serviceTitle: { color: "#FFFFFF", fontSize: 24, lineHeight: 29, fontWeight: "900" },
    serviceBody: { color: "rgba(255,255,255,0.84)", fontSize: 13, lineHeight: 20, fontWeight: "700" },
    marketplacePanel: {
      borderRadius: 32,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
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
      backgroundColor: activeTheme.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    marketplaceButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
    toolGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    toolCard: {
      width: isWideWeb ? "31%" : "100%",
      minHeight: 132,
      borderRadius: 24,
      backgroundColor: activeTheme.surfaceElevated,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      gap: 8,
    },
    toolIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: activeTheme.safeSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    toolTitle: { color: activeTheme.text, fontSize: 16, fontWeight: "900" },
    toolBody: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 19, fontWeight: "700" },
    availabilityCard: {
      backgroundColor: activeTheme.safeSurface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    availabilityTop: {
      flexDirection: isWideWeb ? "row" : "column",
      justifyContent: "space-between",
      gap: 16,
    },
    availabilityPill: {
      alignSelf: "flex-start",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primary,
    },
    availabilityText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
    categoryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
    },
    categoryChip: {
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surface,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    categoryChipActive: {
      backgroundColor: activeTheme.primaryDark,
      borderColor: activeTheme.primaryDark,
    },
    categoryChipText: {
      color: activeTheme.text,
      fontSize: 12,
      fontWeight: "800",
    },
    categoryChipTextActive: {
      color: "#FFFFFF",
    },
    suggestionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    suggestionPill: {
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surfaceElevated,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },
    suggestionPillText: {
      color: activeTheme.textMuted,
      fontSize: 12,
      fontWeight: "800",
    },
    stack: {
      gap: theme.spacing.md,
    },
    sectionCard: {
      backgroundColor: activeTheme.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      color: activeTheme.text,
      fontSize: 19,
      fontWeight: "800",
    },
    sectionBody: {
      color: activeTheme.textMuted,
      fontSize: 15,
      lineHeight: 23,
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 54,
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
      fontWeight: "700",
    },
    primaryButton: {
      flex: 1,
      minHeight: 54,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primary,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "800",
    },
  });
