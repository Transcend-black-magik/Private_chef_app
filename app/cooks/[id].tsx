import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import RoundedAvatar from "@/components/RoundedAvatar";
import { getCurrentUserRecord, type StoredUser } from "@/lib/app-state";
import { getCookById, type CookDirectoryRecord } from "@/lib/cook-data";
import { getExplorerContext } from "@/lib/explorer-context";
import { isCookSaved, toggleSavedCook } from "@/lib/saved-cooks";
import { getTheme, theme } from "@/theme/theme";

function buildFitReasons(cook: CookDirectoryRecord, explorer: StoredUser | null) {
  const reasons = [];

  if (cook.verified) {
    reasons.push("Verified identity and trust signals");
  }

  if (cook.serviceAreaLabel) {
    reasons.push(`Works around ${cook.serviceAreaLabel}`);
  }

  if (cook.specialties[0]) {
    reasons.push(`Known for ${cook.specialties[0]}`);
  }

  if (explorer?.city && cook.city && explorer.city.toLowerCase() === cook.city.toLowerCase()) {
    reasons.push(`Already close to homes in ${explorer.city}`);
  }

  if (cook.profilePercent >= 100) {
    reasons.push("Complete profile with stronger booking clarity");
  }

  return reasons.slice(0, 4);
}

export default function CookDetailScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const params = useLocalSearchParams<{ id?: string }>();
  const [cook, setCook] = useState<CookDirectoryRecord | null | undefined>(undefined);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [explorer, setExplorer] = useState<StoredUser | null>(null);

  useEffect(() => {
    async function loadCook() {
      const [nextCook, nextIsSaved, nextExplorer] = await Promise.all([
        getCookById(params.id ?? ""),
        params.id ? isCookSaved(params.id) : Promise.resolve(false),
        getCurrentUserRecord(),
      ]);
      setCook(nextCook);
      setIsSaved(nextIsSaved);
      setExplorer(nextExplorer);
    }

    void loadCook();
  }, [params.id]);

  const explorerContext = useMemo(() => getExplorerContext(explorer), [explorer]);

  async function handleToggleSaved() {
    if (!cook || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const nextSavedCookIds = await toggleSavedCook(cook.id);
      setIsSaved(nextSavedCookIds.includes(cook.id));
    } finally {
      setIsSaving(false);
    }
  }

  if (cook === undefined) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyTitle}>Loading cook profile...</Text>
      </View>
    );
  }

  if (!cook) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyTitle}>Cook not found.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const fitReasons = buildFitReasons(cook, explorer);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroGlow} />
      <View style={styles.heroGlowSoft} />

      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Pressable style={styles.saveButton} onPress={() => void handleToggleSaved()}>
          <Ionicons
            name={isSaved ? "heart" : "heart-outline"}
            size={18}
            color={isSaved ? activeTheme.secondaryAccent : activeTheme.text}
          />
          <Text style={styles.saveButtonText}>
            {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <RoundedAvatar
            name={cook.name}
            photoUrl={cook.user.photoUrl}
            size={84}
            backgroundColor={activeTheme.accent}
          />
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>A cook for {explorerContext.cityLabel}</Text>
            <Text style={styles.title}>{cook.name}</Text>
            <Text style={styles.subtitle}>{cook.headline}</Text>
            <Text style={styles.locationText}>
              {cook.location} | {cook.yearsExperience} years | {cook.serviceRadiusMiles} mile reach
            </Text>
          </View>
        </View>

        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaPill}>
            <Ionicons name="shield-checkmark-outline" size={14} color={activeTheme.text} />
            <Text style={styles.heroMetaText}>{cook.verified ? "Verified" : "In review"}</Text>
          </View>
          <View style={styles.heroMetaPill}>
            <Ionicons name="restaurant-outline" size={14} color={activeTheme.text} />
            <Text style={styles.heroMetaText}>{cook.specialties[0] || "Home cooking"}</Text>
          </View>
          <View style={styles.heroMetaPill}>
            <Ionicons name="home-outline" size={14} color={activeTheme.text} />
            <Text style={styles.heroMetaText}>Home-safe booking</Text>
          </View>
        </View>

        <Text style={styles.heroBody}>
          {explorerContext.daypartGreeting} {cook.name} feels like a strong fit for homes around {explorerContext.cityLabel} when you want less friction and more calm.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Why this cook could fit your day</Text>
        <View style={styles.reasonList}>
          {fitReasons.map((reason) => (
            <View key={reason} style={styles.reasonRow}>
              <Ionicons name="sparkles-outline" size={16} color={activeTheme.primaryDark} />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>What booking this cook feels like</Text>
        <Text style={styles.bodyText}>{cook.bio}</Text>
        <View style={styles.tagRow}>
          {(cook.specialties.length ? cook.specialties : ["Profile dishes coming soon"]).map((item) => (
            <View key={item} style={styles.tag}>
              <Text style={styles.tagText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.safetyCard}>
        <Text style={styles.safetyTitle}>Safe with us from first message to final release</Text>
        <Text style={styles.safetyBody}>
          Your chat, booking steps, and release flow stay inside the app. We keep the process structured so you are not left handling trust on your own.
        </Text>
        <View style={styles.safetyPoints}>
          <View style={styles.safetyPoint}>
            <Ionicons name="checkmark-circle" size={16} color={activeTheme.primaryDark} />
            <Text style={styles.safetyPointText}>In-app booking and message trail</Text>
          </View>
          <View style={styles.safetyPoint}>
            <Ionicons name="checkmark-circle" size={16} color={activeTheme.primaryDark} />
            <Text style={styles.safetyPointText}>Identity and trust signals visible before booking</Text>
          </View>
          <View style={styles.safetyPoint}>
            <Ionicons name="checkmark-circle" size={16} color={activeTheme.primaryDark} />
            <Text style={styles.safetyPointText}>A safer release flow for service completion</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Service fit around {explorerContext.cityLabel}</Text>
        <Text style={styles.bodyText}>Main area: {cook.serviceAreaLabel}</Text>
        <Text style={styles.bodyText}>Profile status: {cook.responseLabel}</Text>
        <Text style={styles.bodyText}>Booking signal: {cook.priceHint}</Text>
        <Text style={styles.bodyText}>Trust profile: {cook.profilePercent}% complete</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Trust snapshot</Text>
        <View style={styles.badgeRow}>
          {cook.trustBadges.length ? (
            cook.trustBadges.map((badge) => (
              <View key={badge} style={styles.badge}>
                <Ionicons name="checkmark-circle" size={16} color={activeTheme.primaryDark} />
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.bodyText}>This cook is still building out more trust details.</Text>
          )}
        </View>
        <Text style={styles.bodyText}>{cook.note}</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            router.push({
              pathname: "/booking-request",
              params: { cookId: cook.id },
            })
          }
        >
          <Text style={styles.secondaryButtonText}>Start safely</Text>
        </Pressable>
        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.push({
              pathname: "/booking-request",
              params: { cookId: cook.id },
            })
          }
        >
          <Text style={styles.primaryButtonText}>Book this cook</Text>
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
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    heroGlow: {
      position: "absolute",
      top: -100,
      right: -60,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: activeTheme.accentSoft,
      opacity: activeTheme.bg === "#121713" ? 0.24 : 0.92,
    },
    heroGlowSoft: {
      position: "absolute",
      top: 240,
      left: -80,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: activeTheme.bg === "#121713" ? activeTheme.surfaceElevated : "#F6E9D8",
      opacity: activeTheme.bg === "#121713" ? 0.5 : 0.7,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    backText: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "700",
    },
    saveButton: {
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    saveButtonText: { color: activeTheme.text, fontSize: 14, fontWeight: "700" },
    heroCard: {
      borderRadius: 32,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
      elevation: 6,
    },
    heroHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    heroCopy: {
      flex: 1,
      gap: 4,
    },
    eyebrow: {
      color: activeTheme.primaryDark,
      fontSize: 13,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    title: {
      color: activeTheme.text,
      fontSize: 32,
      lineHeight: 36,
      fontWeight: "800",
    },
    subtitle: {
      color: activeTheme.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    locationText: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    heroMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    heroMetaPill: {
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
    heroMetaText: {
      color: activeTheme.text,
      fontSize: 12,
      fontWeight: "700",
    },
    heroBody: {
      color: activeTheme.text,
      fontSize: 15,
      lineHeight: 23,
    },
    sectionCard: {
      backgroundColor: activeTheme.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    sectionTitle: {
      color: activeTheme.text,
      fontSize: 21,
      fontWeight: "800",
    },
    bodyText: {
      color: activeTheme.textMuted,
      fontSize: 15,
      lineHeight: 23,
    },
    reasonList: { gap: 10 },
    reasonRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    reasonText: {
      flex: 1,
      color: activeTheme.text,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: "700",
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tag: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surfaceElevated,
    },
    tagText: {
      color: activeTheme.text,
      fontSize: 13,
      fontWeight: "700",
    },
    safetyCard: {
      borderRadius: 30,
      backgroundColor: activeTheme.bg === "#121713" ? activeTheme.surface : "#F6E8D7",
      borderWidth: 1,
      borderColor: activeTheme.bg === "#121713" ? activeTheme.border : "#E0C8B0",
      padding: theme.spacing.lg,
      gap: 12,
    },
    safetyTitle: {
      color: activeTheme.text,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "800",
    },
    safetyBody: {
      color: activeTheme.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    safetyPoints: { gap: 8 },
    safetyPoint: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    safetyPointText: {
      flex: 1,
      color: activeTheme.text,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "700",
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.bg,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    badgeText: {
      color: activeTheme.text,
      fontSize: 12,
      fontWeight: "700",
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
    emptyScreen: {
      flex: 1,
      backgroundColor: activeTheme.bg,
      paddingHorizontal: theme.spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.lg,
    },
    emptyTitle: {
      color: activeTheme.text,
      fontSize: 24,
      fontWeight: "800",
      textAlign: "center",
    },
  });
