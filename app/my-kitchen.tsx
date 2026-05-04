import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";

import { getTheme, theme } from "@/theme/theme";

const devices = [
  { name: "Viking Oven", status: "Pre heating", icon: "flame-outline" as const },
  { name: "Instant Pot Pro Plus", status: "Connected", icon: "timer-outline" as const },
  { name: "Kenwood Chef XL", status: "Ready", icon: "restaurant-outline" as const },
];

export default function MyKitchenScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [temperature, setTemperature] = useState(180);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <View style={styles.header}>
        <Text style={styles.title}>My Kitchen</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton}>
            <Ionicons name="settings-outline" size={18} color={activeTheme.text} />
          </Pressable>
          <Pressable style={[styles.iconButton, styles.darkIconButton]} onPress={() => router.back()}>
            <Ionicons name="add" size={19} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.deviceStack}>
        {devices.map((device) => (
          <View key={device.name} style={styles.deviceCard}>
            <View style={styles.deviceTop}>
              <Ionicons name={device.icon} size={20} color={activeTheme.text} />
              <Ionicons name="ellipsis-horizontal" size={18} color={activeTheme.textMuted} />
            </View>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={[styles.deviceStatus, device.status === "Pre heating" && styles.warmingStatus]}>
              {device.status}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.temperaturePanel}>
        <View style={styles.temperatureTop}>
          <Text style={styles.panelTitle}>Temperature</Text>
          <Text style={styles.unitText}>°C</Text>
        </View>
        <View style={styles.dial}>
          <View style={styles.dialArc} />
          <Text style={styles.temperatureText}>{temperature}°C</Text>
        </View>
        <View style={styles.presets}>
          {[150, 180, 200, 220, 250].map((value) => (
            <Pressable key={value} style={styles.preset} onPress={() => setTemperature(value)}>
              <Text style={styles.presetText}>{value}°</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.stepper}>
          <Pressable style={styles.stepButton} onPress={() => setTemperature((value) => Math.max(50, value - 5))}>
            <Text style={styles.stepText}>-</Text>
          </Pressable>
          <Pressable style={styles.stepButton} onPress={() => setTemperature((value) => Math.min(300, value + 5))}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.actionRow}>
          <Pressable style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.confirmButton}>
            <Text style={styles.confirmText}>Confirm</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#ECEDE6" },
    content: { padding: theme.spacing.lg, paddingTop: theme.layout.screenTop, gap: theme.spacing.lg },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    title: { color: activeTheme.text, fontSize: 24, fontWeight: "900" },
    headerActions: { flexDirection: "row", gap: 10 },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },
    darkIconButton: { backgroundColor: "#303030" },
    deviceStack: { gap: 12 },
    deviceCard: {
      minHeight: 116,
      borderRadius: 18,
      backgroundColor: "#FFFFFF",
      padding: theme.spacing.md,
      gap: 8,
    },
    deviceTop: { flexDirection: "row", justifyContent: "space-between" },
    deviceName: { color: activeTheme.text, fontSize: 16, fontWeight: "800" },
    deviceStatus: {
      alignSelf: "flex-start",
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.safeSurface,
      color: activeTheme.primaryDark,
      paddingHorizontal: 10,
      paddingVertical: 5,
      fontSize: 12,
      fontWeight: "900",
    },
    warmingStatus: { backgroundColor: activeTheme.accent, color: "#FFFFFF" },
    temperaturePanel: {
      borderRadius: 28,
      backgroundColor: "#5B5752",
      padding: theme.spacing.md,
      gap: 12,
    },
    temperatureTop: { flexDirection: "row", justifyContent: "space-between", padding: theme.spacing.sm },
    panelTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
    unitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
    dial: {
      height: 270,
      borderRadius: 24,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },
    dialArc: {
      position: "absolute",
      width: 170,
      height: 170,
      borderRadius: 85,
      borderWidth: 14,
      borderColor: "#E8E8E2",
      borderTopColor: activeTheme.primary,
      transform: [{ rotate: "35deg" }],
    },
    temperatureText: { color: "#111111", fontSize: 42, fontWeight: "500" },
    presets: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
      backgroundColor: "#FFFFFF",
      padding: theme.spacing.sm,
    },
    preset: {
      flex: 1,
      minHeight: 34,
      borderRadius: 17,
      backgroundColor: "#E8E8E2",
      alignItems: "center",
      justifyContent: "center",
    },
    presetText: { color: "#55524E", fontSize: 12, fontWeight: "800" },
    stepper: { flexDirection: "row", gap: 1 },
    stepButton: {
      flex: 1,
      minHeight: 48,
      backgroundColor: "#F5F5F1",
      alignItems: "center",
      justifyContent: "center",
    },
    stepText: { color: "#111111", fontSize: 24, fontWeight: "600" },
    actionRow: { flexDirection: "row", gap: 4 },
    cancelButton: {
      flex: 1,
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: "#D8D6D2",
      alignItems: "center",
      justifyContent: "center",
    },
    confirmButton: {
      flex: 1,
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: activeTheme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelText: { color: "#111111", fontSize: 14, fontWeight: "800" },
    confirmText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  });
