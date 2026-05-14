import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import RoundedAvatar from "@/components/RoundedAvatar";
import { clearSession, getCurrentUserRecord, getSession, getUserByEmail, saveUserRecord, type StoredUser } from "@/lib/app-state";
import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { heroFoodImages } from "@/lib/food-visuals";
import { getTheme, theme } from "@/theme/theme";

const profileActions = [
  { title: "Saved cooks", icon: "heart-outline", route: "/saved-cooks" },
  { title: "Home address", icon: "home-outline", route: "/complete-profile" },
  { title: "Payment method", icon: "card-outline", route: "/bookings" },
  { title: "Help and support", icon: "help-circle-outline", route: "/help-support" },
];

const companionActions = [
  { title: "Meal companion", icon: "sparkles-outline", route: "/companion-preferences" },
  { title: "Taste guide", icon: "restaurant-outline", route: "/meal-match" },
];

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width >= 900;
  const styles = createStyles(activeTheme, isWideWeb);
  const [name, setName] = useState("Friend");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("explorer");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [countryName, setCountryName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [canVerifyCook, setCanVerifyCook] = useState(false);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const [shareReadReceipts, setShareReadReceipts] = useState(true);
  const verificationLabel = verificationStatus || (role === "cook" ? "Pending review" : "Explorer ready");
  const trustStats = [
    { label: "Mode", value: role === "cook" ? "Cook" : "Explorer" },
    { label: "Trust", value: verificationStatus ? verificationStatus : "Active" },
    { label: "Region", value: countryName || "Set soon" },
  ];

  useEffect(() => {
    async function loadSession() {
      const session = await getSession();

      if (!session) {
        router.replace("/signin");
        return;
      }

      setName(session.name || "Friend");
      setPhone(session.phone || "");
      setEmail(session.email || "");
      setRole(session.role);

      const storedUser = (await getCurrentUserRecord()) ?? (await getUserByEmail(session.email));
      setStoredUser(storedUser);
      setShareReadReceipts(storedUser?.shareReadReceipts !== false);

      if (storedUser?.countryName) {
        setCountryName(storedUser.countryName);
      }

      if (storedUser?.photoUrl) {
        setPhotoUrl(storedUser.photoUrl);
      }

      if (storedUser?.cookVerification?.status) {
        setVerificationStatus(storedUser.cookVerification.status.replace(/_/g, " "));
      }

      setCanVerifyCook(
        storedUser?.role === "cook" && storedUser?.cookVerification?.status !== "verified",
      );
    }

    void loadSession();
  }, []);

  async function toggleReadReceipts() {
    if (!storedUser) {
      return;
    }

    const nextValue = !shareReadReceipts;
    setShareReadReceipts(nextValue);
    const nextUser = {
      ...storedUser,
      shareReadReceipts: nextValue,
      updatedAt: new Date().toISOString(),
    };
    setStoredUser(nextUser);
    await saveUserRecord(nextUser);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundBand} />
      <View style={styles.backgroundTile} />
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
      >
      <View style={styles.profileHero}>
        <Image source={heroFoodImages.dessert} style={styles.profileHeroImage} contentFit="cover" />
        <View style={styles.profileHeroShade} />
        <View style={styles.heroTopBar}>
          <View style={styles.statusPill}>
            <Ionicons name="shield-checkmark" size={15} color="#FFFFFF" />
            <Text style={styles.statusPillText}>{verificationLabel}</Text>
          </View>
          <Pressable style={styles.heroIconButton} onPress={() => router.push("/complete-profile")}>
            <Ionicons name="create-outline" size={19} color="#171713" />
          </Pressable>
        </View>
        <View style={styles.heroIdentity}>
          <RoundedAvatar name={name} photoUrl={photoUrl} size={92} backgroundColor={activeTheme.primary} />
          <View style={styles.heroCopy}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.role}>{role === "cook" ? "Cook account" : "Explorer account"}</Text>
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={15} color="rgba(255,255,255,0.78)" />
              <Text numberOfLines={1} style={styles.phone}>{email || "No email added yet"}</Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={15} color="rgba(255,255,255,0.78)" />
              <Text numberOfLines={1} style={styles.phone}>{phone || "No phone added yet"}</Text>
            </View>
          </View>
        </View>
        <View style={styles.statStrip}>
          {trustStats.map((stat) => (
            <View key={stat.label} style={styles.heroStat}>
              <Text numberOfLines={1} style={styles.heroStatValue}>{stat.value}</Text>
              <Text style={styles.heroStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.dashboardGrid}>
        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionKicker}>Safety</Text>
              <Text style={styles.sectionTitle}>Account trust</Text>
            </View>
            <View style={styles.sectionIcon}>
              <Ionicons name="finger-print-outline" size={20} color={activeTheme.primaryDark} />
            </View>
          </View>
          <View style={styles.verificationCard}>
            <Text style={styles.verificationTitle}>Verification</Text>
            <Text style={styles.verificationBody}>
              {verificationStatus
                ? `Status: ${verificationStatus}. ${countryName ? `Country: ${countryName}.` : ""}`
                : "Your trust and safety review details will appear here."}
            </Text>
            {canVerifyCook ? (
              <Pressable style={styles.verifyButton} onPress={() => router.push("/cook-verification")}>
                <Ionicons name="id-card-outline" size={16} color="#FFFFFF" />
                <Text style={styles.verifyButtonText}>Verify identity</Text>
              </Pressable>
            ) : role === "cook" ? (
              <View style={styles.verifyLockedPill}>
                <Text style={styles.verifyLockedText}>
                  {verificationStatus ? "Verification locked" : "Verification not available"}
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable style={styles.actionRow} onPress={() => void toggleReadReceipts()}>
            <View style={styles.actionLeft}>
              <View style={styles.actionIcon}>
                <Ionicons name="checkmark-done-outline" size={18} color={activeTheme.primaryDark} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionText}>Read receipts</Text>
                <Text style={styles.actionHint}>
                  {shareReadReceipts ? "Others can see when you read chats" : "Read status is private"}
                </Text>
              </View>
            </View>
            <View style={[styles.toggleTrack, shareReadReceipts && styles.toggleTrackOn]}>
              <View style={[styles.toggleKnob, shareReadReceipts && styles.toggleKnobOn]} />
            </View>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionKicker}>Shortcuts</Text>
              <Text style={styles.sectionTitle}>Profile tools</Text>
            </View>
            <View style={styles.sectionIcon}>
              <Ionicons name="grid-outline" size={20} color={activeTheme.primaryDark} />
            </View>
          </View>
          <View style={styles.actionGrid}>
            {profileActions.map((item) => (
              role === "cook" && item.title === "Saved cooks" ? null : (
              <Pressable
                key={item.title}
                style={styles.tileAction}
                onPress={() => router.push(item.route as never)}
              >
                <View style={styles.tileIcon}>
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={activeTheme.primaryDark}
                  />
                </View>
                <Text style={styles.tileText}>{item.title}</Text>
                <Ionicons name="arrow-forward" size={16} color={activeTheme.textMuted} />
              </Pressable>
              )
            ))}
          </View>
        </View>
      </View>

      {role !== "cook" ? (
      <View style={styles.companionCard}>
        <View style={styles.companionImageWrap}>
          <Image source={heroFoodImages.salad} style={styles.companionImage} contentFit="cover" />
        </View>
        <View style={styles.companionContent}>
          <Text style={[styles.sectionKicker, styles.companionKicker]}>Companion mode</Text>
          <Text style={styles.companionTitle}>Taste, planning, and food decisions in one place.</Text>
          <Text style={styles.companionBody}>
            Keep every recommendation, taste signal, and meal-decision tool together in one place.
          </Text>
          <View style={styles.companionActionRow}>
            {companionActions.map((item) => (
              <Pressable
                key={item.title}
                style={styles.companionAction}
                onPress={() => router.push(item.route as never)}
              >
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.companionActionText}>{item.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      ) : null}

      <Pressable
        style={styles.logoutButton}
        onPress={async () => {
          setIsLoggingOut(true);
          await clearSession();
          router.replace("/signin");
        }}
      >
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>

      <Pressable
        style={styles.previewButton}
        onPress={() => router.push({ pathname: "/welcome", params: { step: "intro" } })}
      >
        <Text style={styles.previewButtonText}>Preview onboarding intro</Text>
      </Pressable>

      {isLoggingOut ? (
        <AuthProcessingScreen
          title="Logging you out"
          subtitle="We're closing your session and taking you back to sign in."
        />
      ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>, isWideWeb: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: activeTheme.bg,
    },
    scrollArea: { flex: 1 },
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
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: isWideWeb ? theme.spacing.xxl : theme.layout.screenTop,
      paddingBottom: 120,
      gap: theme.spacing.lg,
      width: "100%",
      alignSelf: "center",
    },
    profileHero: {
      gap: isWideWeb ? theme.spacing.xl : theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: 34,
      overflow: "hidden",
      backgroundColor: activeTheme.primaryDark,
      minHeight: isWideWeb ? 430 : 360,
      justifyContent: "space-between",
      marginHorizontal: -theme.spacing.lg,
      marginTop: isWideWeb ? -theme.spacing.xxl : -theme.layout.screenTop,
      paddingTop: isWideWeb ? theme.spacing.xxl : theme.layout.screenTop,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    },
    profileHeroImage: {
      ...StyleSheet.absoluteFillObject,
    },
    profileHeroShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.48)",
    },
    heroTopBar: {
      zIndex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    statusPill: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: "rgba(0,0,0,0.34)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },
    statusPillText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900",
      textTransform: "capitalize",
    },
    heroIconButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.92)",
    },
    heroIdentity: {
      zIndex: 1,
      flexDirection: isWideWeb ? "row" : "column",
      alignItems: isWideWeb ? "flex-end" : "flex-start",
      gap: theme.spacing.md,
      maxWidth: isWideWeb ? 760 : undefined,
    },
    heroCopy: {
      gap: 7,
    },
    name: {
      color: "#FFFFFF",
      fontSize: isWideWeb ? 46 : 34,
      lineHeight: isWideWeb ? 52 : 39,
      fontWeight: "900",
    },
    role: {
      color: "#FFE0BD",
      fontSize: 14,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      maxWidth: isWideWeb ? 560 : 320,
    },
    phone: {
      color: "rgba(255,255,255,0.84)",
      fontSize: 15,
      fontWeight: "700",
      flexShrink: 1,
    },
    statStrip: {
      zIndex: 1,
      flexDirection: "row",
      gap: 10,
    },
    heroStat: {
      flex: 1,
      minHeight: 78,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.15)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      padding: theme.spacing.md,
      justifyContent: "space-between",
    },
    heroStatValue: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "900",
      textTransform: "capitalize",
    },
    heroStatLabel: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    dashboardGrid: {
      flexDirection: isWideWeb ? "row" : "column",
      gap: theme.spacing.lg,
    },
    infoCard: {
      flex: 1,
      backgroundColor: activeTheme.surface,
      borderRadius: 30,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.lg,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    companionCard: {
      minHeight: isWideWeb ? 300 : 420,
      borderRadius: 34,
      overflow: "hidden",
      backgroundColor: activeTheme.primaryDark,
      flexDirection: isWideWeb ? "row" : "column",
    },
    companionImageWrap: {
      flex: isWideWeb ? 0.9 : undefined,
      height: isWideWeb ? "100%" : 190,
      minHeight: isWideWeb ? 300 : undefined,
      overflow: "hidden",
      backgroundColor: activeTheme.surface,
    },
    companionImage: { width: "100%", height: "100%" },
    companionContent: {
      flex: 1,
      padding: theme.spacing.lg,
      gap: 12,
      justifyContent: "center",
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionKicker: {
      color: activeTheme.primaryDark,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    companionKicker: {
      color: "#FFE0BD",
    },
    sectionIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.safeSurface,
    },
    sectionTitle: {
      color: activeTheme.text,
      fontSize: 22,
      fontWeight: "900",
    },
    stack: {
      gap: 8,
    },
    verificationCard: {
      borderRadius: 24,
      backgroundColor: activeTheme.warmSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 8,
    },
    verificationTitle: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "800",
    },
    verificationBody: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    verifyButton: {
      alignSelf: "flex-start",
      minHeight: 42,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primary,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 7,
      marginTop: 6,
    },
    verifyButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
    verifyLockedPill: {
      alignSelf: "flex-start",
      minHeight: 38,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
    },
    verifyLockedText: {
      color: activeTheme.text,
      fontSize: 13,
      fontWeight: "700",
    },
    companionBody: {
      color: "rgba(255,255,255,0.78)",
      fontSize: 14,
      lineHeight: 21,
    },
    companionTitle: {
      color: "#FFFFFF",
      fontSize: isWideWeb ? 34 : 27,
      lineHeight: isWideWeb ? 40 : 33,
      fontWeight: "900",
    },
    companionActionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 4,
    },
    companionAction: {
      minHeight: 46,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      backgroundColor: "rgba(255,255,255,0.16)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },
    companionActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
    actionRow: {
      minHeight: 68,
      borderRadius: 22,
      backgroundColor: activeTheme.surfaceElevated,
      paddingHorizontal: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    actionLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    actionIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.safeSurface,
    },
    actionCopy: { flex: 1 },
    actionText: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "700",
    },
    actionHint: {
      color: activeTheme.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    toggleTrack: {
      width: 48,
      height: 28,
      borderRadius: 14,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: 3,
    },
    toggleTrackOn: {
      backgroundColor: activeTheme.primary,
      borderColor: activeTheme.primary,
    },
    toggleKnob: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: activeTheme.textMuted,
    },
    toggleKnobOn: {
      transform: [{ translateX: 20 }],
      backgroundColor: "#FFFFFF",
    },
    actionGrid: {
      gap: 10,
    },
    tileAction: {
      minHeight: 66,
      borderRadius: 22,
      backgroundColor: activeTheme.bg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      paddingHorizontal: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    tileIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.safeSurface,
    },
    tileText: {
      flex: 1,
      color: activeTheme.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "900",
    },
    logoutButton: {
      minHeight: 56,
      borderRadius: theme.radius.md,
      backgroundColor: activeTheme.secondaryAccent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    logoutText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
    },
    previewButton: {
      minHeight: 52,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: activeTheme.surface,
    },
    previewButtonText: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "700",
    },
  });
