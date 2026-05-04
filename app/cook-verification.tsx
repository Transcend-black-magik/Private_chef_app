import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";

import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { getCurrentUserRecord, type StoredUser } from "@/lib/app-state";
import { getVerificationActionCopy, submitCookIdentityVerification } from "@/lib/verification-service";
import { getTheme, theme } from "@/theme/theme";

export default function CookVerificationScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);

  const [user, setUser] = useState<StoredUser | null>(null);
  const [documentUri, setDocumentUri] = useState("");
  const [documentBase64, setDocumentBase64] = useState("");
  const [selfieUri, setSelfieUri] = useState("");
  const [selfieBase64, setSelfieBase64] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUserRecord();

      if (!currentUser) {
        router.replace("/signin");
        return;
      }

      if (currentUser.role !== "cook") {
        router.replace("/profile");
        return;
      }

      setUser(currentUser);
    }

    void loadUser();
  }, []);

  async function pickImage(type: "document" | "selfie") {
    setError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError("Photo access was denied. Allow photo access to continue verification.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: type === "selfie" ? [1, 1] : [4, 3],
      quality: 0.9,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    if (type === "document") {
      setDocumentUri(result.assets[0].uri);
      setDocumentBase64(result.assets[0].base64 || "");
      return;
    }

    setSelfieUri(result.assets[0].uri);
    setSelfieBase64(result.assets[0].base64 || "");
  }

  async function handleVerify() {
    if (!documentBase64 || !selfieBase64) {
      setError("Add both your ID image and your selfie before you continue.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const nextUser = await submitCookIdentityVerification({
        documentImageBase64: documentBase64,
        selfieImageBase64: selfieBase64,
      });

      setUser(nextUser);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Identity verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading verification...</Text>
      </View>
    );
  }

  const statusCopy = getVerificationActionCopy(user);
  const status = user.cookVerification?.status || "not_started";

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>Cook verification</Text>
          <Text style={styles.title}>{statusCopy.title}</Text>
          <Text style={styles.subtitle}>{statusCopy.body}</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Current status</Text>
          <Text style={styles.statusValue}>{status.replace(/_/g, " ")}</Text>
          {user.cookVerification?.verifiedAt ? (
            <Text style={styles.statusBody}>Verified at {new Date(user.cookVerification.verifiedAt).toLocaleString()}</Text>
          ) : null}
          {user.cookVerification?.referenceId ? (
            <Text style={styles.statusBody}>Reference: {user.cookVerification.referenceId}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Upload your ID</Text>
          <Text style={styles.sectionBody}>
            Submit a clear image of your government ID. This is used for the trust review on your cook profile.
          </Text>
          <Pressable
            style={[styles.imagePickerCard, statusCopy.locked && styles.imagePickerCardDisabled]}
            onPress={() => void pickImage("document")}
            disabled={statusCopy.locked}
          >
            {documentUri ? (
              <Image source={documentUri} style={styles.previewImage} contentFit="cover" />
            ) : (
              <Text style={styles.imagePickerText}>Choose ID image</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Upload a selfie</Text>
          <Text style={styles.sectionBody}>
            This is matched against the face on your ID so explorers can trust that the person cooking is really you.
          </Text>
          <Pressable
            style={[styles.imagePickerCard, statusCopy.locked && styles.imagePickerCardDisabled]}
            onPress={() => void pickImage("selfie")}
            disabled={statusCopy.locked}
          >
            {selfieUri ? (
              <Image source={selfieUri} style={styles.previewImage} contentFit="cover" />
            ) : (
              <Text style={styles.imagePickerText}>Choose selfie image</Text>
            )}
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, statusCopy.locked && styles.primaryButtonDisabled]}
          onPress={() => void handleVerify()}
          disabled={statusCopy.locked}
        >
          <Text style={styles.primaryButtonText}>
            {status === "verified" ? "Verification locked" : status === "pending_review" ? "Under review" : "Start verification"}
          </Text>
        </Pressable>
      </ScrollView>

      {isSubmitting ? (
        <AuthProcessingScreen
          title="Running identity verification"
          subtitle="We are matching your selfie with your ID and saving the result to your cook profile."
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.layout.screenTop,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    loadingScreen: {
      flex: 1,
      backgroundColor: activeTheme.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: { color: activeTheme.text, fontSize: 16, fontWeight: "700" },
    backButton: { alignSelf: "flex-start" },
    backText: { color: activeTheme.text, fontSize: 15, fontWeight: "700" },
    headerBlock: { gap: 8 },
    eyebrow: { color: activeTheme.primaryDark, fontSize: 13, fontWeight: "800", textTransform: "uppercase" },
    title: { color: activeTheme.text, fontSize: 31, lineHeight: 38, fontWeight: "800" },
    subtitle: { color: activeTheme.textMuted, fontSize: 15, lineHeight: 23 },
    statusCard: {
      backgroundColor: activeTheme.safeSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: 6,
    },
    statusTitle: { color: activeTheme.text, fontSize: 15, fontWeight: "800" },
    statusValue: { color: activeTheme.primaryDark, fontSize: 20, fontWeight: "800", textTransform: "capitalize" },
    statusBody: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20 },
    card: {
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    sectionTitle: { color: activeTheme.text, fontSize: 18, fontWeight: "800" },
    sectionBody: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    imagePickerCard: {
      minHeight: 170,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surfaceElevated,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    imagePickerCardDisabled: { opacity: 0.6 },
    imagePickerText: { color: activeTheme.text, fontSize: 15, fontWeight: "700" },
    previewImage: { width: "100%", height: "100%" },
    errorText: { color: activeTheme.danger, fontSize: 13, lineHeight: 20 },
    primaryButton: {
      minHeight: 56,
      borderRadius: theme.radius.md,
      backgroundColor: activeTheme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonDisabled: { opacity: 0.65 },
    primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  });
