/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "Private Chef",
  slug: "private-chef",
  owner: "toxicdev08",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "privatechef",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.tega.privatechef",
  },
  android: {
    package: "com.tega.privatechef",
    adaptiveIcon: {
      backgroundColor: "#F7EFE7",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-dev-client",
    "expo-notifications",
    "expo-apple-authentication",
    "@react-native-community/datetimepicker",
    [
      "@react-native-google-signin/google-signin",
      process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
        ? { iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME }
        : {},
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Allow $(PRODUCT_NAME) to use your location to find nearby cooks and neighborhoods.",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 560,
        resizeMode: "contain",
        backgroundColor: "#FBF6F0",
        dark: {
          image: "./assets/images/splash-icon.png",
          backgroundColor: "#121713",
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "c3bed50e-c32c-4036-b3be-92813480423c",
    },
  },
};

module.exports = config;
