import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import {
  completeUserProfile,
  getPostAuthRoute,
  getVerificationDocumentPlaceholder,
} from "@/lib/auth-service";
import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { getCurrentUserRecord, type UserRole } from "@/lib/app-state";
import { detectLocationProfile, getDialCode } from "@/lib/location-phone";
import { getTheme, theme } from "@/theme/theme";

export default function AuthProfileScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const params = useLocalSearchParams<{ email?: string; role?: string }>();
  const inputRef = useRef<TextInput | null>(null);

  const [fullName, setFullName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [countryName, setCountryName] = useState("United States");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(true);
  const [error, setError] = useState("");

  const role: UserRole = params.role === "cook" ? "cook" : "explorer";
  const isCook = role === "cook";
  const documentPlaceholder = getVerificationDocumentPlaceholder(countryName);
  const canSubmit = Boolean(
    fullName.trim() &&
      phoneNumber.trim() &&
      addressLine1.trim() &&
      city.trim() &&
      region.trim(),
  );

  useEffect(() => {
    let cancelled = false;

    async function guardCompletedProfile() {
      const currentUser = await getCurrentUserRecord();

      if (!cancelled && currentUser?.profileComplete) {
        router.replace(getPostAuthRoute(currentUser.role));
      }
    }

    void guardCompletedProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 140);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function detectLocation() {
      try {
        const detected = await detectLocationProfile();

        if (!detected) {
          return;
        }

        setCountryCode(detected.countryCode);
        setCountryName(detected.countryName);
        setPhoneCountryCode(detected.dialCode || getDialCode(detected.countryCode));
        setCity(detected.locality || detected.city || "");
        setRegion(detected.region || "");
      } catch {
        // Keep defaults if location lookup is not available.
      } finally {
        setIsDetectingLocation(false);
      }
    }

    void detectLocation();
  }, []);

  async function handleContinue() {
    setIsSubmitting(true);
    setError("");

    const result = await completeUserProfile({
      email: params.email ?? "",
      name: fullName,
      phoneCountryCode,
      phoneNationalNumber: phoneNumber,
      role,
      countryCode,
      countryName,
      addressLine1,
      city,
      region,
      documentNumber: isCook ? "AUTO-VERIFIED" : "",
      documentType: documentPlaceholder,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace(getPostAuthRoute(role));
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
      >
        <View style={styles.heroGlow} />

        <View style={styles.intro}>
          <Text style={styles.kicker}>{isCook ? "Trust and safety" : "Finish setup"}</Text>
          <Text style={styles.title}>
            {isCook
              ? "Help explorers feel safe before your cook profile goes live."
              : "Tell us your full name, phone number, and address."}
          </Text>
          <Text style={styles.subtitle}>
            {isCook
              ? "We'll collect your contact, home address, and identity details before your cook profile goes live."
              : "We'll use this on your profile and for booking updates."}
          </Text>
        </View>

        <View style={styles.card}>
          <TextInput
            ref={inputRef}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
            placeholderTextColor={activeTheme.textMuted}
            autoCapitalize="words"
            textContentType="name"
            returnKeyType="next"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCodeBox}>
              <Text style={styles.countryCodeText}>{phoneCountryCode}</Text>
            </View>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Phone number"
              placeholderTextColor={activeTheme.textMuted}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              style={[styles.input, styles.phoneInput]}
            />
          </View>

          <Text style={styles.helperText}>
            {isDetectingLocation
              ? "Detecting your country and dialing code..."
              : `Detected country: ${countryName}`}
          </Text>

          <Text style={styles.fieldLabel}>Home address</Text>
          <TextInput
            value={addressLine1}
            onChangeText={setAddressLine1}
            placeholder="Street address"
            placeholderTextColor={activeTheme.textMuted}
            autoCapitalize="words"
            style={styles.input}
          />
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="City"
            placeholderTextColor={activeTheme.textMuted}
            autoCapitalize="words"
            style={styles.input}
          />
          <TextInput
            value={region}
            onChangeText={setRegion}
            placeholder="State / region"
            placeholderTextColor={activeTheme.textMuted}
            autoCapitalize="words"
            style={styles.input}
          />

          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Platform trust</Text>
            <Text style={styles.noticeText}>
              {isCook
                ? "Your cook profile will receive a platform trust badge after these required details are saved."
                : "You can finish sign-up now. Explorer trust is based on your completed profile and in-app activity."}
            </Text>
          </View>

          {isCook ? (
            <Text style={styles.helperText}>
              Government ID verification is disabled for now. A compliant provider can be added later when the production budget and review process are ready.
            </Text>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, (!canSubmit || isSubmitting) && styles.buttonDisabled]}
            disabled={!canSubmit || isSubmitting}
            onPress={() => void handleContinue()}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? "Saving..." : isCook ? "Submit details" : "Continue"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {isSubmitting ? (
        <AuthProcessingScreen
          title={isCook ? "Saving cook profile" : "Finishing your setup"}
          subtitle={
            isCook
              ? "We're saving your cook profile details and applying platform trust."
              : "We're saving your profile and opening your home screen."
          }
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: activeTheme.bg,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.layout.screenTop,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    heroGlow: {
      position: "absolute",
      top: -90,
      right: -40,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: activeTheme.accentSoft,
      opacity: activeTheme.bg === "#121713" ? 0.25 : 0.9,
    },
    intro: {
      gap: theme.spacing.xs,
    },
    kicker: {
      color: activeTheme.primaryDark,
      fontSize: 14,
      fontWeight: "700",
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
      fontSize: 16,
      lineHeight: 24,
      maxWidth: 350,
    },
    card: {
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    fieldLabel: {
      color: activeTheme.text,
      fontSize: 14,
      fontWeight: "700",
    },
    phoneRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
    countryCodeBox: {
      minWidth: 82,
      minHeight: 58,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.bg,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
    },
    countryCodeText: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "700",
    },
    input: {
      backgroundColor: activeTheme.bg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 16,
      color: activeTheme.text,
      fontSize: 16,
    },
    phoneInput: {
      flex: 1,
    },
    noticeCard: {
      backgroundColor: activeTheme.safeSurface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      gap: 6,
    },
    noticeTitle: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "800",
    },
    noticeText: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    helperText: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    errorText: {
      color: activeTheme.danger,
      fontSize: 13,
      lineHeight: 20,
    },
    primaryButton: {
      backgroundColor: activeTheme.primary,
      minHeight: 56,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
    },
    buttonDisabled: {
      opacity: 0.45,
    },
  });
