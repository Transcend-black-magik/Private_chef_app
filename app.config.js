const { existsSync, readFileSync } = require("fs");

const androidGoogleServicesFile = "./firebase/google-services.json";
const iosGoogleServicesFile = "./firebase/GoogleService-Info.plist";
const googleIosUrlScheme =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME || readGoogleIosUrlScheme();

function readGoogleIosUrlScheme() {
  if (!existsSync(iosGoogleServicesFile)) {
    return undefined;
  }

  try {
    const plist = readFileSync(iosGoogleServicesFile, "utf8");
    const match = plist.match(
      /<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/,
    );

    return match?.[1];
  } catch {
    return undefined;
  }
}

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "cook_for_me",
  slug: "cook_for_me",
  owner: "toxicdev01",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "cookforme",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.tega.cookforme",
    ...(existsSync(iosGoogleServicesFile)
      ? { googleServicesFile: iosGoogleServicesFile }
      : {}),
  },
  android: {
    package: "com.tega.cookforme",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    ...(existsSync(androidGoogleServicesFile)
      ? { googleServicesFile: androidGoogleServicesFile }
      : {}),
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-dev-client",
    "expo-apple-authentication",
    "@react-native-community/datetimepicker",
    [
      "@react-native-google-signin/google-signin",
      googleIosUrlScheme ? { iosUrlScheme: googleIosUrlScheme } : {},
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
      projectId: "0bb2f636-e237-4e20-a7cb-63586a5fa53c",
    },
  },
};

module.exports = config;
