import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getCurrentUserRecord, type StoredUser } from "@/lib/app-state";
import { getProfileCompletion, getProfileCompletionCopy } from "@/lib/profile-completion";
import { getTheme, theme } from "@/theme/theme";

export default function CookHomeScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);

  const [user, setUser] = useState<StoredUser | null>(null);

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
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroGlow} />

      <Text style={styles.eyebrow}>Cook Home</Text>
      <Text style={styles.title}>Welcome back, {firstName}.</Text>
      <Text style={styles.subtitle}>
        Keep your trust signals, service area, and incoming interest in one calm place.
      </Text>

      {completion && completion.percent < 100 ? (
        <Pressable style={styles.completeProfileCard} onPress={() => router.push("/complete-profile")}>
          <View style={styles.completeProfileHeader}>
            <View style={styles.completeProfileCopy}>
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
            <Ionicons name="arrow-forward" size={18} color={activeTheme.text} />
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

      <View style={styles.availabilityCard}>
        <Text style={styles.cardTitle}>
          {user?.cookVerification?.status === "verified"
            ? "Your cook profile is showing strong trust signals."
            : "Your cook profile is still building trust signals."}
        </Text>
        <Text style={styles.cardText}>
          {user?.cookVerification?.status === "verified"
            ? "Explorers can see your verification status, service area, and safety details when they browse."
            : "Finish your profile so explorers can see your service area, specialties, and safety standards before they book."}
        </Text>
        <View style={styles.availabilityPill}>
          <Text style={styles.availabilityText}>
            {user?.serviceAreaLabel || "Set your service area"}
          </Text>
        </View>
      </View>

      <View style={styles.stack}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Trust snapshot</Text>
          <Text style={styles.sectionBody}>
            {completion
              ? `${completion.completed} of ${completion.total} profile details are in place.`
              : "Add more profile detail to strengthen trust."}
          </Text>
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>What explorers will notice</Text>
          <Text style={styles.sectionBody}>
            Your bio, signature dishes, travel area, and kitchen safety note all shape how safe and reliable your profile feels to first-time explorers.
          </Text>
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Strong next step</Text>
          <Text style={styles.sectionBody}>
            Finish your trust profile, then keep your specialties and service area updated so the explore feed can match you to the right homes.
          </Text>
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
    heroGlow: {
      position: "absolute",
      top: -90,
      right: -40,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: activeTheme.accentSoft,
      opacity: activeTheme.bg === "#121713" ? 0.2 : 0.9,
    },
    eyebrow: {
      color: activeTheme.primaryDark,
      fontSize: 14,
      fontWeight: "800",
    },
    title: {
      color: activeTheme.text,
      fontSize: 32,
      lineHeight: 38,
      fontWeight: "800",
      maxWidth: 340,
    },
    subtitle: {
      color: activeTheme.textMuted,
      fontSize: 16,
      lineHeight: 24,
      maxWidth: 350,
    },
    completeProfileCard: {
      backgroundColor: activeTheme.bg === "#121713" ? activeTheme.surface : activeTheme.warmSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
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
    completeProfileTitle: {
      color: activeTheme.text,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "800",
    },
    completeProfileSubtitle: {
      color: activeTheme.textMuted,
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
      backgroundColor: activeTheme.surfaceElevated,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primary,
    },
    completeProfileFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    completeProfileLink: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "800",
    },
    statsRow: {
      flexDirection: "row",
      gap: 12,
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
    availabilityCard: {
      backgroundColor: activeTheme.safeSurface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
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
