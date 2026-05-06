import { ColorSchemeName } from "react-native";

export const lightTheme = {
  bg: "#FFFFFF",
  surface: "#FFFDF7",
  surfaceElevated: "#F8F3E6",
  warmSurface: "#FFF5D5",
  safeSurface: "#EAF4D9",
  focusSurface: "#E8F1EF",
  primary: "#4D694E",
  primaryDark: "#4D694E",
  accent: "#4D694E",
  accentSoft: "#EAF4D9",
  secondaryAccent: "#E94B5F",
  text: "#171713",
  textMuted: "#756F62",
  border: "#E6DFD0",
  danger: "#C94A3C",
  shadow: "rgba(35, 31, 24, 0.12)",
};

export const darkTheme = {
  bg: "#0E1116",
  surface: "#171C24",
  surfaceElevated: "#202733",
  warmSurface: "#26211C",
  safeSurface: "#1B232C",
  focusSurface: "#182129",
  primary: "#AFCB8F",
  primaryDark: "#AFCB8F",
  accent: "#AFCB8F",
  accentSoft: "#2B1F18",
  secondaryAccent: "#FF6D7E",
  text: "#FFF9EA",
  textMuted: "#C8C0AE",
  border: "#2B3442",
  danger: "#FF7E6B",
  shadow: "rgba(0, 0, 0, 0.24)",
};

export const theme = {
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 26,
    pill: 999,
  },
  layout: {
    screenTop: 56,
  },
};

export type AppTheme = typeof lightTheme;

export function getTheme(colorScheme: ColorSchemeName): AppTheme {
  return colorScheme === "dark" ? darkTheme : lightTheme;
}
