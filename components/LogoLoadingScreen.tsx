import { useEffect, useRef } from "react";
import { Animated, Image, Keyboard, Modal, StyleSheet, Text, useColorScheme, View } from "react-native";

import { getTheme, theme } from "@/theme/theme";

type LogoLoadingScreenProps = {
  title?: string;
  subtitle?: string;
  overlay?: boolean;
};

export default function LogoLoadingScreen({ title, subtitle, overlay = false }: LogoLoadingScreenProps) {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const pulse = useRef(new Animated.Value(0)).current;
  const logoSource =
    colorScheme === "dark"
      ? require("@/assets/images/logo_dark.png")
      : require("@/assets/images/logo_light.png");

  useEffect(() => {
    Keyboard.dismiss();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1050, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1050, useNativeDriver: true }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.04],
  });
  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1.18],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.26, 0.04],
  });

  const content = (
    <View
      style={[
        styles.screen,
        overlay ? styles.overlaySurface : null,
        {
          backgroundColor: overlay
            ? colorScheme === "dark"
              ? "rgba(16,20,15,0.72)"
              : "rgba(255,255,255,0.72)"
            : activeTheme.bg,
        },
      ]}
    >
      <View style={styles.loaderStage}>
        <Animated.View
          style={[
            styles.ring,
            {
              borderColor: activeTheme.primary,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
        <Animated.View style={[styles.logoPlate, { transform: [{ scale: logoScale }] }]}>
          <Image source={logoSource} resizeMode="contain" style={styles.logo} />
        </Animated.View>
      </View>
      {title ? <Text style={[styles.title, { color: activeTheme.text }]}>{title}</Text> : null}
      {title && subtitle ? <Text style={[styles.subtitle, { color: activeTheme.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );

  if (overlay) {
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => undefined}
      >
        {content}
      </Modal>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  overlaySurface: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  loaderStage: {
    width: 210,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 2,
  },
  logoPlate: {
    width: 174,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 210,
    height: 112,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 300,
  },
});
