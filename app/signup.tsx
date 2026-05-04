import { useState } from "react";
import {
  Keyboard,
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
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import {
  getGoogleAuthConfigError,
  getPostAuthRoute,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/auth-service";
import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { type UserRole } from "@/lib/app-state";
import { getTheme, theme } from "@/theme/theme";

export default function SignUpScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const params = useLocalSearchParams<{ role?: string }>();
  const role: UserRole = params.role === "cook" ? "cook" : "explorer";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingCopy, setProcessingCopy] = useState({
    title: "Setting up your account",
    subtitle: "We're creating your login and preparing the next setup steps.",
  });
  const [error, setError] = useState("");

  async function beginAuthTransition() {
    Keyboard.dismiss();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async function handleEmailSignUp() {
    if (password.trim() !== confirmPassword.trim()) {
      setError("Your passwords do not match yet.");
      return;
    }

    setIsSubmitting(true);
    setProcessingCopy({
      title: "Setting up your account",
      subtitle: "We're creating your login and preparing the next setup steps.",
    });
    setError("");
    await beginAuthTransition();

    try {
      const result = await signUpWithEmail({
        email,
        password,
        role,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.needsProfile) {
        router.replace({
          pathname: "/auth-profile",
          params: { email: result.user.email, role: result.user.role },
        });
        return;
      }

      router.replace(getPostAuthRoute(result.user.role));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We could not create your account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    setIsSubmitting(true);
    setProcessingCopy({
      title: "Starting your account",
      subtitle: "We're waiting for Google, then we'll collect the details your profile needs.",
    });
    setError("");
    await beginAuthTransition();

    try {
      const result = await signInWithGoogle(role);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.needsProfile) {
        router.replace({
          pathname: "/auth-profile",
          params: { email: result.user.email, role: result.user.role },
        });
        return;
      }

      router.replace(getPostAuthRoute(result.user.role));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We could not complete Google sign-up.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAppleSignUp() {
    Keyboard.dismiss();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setError("Apple sign-in will be added next.");
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
      >
        <View style={styles.heroGlow} />
        <View style={styles.heroGlowSecondary} />

        <View style={styles.intro}>
          <Text style={styles.kicker}>Create account</Text>
          <Text style={styles.title}>
            {role === "cook" ? "Set up your cook account." : "Set up your explorer account."}
          </Text>
          <Text style={styles.subtitle}>
            Start with email or social sign-in, then we&apos;ll save the details your profile needs.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Email and password</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={activeTheme.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            style={styles.input}
          />
          <View style={styles.inputWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Create password"
              placeholderTextColor={activeTheme.textMuted}
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              style={[styles.input, styles.inputWithIcon]}
            />
            <Pressable
              style={styles.inputIconButton}
              onPress={() => setShowPassword((value) => !value)}
              hitSlop={10}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={activeTheme.textMuted}
              />
            </Pressable>
          </View>
          <View style={styles.inputWrap}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor={activeTheme.textMuted}
              secureTextEntry={!showConfirmPassword}
              textContentType="newPassword"
              style={[styles.input, styles.inputWithIcon]}
            />
            <Pressable
              style={styles.inputIconButton}
              onPress={() => setShowConfirmPassword((value) => !value)}
              hitSlop={10}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={activeTheme.textMuted}
              />
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            disabled={isSubmitting}
            onPress={() => void handleEmailSignUp()}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.socialButton} onPress={() => void handleGoogleSignUp()}>
            <Ionicons name="logo-google" size={18} color={activeTheme.text} />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </Pressable>

          {Platform.OS === "ios" ? (
            <Pressable style={styles.socialButton} onPress={() => void handleAppleSignUp()}>
              <Ionicons name="logo-apple" size={18} color={activeTheme.text} />
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </Pressable>
          ) : null}

          {!getGoogleAuthConfigError() ? null : (
            <Text style={styles.helperText}>{getGoogleAuthConfigError()}</Text>
          )}
          <Text style={styles.helperText}>Phone sign-in is coming soon.</Text>

          <Pressable
            style={styles.switchLink}
            onPress={() => router.replace({ pathname: "/welcome", params: { step: "choices" } })}
          >
            <Text style={styles.switchLinkText}>Go back</Text>
          </Pressable>
        </View>
      </ScrollView>
      {isSubmitting ? (
        <AuthProcessingScreen title={processingCopy.title} subtitle={processingCopy.subtitle} />
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
    heroGlowSecondary: {
      position: "absolute",
      bottom: 40,
      left: -90,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor:
        activeTheme.bg === "#121713" ? activeTheme.surfaceElevated : activeTheme.accentSoft,
      opacity: activeTheme.bg === "#121713" ? 0.5 : 0.4,
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
      maxWidth: 330,
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
    sectionTitle: {
      color: activeTheme.text,
      fontSize: 18,
      fontWeight: "800",
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
    inputWrap: {
      position: "relative",
    },
    inputWithIcon: {
      paddingRight: 52,
    },
    inputIconButton: {
      position: "absolute",
      right: 14,
      top: 0,
      bottom: 0,
      justifyContent: "center",
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
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: activeTheme.border,
    },
    dividerText: {
      color: activeTheme.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    socialButton: {
      minHeight: 54,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
      backgroundColor: activeTheme.bg,
    },
    socialButtonText: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "700",
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
    switchLink: {
      alignItems: "center",
      paddingTop: 6,
    },
    switchLinkText: {
      color: activeTheme.accent,
      fontSize: 15,
      fontWeight: "700",
    },
  });
