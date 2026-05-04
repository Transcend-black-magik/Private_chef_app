import { ColorSchemeName } from "react-native";

export const lightTheme = {
  bg: "#FBF6F0",
  surface: "#FFFDF9",
  surfaceElevated: "#FFF8F1",
  warmSurface: "#FFF0E4",
  safeSurface: "#F4F4E8",
  focusSurface: "#EDF7E8",
  primary: "#6DBE45",
  primaryDark: "#4E9A2E",
  accent: "#FF8A4C",
  accentSoft: "#FFE1D1",
  secondaryAccent: "#FF6B6B",
  text: "#2B211C",
  textMuted: "#6E625B",
  border: "#E8DDD2",
  danger: "#D95C4F",
  shadow: "rgba(43, 33, 28, 0.08)",
};

export const darkTheme = {
  bg: "#121713",
  surface: "#1B231C",
  surfaceElevated: "#243026",
  warmSurface: "#33261F",
  safeSurface: "#283026",
  focusSurface: "#213125",
  primary: "#7ED957",
  primaryDark: "#5FB53D",
  accent: "#FF9A62",
  accentSoft: "#3A2A22",
  secondaryAccent: "#FF7F7F",
  text: "#F6F2EA",
  textMuted: "#C8BFB5",
  border: "#334236",
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
    sm: 12,
    md: 18,
    lg: 24,
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
