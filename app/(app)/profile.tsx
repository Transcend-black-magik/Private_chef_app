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
  { title: "Help and support", icon: "help-circle-outline", route: "/chats" },
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
        <RoundedAvatar name={name} photoUrl={photoUrl} size={86} backgroundColor={activeTheme.primary} />
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.role}>{role === "cook" ? "Cook account" : "Explorer account"}</Text>
        <Text style={styles.phone}>{email || "No email added yet"}</Text>
        <Text style={styles.phone}>{phone || "No phone added yet"}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.verificationCard}>
          <Text style={styles.verificationTitle}>Verification</Text>
          <Text style={styles.verificationBody}>
            {verificationStatus
              ? `Status: ${verificationStatus}. ${countryName ? `Country: ${countryName}.` : ""}`
              : "Your trust and safety review details will appear here."}
          </Text>
          {canVerifyCook ? (
            <Pressable style={styles.verifyButton} onPress={() => router.push("/cook-verification")}>
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
        <View style={styles.stack}>
          <Pressable style={styles.actionRow} onPress={() => void toggleReadReceipts()}>
            <View style={styles.actionLeft}>
              <Ionicons name="checkmark-done-outline" size={18} color={activeTheme.text} />
              <View>
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
          {profileActions.map((item) => (
            role === "cook" && item.title === "Saved cooks" ? null : (
            <Pressable
              key={item.title}
              style={styles.actionRow}
              onPress={() => router.push(item.route as never)}
            >
              <View style={styles.actionLeft}>
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={activeTheme.text}
                />
                <Text style={styles.actionText}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={activeTheme.textMuted} />
            </Pressable>
            )
          ))}
        </View>
      </View>

      <View style={styles.companionCard}>
        <Text style={styles.sectionTitle}>Companion mode</Text>
        <Text style={styles.companionBody}>
          Keep every recommendation, taste signal, and meal-decision tool together in one place.
        </Text>
        <View style={styles.stack}>
          {companionActions.map((item) => (
            <Pressable
              key={item.title}
              style={styles.actionRow}
              onPress={() => router.push(item.route as never)}
            >
              <View style={styles.actionLeft}>
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={activeTheme.text}
                />
                <Text style={styles.actionText}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={activeTheme.textMuted} />
            </Pressable>
          ))}
        </View>
      </View>

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
      maxWidth: isWideWeb ? 1040 : undefined,
      alignSelf: "center",
    },
    profileHero: {
      alignItems: "center",
      gap: 8,
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: 34,
      overflow: "hidden",
      backgroundColor: activeTheme.primaryDark,
      minHeight: 260,
      justifyContent: "center",
    },
    profileHeroImage: {
      ...StyleSheet.absoluteFillObject,
    },
    profileHeroShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.44)",
    },
    name: {
      color: "#FFFFFF",
      fontSize: 26,
      fontWeight: "900",
    },
    role: {
      color: "#FFE0BD",
      fontSize: 14,
      fontWeight: "800",
    },
    phone: {
      color: "rgba(255,255,255,0.84)",
      fontSize: 15,
    },
    infoCard: {
      backgroundColor: activeTheme.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    companionCard: {
      backgroundColor: activeTheme.safeSurface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    sectionTitle: {
      color: activeTheme.text,
      fontSize: 22,
      fontWeight: "800",
    },
    stack: {
      gap: 8,
    },
    verificationCard: {
      borderRadius: theme.radius.md,
      backgroundColor: activeTheme.warmSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      gap: 6,
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
      minHeight: 38,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primary,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
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
      color: activeTheme.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    actionRow: {
      minHeight: 56,
      borderRadius: theme.radius.md,
      backgroundColor: activeTheme.surfaceElevated,
      paddingHorizontal: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    actionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
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
