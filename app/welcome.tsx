import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { markOnboardingSeen } from "@/lib/app-state";
import OnBoardingScreen from "@/onBoarding_screen/OnBoardingScreen";

export default function WelcomeScreen() {
  const params = useLocalSearchParams<{ step?: string }>();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    void markOnboardingSeen();

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <OnBoardingScreen
        onSignIn={() => router.replace("/signin")}
        onSignUp={(role) => router.replace({ pathname: "/signup", params: { role } })}
        initialStep={params.step === "choices" ? "choices" : "intro"}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
