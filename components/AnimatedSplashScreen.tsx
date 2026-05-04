import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";

import { getTheme, theme } from "@/theme/theme";

type AnimatedSplashScreenProps = {
  onFinish: () => void;
};

const lightLogo = require("../assets/images/logo_light.png") as ImageSourcePropType;
const darkLogo = require("../assets/images/logo_dark.png") as ImageSourcePropType;

export default function AnimatedSplashScreen({
  onFinish,
}: AnimatedSplashScreenProps) {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const logoSource = colorScheme === "dark" ? darkLogo : lightLogo;

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoTranslateY = useRef(new Animated.Value(18)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1950),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleOpacity, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(logoTranslateY, {
          toValue: -10,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: -4,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        onFinish();
      }
    });

    return () => {
      animation.stop();
    };
  }, [
    logoOpacity,
    logoScale,
    logoTranslateY,
    onFinish,
    subtitleOpacity,
    subtitleTranslateY,
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }, { translateY: logoTranslateY }],
          },
        ]}
      >
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: subtitleOpacity,
            transform: [{ translateY: subtitleTranslateY }],
          },
        ]}
      >
        Homemade meals,{"\n"}prepared with care.
      </Animated.Text>
    </View>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: activeTheme.bg,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    glowTop: {
      position: "absolute",
      top: -120,
      right: -40,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: activeTheme.accentSoft,
      opacity: activeTheme.bg === "#121713" ? 0.35 : 0.95,
    },
    glowBottom: {
      position: "absolute",
      bottom: -100,
      left: -50,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: activeTheme.primary,
      opacity: activeTheme.bg === "#121713" ? 0.12 : 0.09,
    },
    logoWrap: {
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    logo: {
      width: 560,
      height: 280,
    },
    tagline: {
      position: "absolute",
      bottom: 102,
      color: activeTheme.textMuted,
      fontSize: 17,
      fontWeight: "600",
      textAlign: "center",
      letterSpacing: 0.2,
      lineHeight: 24,
      maxWidth: 180,
    },
  });
