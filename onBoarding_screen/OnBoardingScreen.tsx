import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";

import { UserRole } from "@/lib/app-state";
import { getTheme, theme } from "@/theme/theme";

const lightLogo = require("../assets/images/logo_light.png");
const darkLogo = require("../assets/images/logo_dark.png");

type OnBoardingScreenProps = {
  onSignIn: () => void;
  onSignUp: (role: UserRole) => void;
  initialStep?: "intro" | "choices";
};

const SLIDER_KNOB_SIZE = 50;
const SLIDER_HORIZONTAL_PADDING = 10;

export default function OnBoardingScreen({
  onSignIn,
  onSignUp,
  initialStep = "intro",
}: OnBoardingScreenProps) {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const logoSource = colorScheme === "dark" ? darkLogo : lightLogo;
  const { width } = useWindowDimensions();
  const [showChoices, setShowChoices] = useState(initialStep === "choices");
  const sliderX = useRef(new Animated.Value(0)).current;
  const introTranslateX = useRef(new Animated.Value(initialStep === "choices" ? -32 : 0)).current;
  const introOpacity = useRef(new Animated.Value(initialStep === "choices" ? 0 : 1)).current;
  const choicesTranslateX = useRef(new Animated.Value(initialStep === "choices" ? 0 : 32)).current;
  const choicesOpacity = useRef(new Animated.Value(initialStep === "choices" ? 1 : 0)).current;

  const sliderTravel = Math.max(240, Math.min(width - theme.spacing.lg * 2 - 16, 360));
  const knobMaxOffset = sliderTravel - SLIDER_KNOB_SIZE - SLIDER_HORIZONTAL_PADDING * 2;

  const resetSlider = () => {
    Animated.spring(sliderX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  };

  const completeSlide = () => {
    Animated.timing(sliderX, {
      toValue: knobMaxOffset,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      Animated.parallel([
        Animated.timing(introTranslateX, {
          toValue: -32,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(introOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(choicesTranslateX, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(choicesOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowChoices(true);
        sliderX.setValue(0);
      });
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 6 && Math.abs(gestureState.dy) < 12,
        onPanResponderMove: (_, gestureState) => {
          const nextValue = Math.max(0, Math.min(gestureState.dx, knobMaxOffset));
          sliderX.setValue(nextValue);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > knobMaxOffset * 0.7) {
            completeSlide();
            return;
          }

          resetSlider();
        },
        onPanResponderTerminate: resetSlider,
      }),
    [knobMaxOffset],
  ); 

  return (
    <View style={styles.container}>
      <View style={styles.heroGlow} />

      <View style={styles.content}>
        <Image source={logoSource} style={styles.badgeImage} resizeMode="cover" />

        {!showChoices ? (
          <Animated.View
            style={{
              gap: theme.spacing.lg,
              opacity: introOpacity,
              transform: [{ translateX: introTranslateX }],
            }}
          >
            <Text style={styles.title}>Homemade meals, prepared with care.</Text>
            <Text style={styles.subtitle}>
              Discover trusted home cooks, comforting dishes, and a warmer way to eat
              well.
            </Text>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconPlate}>
                  <View style={styles.iconLeaf} />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardEyebrow}>Fresh picks nearby</Text>
                  <Text style={styles.cardTitle}>Jollof rice, egusi, soups, and more</Text>
                </View>
              </View>

              <View style={styles.featureRow}>
                <View style={styles.featurePill}>
                  <Text style={styles.featureText}>Trusted cooks</Text>
                </View>
                <View style={styles.featurePill}>
                  <Text style={styles.featureText}>Fast discovery</Text>
                </View>
                <View style={styles.featurePillAccent}>
                  <Text style={styles.featureTextAccent}>Warm delivery</Text>
                </View>
              </View>
            </View>

            <View style={styles.sliderSection}>
              <View style={[styles.sliderTrack, { width: sliderTravel }]}>
                <Text style={styles.sliderLabel}>Get started</Text>
                <Animated.View
                  style={[
                    styles.sliderKnob,
                    {
                      transform: [{ translateX: sliderX }],
                    },
                  ]}
                  {...panResponder.panHandlers}
                >
                  <Text style={styles.sliderKnobArrow}>{">"}</Text>
                </Animated.View>
              </View>
              <Text style={styles.sliderHint}>Slide to continue</Text>
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            style={{
              gap: theme.spacing.lg,
              opacity: choicesOpacity,
              transform: [{ translateX: choicesTranslateX }],
            }}
          >
            <Text style={styles.title}>Choose how you want to continue.</Text>
            <Text style={styles.subtitle}>
              Start exploring home-cooked meals or set up your cook profile and begin
              receiving requests.
            </Text>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconPlate}>
                  <View style={styles.iconLeaf} />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardEyebrow}>Your next step</Text>
                  <Text style={styles.cardTitle}>Pick the account that fits your goal today</Text>
                </View>
              </View>

              <View style={styles.featureRow}>
                <View style={styles.featurePill}>
                  <Text style={styles.featureText}>Explorer access</Text>
                </View>
                <View style={styles.featurePill}>
                  <Text style={styles.featureText}>Cook verification</Text>
                </View>
                <View style={styles.featurePillAccent}>
                  <Text style={styles.featureTextAccent}>Safer setup</Text>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable style={styles.primaryButton} onPress={() => onSignUp("explorer")}>
                <Text style={styles.primaryButtonText}>Start exploring</Text>
              </Pressable>

              <Pressable style={styles.secondaryButton} onPress={() => onSignUp("cook")}>
                <Text style={styles.secondaryButtonText}>Become a home cook</Text>
              </Pressable>

              <Pressable style={styles.signInLink} onPress={onSignIn}>
                <Text style={styles.signInText}>Already have an account? Sign in</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: activeTheme.bg,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xxl + 16,
      paddingBottom: theme.spacing.xl,
      justifyContent: "space-between",
    },
    heroGlow: {
      position: "absolute",
      top: -80,
      right: -40,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: activeTheme.accentSoft,
      opacity: colorSchemeOpacity(activeTheme.bg),
    },
    content: {
      flex: 1,
      justifyContent: "center",
      gap: theme.spacing.lg,
    },
    badgeImage: {
      marginLeft: -80,
      width: 250,
      height: 100,
    },
    title: {
      color: activeTheme.text,
      fontSize: 38,
      lineHeight: 48,
      fontWeight: "800",
      maxWidth: 320,
    },
    subtitle: {
      color: activeTheme.textMuted,
      fontSize: 17,
      lineHeight: 26,
      maxWidth: 340,
    },
    card: {
      backgroundColor: activeTheme.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
      gap: theme.spacing.md,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    iconPlate: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: activeTheme.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    iconLeaf: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: activeTheme.primary,
      transform: [{ rotate: "35deg" }],
    },
    cardHeaderText: {
      flex: 1,
      gap: 4,
    },
    cardEyebrow: {
      color: activeTheme.primaryDark,
      fontSize: 13,
      fontWeight: "700",
    },
    cardTitle: {
      color: activeTheme.text,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "700",
    },
    featureRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    featurePill: {
      backgroundColor: activeTheme.bg,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    featurePillAccent: {
      backgroundColor: activeTheme.accentSoft,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
    },
    featureText: {
      color: activeTheme.textMuted,
      fontSize: 14,
      fontWeight: "600",
    },
    featureTextAccent: {
      color: activeTheme.accent,
      fontSize: 14,
      fontWeight: "700",
    },
    sliderSection: {
      gap: theme.spacing.sm,
      alignItems: "center",
      marginTop: theme.spacing.xs,
    },
    sliderTrack: {
      height: 68,
      borderRadius: 34,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      justifyContent: "center",
      paddingHorizontal: SLIDER_HORIZONTAL_PADDING,
      overflow: "hidden",
    },
    sliderLabel: {
      color: activeTheme.text,
      fontSize: 16,
      fontWeight: "800",
      textAlign: "center",
    },
    sliderKnob: {
      position: "absolute",
      left: SLIDER_HORIZONTAL_PADDING,
      width: SLIDER_KNOB_SIZE,
      height: SLIDER_KNOB_SIZE,
      borderRadius: 25,
      backgroundColor: activeTheme.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    sliderKnobArrow: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "700",
      marginTop: -2,
    },
    sliderHint: {
      color: activeTheme.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    actions: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
    },
    primaryButton: {
      backgroundColor: activeTheme.primary,
      paddingVertical: 18,
      borderRadius: theme.radius.md,
      alignItems: "center",
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
    },
    secondaryButton: {
      backgroundColor: activeTheme.surface,
      borderColor: activeTheme.border,
      borderWidth: 1,
      paddingVertical: 18,
      borderRadius: theme.radius.md,
      alignItems: "center",
    },
    secondaryButtonText: {
      color: activeTheme.text,
      fontSize: 16,
      fontWeight: "700",
    },
    signInLink: {
      alignItems: "center",
      paddingTop: 6,
      alignSelf: "center",
      marginTop: theme.spacing.xs,
    },
    signInText: {
      color: activeTheme.accent,
      fontSize: 15,
      fontWeight: "700",
    },
  });

function colorSchemeOpacity(backgroundColor: string) {
  return backgroundColor === "#121713" ? 0.22 : 0.9;
}
