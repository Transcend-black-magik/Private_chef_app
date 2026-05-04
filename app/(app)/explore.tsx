import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";

import { getCurrentUserRecord } from "@/lib/app-state";
import {
  cuisineChips,
  fetchCookDirectory,
  sortCooks,
  type CookDirectoryRecord,
} from "@/lib/cook-data";
import { getExplorerContext } from "@/lib/explorer-context";
import { getProfileCompletion, getProfileCompletionCopy } from "@/lib/profile-completion";
import { getTheme, theme } from "@/theme/theme";

const moodPrompts = [
  { label: "Dinner tonight", query: "Dinner tonight", icon: "moon-outline" as const },
  { label: "Meal prep", query: "Meal prep", icon: "calendar-clear-outline" as const },
  { label: "Family visit", query: "Family trays", icon: "people-outline" as const },
  { label: "Quiet handoff", query: "Cook at my home", icon: "key-outline" as const },
];

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);

  const [firstName, setFirstName] = useState("Friend");
  const [directory, setDirectory] = useState<CookDirectoryRecord[]>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(true);
  const [profilePercent, setProfilePercent] = useState(0);
  const [explorerContext, setExplorerContext] = useState(() => getExplorerContext(null));

  useEffect(() => {
    async function loadExploreContext() {
      const [user, cooks] = await Promise.all([getCurrentUserRecord(), fetchCookDirectory()]);

      if (user) {
        const name = (user.name.trim().split(" ")[0] || "Friend").replace(/[^a-zA-Z'-]/g, "");
        setFirstName(name || "Friend");
        setProfilePercent(getProfileCompletion(user).percent);
        setExplorerContext(getExplorerContext(user));
      }

      setDirectory(cooks);
      setIsLoadingDirectory(false);
    }

    void loadExploreContext();
  }, []);

  const profileCopy = getProfileCompletionCopy("explorer");
  const popularCooks = useMemo(() => sortCooks(directory, "popular"), [directory]);
  const verifiedCooks = useMemo(
    () => sortCooks(directory.filter((cook) => cook.verified), "verified"),
    [directory],
  );
  const completeProfileCooks = useMemo(
    () => sortCooks(directory.filter((cook) => cook.profilePercent >= 100), "complete"),
    [directory],
  );
  const featuredCook = popularCooks[0] ?? null;
  const quickMatches = popularCooks.slice(1, 5);
  const trustedLane = verifiedCooks.slice(0, 6);
  const polishedLane = completeProfileCooks.slice(0, 6);
  const tasteIdeas = cuisineChips.filter((chip) => chip !== "All").slice(0, 5);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topGlow} />
      <View style={styles.sideGlow} />

      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>Explorer home</Text>
        <Text style={styles.title}>Find the right cook for today, {firstName}.</Text>
        <Text style={styles.subtitle}>
          Trusted cooks around {explorerContext.cityLabel}, ready when you need them.
        </Text>
      </View>

      {profilePercent < 100 ? (
        <Pressable style={styles.completeProfileCard} onPress={() => router.push("/complete-profile")}>
          <View style={styles.completeProfileTop}>
            <View style={styles.completeProfileCopy}>
              <Text style={styles.completeProfileTitle}>{profileCopy.title}</Text>
              <Text style={styles.completeProfileSubtitle}>{profileCopy.subtitle}</Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>{profilePercent}%</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${profilePercent}%` }]} />
          </View>
        </Pressable>
      ) : null}

      <Pressable style={styles.searchHero} onPress={() => router.push("/search")}>
        <View style={styles.searchHeroTop}>
          <View style={styles.searchHeroIcon}>
            <Ionicons name="search" size={20} color={activeTheme.text} />
          </View>
          <View style={styles.searchHeroCopy}>
            <Text style={styles.searchHeroTitle}>Search cooks, dishes, or your area</Text>
            <Text style={styles.searchHeroText}>
              Search around {explorerContext.cityLabel} for dinner tonight, meal prep this week, or someone who can work quietly in your home.
            </Text>
          </View>
        </View>
        <View style={styles.searchHeroFooter}>
          <Text style={styles.searchHeroLink}>Start search</Text>
          <Ionicons name="arrow-forward" size={18} color={activeTheme.text} />
        </View>
      </Pressable>

      <View style={styles.companionRow}>
        <Pressable style={styles.decisionCard} onPress={() => router.push("/meal-match")}>
          <Text style={styles.companionEyebrow}>Decision help</Text>
          <Text style={styles.decisionTitle}>Not sure what to eat?</Text>
          <Text style={styles.decisionBody}>
            Tell us your mood, spice level, and gym focus. We&apos;ll shape the right cook search for you.
          </Text>
        </Pressable>

        <Pressable style={styles.preferenceCard} onPress={() => router.push("/companion-preferences")}>
          <Text style={styles.companionEyebrow}>Companion settings</Text>
          <Text style={styles.decisionTitle}>Keep recommendations personal</Text>
          <Text style={styles.decisionBody}>
            Give permission for smarter city-aware suggestions without stepping outside your comfort line.
          </Text>
        </Pressable>
      </View>

      <View style={styles.moodCard}>
        <Text style={styles.sectionTitle}>What feels right today?</Text>
        <Text style={styles.sectionBody}>
          {explorerContext.foodMoment} Pick a starting point and we will shape the cook list around that intent.
        </Text>
        <View style={styles.moodGrid}>
          {moodPrompts.map((prompt) => (
            <Pressable
              key={prompt.label}
              style={styles.moodButton}
              onPress={() =>
                router.push({
                  pathname: "/search-results",
                  params: { query: prompt.query },
                })
              }
            >
              <Ionicons name={prompt.icon} size={18} color={activeTheme.primaryDark} />
              <Text style={styles.moodButtonText}>{prompt.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {featuredCook ? (
        <Pressable
          style={styles.featureCard}
          onPress={() => router.push({ pathname: "/cooks/[id]", params: { id: featuredCook.id } })}
        >
          <View style={styles.featureAccent} />
          <View style={styles.featureHeader}>
            <View style={styles.featureCopy}>
              <Text style={styles.featureEyebrow}>Tonight&apos;s strong match</Text>
              <Text style={styles.featureTitle}>{featuredCook.name}</Text>
              <Text style={styles.featureSubtitle}>{featuredCook.headline}</Text>
            </View>
            <View style={styles.featureAvatarWrap}>
              {featuredCook.user.photoUrl ? (
                <Image source={featuredCook.user.photoUrl} style={styles.featureAvatar} contentFit="cover" />
              ) : (
                <View style={styles.featureAvatarFallback}>
                  <Text style={styles.featureAvatarText}>{featuredCook.name.slice(0, 1)}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.featureMetaRow}>
            <View style={styles.featureMetaPill}>
              <Ionicons name="location-outline" size={14} color={activeTheme.text} />
              <Text style={styles.featureMetaText}>{featuredCook.location}</Text>
            </View>
            <View style={styles.featureMetaPill}>
              <Ionicons name="shield-checkmark-outline" size={14} color={activeTheme.text} />
              <Text style={styles.featureMetaText}>
                {featuredCook.verified ? "Verified profile" : "In review"}
              </Text>
            </View>
            <View style={styles.featureMetaPill}>
              <Ionicons name="restaurant-outline" size={14} color={activeTheme.text} />
              <Text style={styles.featureMetaText}>{featuredCook.specialties[0] || "Home cooking"}</Text>
            </View>
          </View>

          <Text style={styles.featureNote}>{featuredCook.note}</Text>
          <View style={styles.safetyRibbon}>
            <Ionicons name="shield-checkmark" size={16} color={activeTheme.primaryDark} />
            <Text style={styles.safetyRibbonText}>{explorerContext.safetyLine}</Text>
          </View>

          <View style={styles.featureActionRow}>
            <Pressable
              style={styles.featureSecondaryButton}
              onPress={() =>
                router.push({
                  pathname: "/cooks/[id]",
                  params: { id: featuredCook.id },
                })
              }
            >
              <Text style={styles.featureSecondaryText}>View profile</Text>
            </Pressable>
            <Pressable
              style={styles.featurePrimaryButton}
              onPress={() =>
                router.push({
                  pathname: "/booking-request",
                  params: { cookId: featuredCook.id },
                })
              }
            >
              <Text style={styles.featurePrimaryText}>Book this cook</Text>
            </Pressable>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.miniSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>Quick matches</Text>
            <Text style={styles.sectionBody}>
              {isLoadingDirectory
                ? "Loading trusted cooks..."
                : `Short, easy choices around ${explorerContext.cityLabel} for when you want to move fast.`}
            </Text>
          </View>
          <Pressable
            style={styles.seeAllButton}
            onPress={() => router.push({ pathname: "/all-cooks", params: { sort: "popular" } })}
          >
            <Text style={styles.seeAllText}>See all</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
          {quickMatches.map((cook) => (
            <Pressable
              key={cook.id}
              style={styles.miniCookCard}
              onPress={() => router.push({ pathname: "/cooks/[id]", params: { id: cook.id } })}
            >
              <View style={styles.miniCookTop}>
                <View style={styles.miniAvatar}>
                  {cook.user.photoUrl ? (
                    <Image source={cook.user.photoUrl} style={styles.miniAvatarImage} contentFit="cover" />
                  ) : (
                    <Text style={styles.miniAvatarText}>{cook.name.slice(0, 1)}</Text>
                  )}
                </View>
                {cook.verified ? <View style={styles.miniVerifiedDot} /> : null}
              </View>
              <Text numberOfLines={1} style={styles.miniCookName}>{cook.name}</Text>
              <Text numberOfLines={1} style={styles.miniCookMeta}>{cook.location}</Text>
              <Text numberOfLines={1} style={styles.miniCookTag}>
                {cook.specialties[0] || cook.tags[0] || "Home cooking"}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.dualSectionRow}>
        <Pressable
          style={styles.storyCard}
          onPress={() => router.push({ pathname: "/all-cooks", params: { sort: "verified" } })}
        >
          <Text style={styles.storyEyebrow}>Trust first</Text>
          <Text style={styles.storyTitle}>Verified cooks</Text>
          <Text style={styles.storyBody}>
            Start from stronger trust signals when booking into your home around {explorerContext.cityLabel}.
          </Text>
          <Text style={styles.storyMetric}>{verifiedCooks.length}</Text>
        </Pressable>

        <Pressable
          style={styles.storyCard}
          onPress={() => router.push({ pathname: "/all-cooks", params: { sort: "complete" } })}
        >
          <Text style={styles.storyEyebrow}>Prepared profiles</Text>
          <Text style={styles.storyTitle}>100% complete</Text>
          <Text style={styles.storyBody}>
            These cooks have gone further in showing how they work in homes around {explorerContext.cityLabel}.
          </Text>
          <Text style={styles.storyMetric}>{completeProfileCooks.length}</Text>
        </Pressable>
      </View>

      <View style={styles.miniSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>Browse by taste</Text>
            <Text style={styles.sectionBody}>
              When the dish comes first, start from the craving and narrow from there.
            </Text>
          </View>
        </View>
        <View style={styles.tasteRow}>
          {tasteIdeas.map((chip) => (
            <Pressable
              key={chip}
              style={styles.tasteChip}
              onPress={() =>
                router.push({
                  pathname: "/search-results",
                  params: { query: chip },
                })
              }
            >
              <Text style={styles.tasteChipText}>{chip}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.miniSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>Quiet confidence</Text>
            <Text style={styles.sectionBody}>
              Profiles that feel more polished for explorers who want fewer unknowns in {explorerContext.nearbyLabel}.
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
          {trustedLane.slice(0, 3).map((cook) => (
            <Pressable
              key={cook.id}
              style={styles.editorialCard}
              onPress={() => router.push({ pathname: "/cooks/[id]", params: { id: cook.id } })}
            >
              <Text style={styles.editorialName}>{cook.name}</Text>
              <Text numberOfLines={2} style={styles.editorialBody}>{cook.headline}</Text>
              <View style={styles.editorialFooter}>
                <Text style={styles.editorialMeta}>{cook.serviceAreaLabel}</Text>
                <Ionicons name="arrow-forward" size={16} color={activeTheme.text} />
              </View>
            </Pressable>
          ))}
          {polishedLane.slice(0, 2).map((cook) => (
            <Pressable
              key={`${cook.id}-polished`}
              style={styles.editorialCardSoft}
              onPress={() => router.push({ pathname: "/cooks/[id]", params: { id: cook.id } })}
            >
              <Text style={styles.editorialName}>{cook.name}</Text>
              <Text numberOfLines={2} style={styles.editorialBody}>{cook.note}</Text>
              <View style={styles.editorialFooter}>
                <Text style={styles.editorialMeta}>{cook.profilePercent}% complete</Text>
                <Ionicons name="arrow-forward" size={16} color={activeTheme.text} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.companionCard}>
        <Text style={styles.companionEyebrow}>Companion mode</Text>
        <Text style={styles.companionTitle}>We can keep this personal without crossing the line.</Text>
        <Text style={styles.companionBody}>
          We use the city, timing, saved cooks, and booking activity you already share with us to keep recommendations useful and safety-first.
        </Text>
        <View style={styles.companionList}>
          <Text style={styles.companionPoint}>City-aware suggestions for {explorerContext.cityLabel}</Text>
          <Text style={styles.companionPoint}>Safer reminders tied to saved cooks and active bookings</Text>
          <Text style={styles.companionPoint}>Trust-first language before every home booking step</Text>
        </View>
        <Pressable style={styles.companionAction} onPress={() => router.push("/companion-preferences")}>
          <Text style={styles.companionActionText}>Review companion permissions</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
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
    topGlow: {
      position: "absolute",
      top: -120,
      right: -70,
      width: 270,
      height: 270,
      borderRadius: 135,
      backgroundColor: activeTheme.accentSoft,
      opacity: activeTheme.bg === "#121713" ? 0.24 : 0.95,
    },
    sideGlow: {
      position: "absolute",
      top: 210,
      left: -90,
      width: 190,
      height: 190,
      borderRadius: 95,
      backgroundColor: activeTheme.bg === "#121713" ? activeTheme.surfaceElevated : "#F6E9D8",
      opacity: activeTheme.bg === "#121713" ? 0.55 : 0.75,
    },
    headerBlock: { gap: 8 },
    eyebrow: {
      color: activeTheme.primaryDark,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    title: {
      color: activeTheme.text,
      fontSize: 34,
      lineHeight: 40,
      fontWeight: "800",
      maxWidth: 340,
    },
    subtitle: {
      color: activeTheme.textMuted,
      fontSize: 15,
      lineHeight: 23,
      maxWidth: 350,
    },
    completeProfileCard: {
      backgroundColor: activeTheme.bg === "#121713" ? activeTheme.surface : "#F6E8D7",
      borderWidth: 1,
      borderColor: activeTheme.bg === "#121713" ? activeTheme.border : "#E0C8B0",
      borderRadius: 28,
      padding: theme.spacing.lg,
      gap: 14,
    },
    completeProfileTop: {
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
    },
    completeProfileCopy: { flex: 1, gap: 4 },
    completeProfileTitle: {
      color: activeTheme.text,
      fontSize: 22,
      lineHeight: 27,
      fontWeight: "800",
    },
    completeProfileSubtitle: {
      color: activeTheme.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    progressBadge: {
      minWidth: 62,
      height: 38,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primary,
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
      backgroundColor: activeTheme.surfaceElevated,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primary,
    },
    searchHero: {
      borderRadius: 30,
      padding: theme.spacing.lg,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      gap: theme.spacing.lg,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
      elevation: 6,
    },
    searchHeroTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 14,
    },
    searchHeroIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.accentSoft,
    },
    searchHeroCopy: { flex: 1, gap: 5 },
    searchHeroTitle: {
      color: activeTheme.text,
      fontSize: 21,
      lineHeight: 27,
      fontWeight: "800",
    },
    searchHeroText: {
      color: activeTheme.textMuted,
      fontSize: 14,
      lineHeight: 22,
    },
    searchHeroFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    searchHeroLink: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "800",
    },
    companionRow: {
      gap: 12,
    },
    decisionCard: {
      borderRadius: 28,
      backgroundColor: activeTheme.warmSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 8,
    },
    preferenceCard: {
      borderRadius: 28,
      backgroundColor: activeTheme.focusSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 8,
    },
    decisionTitle: {
      color: activeTheme.text,
      fontSize: 21,
      lineHeight: 27,
      fontWeight: "800",
    },
    decisionBody: {
      color: activeTheme.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    moodCard: {
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: 28,
      padding: theme.spacing.lg,
      gap: 12,
    },
    sectionTitle: {
      color: activeTheme.text,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "800",
    },
    sectionBody: {
      color: activeTheme.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    moodGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    moodButton: {
      minWidth: "47%",
      flexGrow: 1,
      borderRadius: 22,
      backgroundColor: activeTheme.surfaceElevated,
      paddingHorizontal: 14,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    moodButtonText: {
      color: activeTheme.text,
      fontSize: 14,
      fontWeight: "700",
    },
    featureCard: {
      overflow: "hidden",
      borderRadius: 34,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 16 },
      elevation: 7,
    },
    featureAccent: {
      position: "absolute",
      top: -40,
      right: -40,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: activeTheme.accentSoft,
      opacity: activeTheme.bg === "#121713" ? 0.45 : 0.95,
    },
    featureHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 14,
    },
    featureCopy: { flex: 1, gap: 6 },
    featureEyebrow: {
      color: activeTheme.primaryDark,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },
    featureTitle: {
      color: activeTheme.text,
      fontSize: 30,
      lineHeight: 34,
      fontWeight: "800",
    },
    featureSubtitle: {
      color: activeTheme.textMuted,
      fontSize: 15,
      lineHeight: 22,
      maxWidth: 250,
    },
    featureAvatarWrap: {
      width: 76,
      height: 76,
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: activeTheme.accent,
    },
    featureAvatar: {
      width: "100%",
      height: "100%",
    },
    featureAvatarFallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    featureAvatarText: {
      color: "#FFFFFF",
      fontSize: 28,
      fontWeight: "800",
    },
    featureMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    featureMetaPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.bg,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    featureMetaText: {
      color: activeTheme.text,
      fontSize: 12,
      fontWeight: "700",
    },
    featureNote: {
      color: activeTheme.text,
      fontSize: 15,
      lineHeight: 23,
    },
    safetyRibbon: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      borderRadius: 18,
      backgroundColor: activeTheme.bg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    safetyRibbonText: {
      flex: 1,
      color: activeTheme.text,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "700",
    },
    featureActionRow: {
      flexDirection: "row",
      gap: 10,
    },
    featureSecondaryButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    featureSecondaryText: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "700",
    },
    featurePrimaryButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 18,
      backgroundColor: activeTheme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    featurePrimaryText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "800",
    },
    miniSection: { gap: 12 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionHeaderCopy: { flex: 1, gap: 4 },
    seeAllButton: {
      minHeight: 34,
      paddingHorizontal: 12,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surfaceElevated,
    },
    seeAllText: {
      color: activeTheme.text,
      fontSize: 13,
      fontWeight: "800",
    },
    horizontalRow: {
      gap: 12,
      paddingRight: 10,
    },
    miniCookCard: {
      width: 164,
      borderRadius: 24,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      gap: 8,
    },
    miniCookTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    miniAvatar: {
      width: 54,
      height: 54,
      borderRadius: 20,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.accent,
    },
    miniAvatarImage: { width: "100%", height: "100%" },
    miniAvatarText: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
    miniVerifiedDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: activeTheme.primary,
      marginTop: 6,
    },
    miniCookName: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "800",
    },
    miniCookMeta: {
      color: activeTheme.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    miniCookTag: {
      color: activeTheme.primaryDark,
      fontSize: 12,
      fontWeight: "700",
    },
    dualSectionRow: {
      flexDirection: "row",
      gap: 12,
    },
    storyCard: {
      flex: 1,
      borderRadius: 28,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 8,
      minHeight: 182,
      justifyContent: "space-between",
    },
    storyEyebrow: {
      color: activeTheme.primaryDark,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    storyTitle: {
      color: activeTheme.text,
      fontSize: 22,
      lineHeight: 26,
      fontWeight: "800",
    },
    storyBody: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    storyMetric: {
      color: activeTheme.text,
      fontSize: 26,
      fontWeight: "800",
    },
    tasteRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    tasteChip: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surfaceElevated,
    },
    tasteChipText: {
      color: activeTheme.text,
      fontSize: 14,
      fontWeight: "700",
    },
    editorialCard: {
      width: 210,
      minHeight: 168,
      borderRadius: 28,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      justifyContent: "space-between",
      gap: 10,
    },
    editorialCardSoft: {
      width: 210,
      minHeight: 168,
      borderRadius: 28,
      backgroundColor: activeTheme.bg === "#121713" ? activeTheme.surfaceElevated : "#F8EEE2",
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      justifyContent: "space-between",
      gap: 10,
    },
    editorialName: {
      color: activeTheme.text,
      fontSize: 19,
      fontWeight: "800",
    },
    editorialBody: {
      color: activeTheme.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    editorialFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    editorialMeta: {
      color: activeTheme.primaryDark,
      fontSize: 12,
      fontWeight: "700",
      flex: 1,
    },
    companionCard: {
      borderRadius: 30,
      backgroundColor: activeTheme.bg === "#121713" ? activeTheme.surface : "#F6E8D7",
      borderWidth: 1,
      borderColor: activeTheme.bg === "#121713" ? activeTheme.border : "#E0C8B0",
      padding: theme.spacing.lg,
      gap: 10,
    },
    companionEyebrow: {
      color: activeTheme.primaryDark,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    companionTitle: {
      color: activeTheme.text,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "800",
    },
    companionBody: {
      color: activeTheme.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    companionList: { gap: 6 },
    companionPoint: {
      color: activeTheme.text,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
    },
    companionAction: {
      alignSelf: "flex-start",
      minHeight: 40,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primary,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    companionActionText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
  });
