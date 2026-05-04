import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import RoundedAvatar from "@/components/RoundedAvatar";
import { clearSession, getCurrentUserRecord, getSession, getUserByEmail } from "@/lib/app-state";
import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { getTheme, theme } from "@/theme/theme";

const profileActions = [
  { title: "Saved cooks", icon: "heart-outline", route: "/saved-cooks" },
  { title: "Meal companion", icon: "sparkles-outline", route: "/companion-preferences" },
  { title: "Home address", icon: "home-outline", route: "/complete-profile" },
  { title: "Payment method", icon: "card-outline", route: "/bookings" },
  { title: "Help and support", icon: "help-circle-outline", route: "/chats" },
];

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [name, setName] = useState("Friend");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("explorer");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [countryName, setCountryName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

      if (storedUser?.countryName) {
        setCountryName(storedUser.countryName);
      }

      if (storedUser?.photoUrl) {
        setPhotoUrl(storedUser.photoUrl);
      }

      if (storedUser?.cookVerification?.status) {
        setVerificationStatus(storedUser.cookVerification.status.replace(/_/g, " "));
      }
    }

    void loadSession();
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHero}>
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
        </View>
        <View style={styles.stack}>
          {profileActions.map((item) => (
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
    profileHero: {
      alignItems: "center",
      gap: 8,
      paddingVertical: theme.spacing.lg,
    },
    name: {
      color: activeTheme.text,
      fontSize: 26,
      fontWeight: "800",
    },
    role: {
      color: activeTheme.primaryDark,
      fontSize: 14,
      fontWeight: "700",
    },
    phone: {
      color: activeTheme.textMuted,
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
