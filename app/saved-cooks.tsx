import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import RoundedAvatar from "@/components/RoundedAvatar";
import { fetchSavedCooks, toggleSavedCook } from "@/lib/saved-cooks";
import type { CookDirectoryRecord } from "@/lib/cook-data";
import { getTheme, theme } from "@/theme/theme";

export default function SavedCooksScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [savedCooks, setSavedCooks] = useState<CookDirectoryRecord[] | null>(null);

  useEffect(() => {
    async function loadSavedCooks() {
      const nextSavedCooks = await fetchSavedCooks();
      setSavedCooks(nextSavedCooks);
    }

    void loadSavedCooks();
  }, []);

  async function handleRemoveSavedCook(cookId: string) {
    await toggleSavedCook(cookId);
    setSavedCooks((current) => (current ?? []).filter((cook) => cook.id !== cookId));
  }

  if (savedCooks === null) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading saved cooks...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.headerBlock}>
        <Text style={styles.title}>Saved cooks</Text>
        <Text style={styles.subtitle}>Keep your favorite cooks close so booking them again feels quick and easy.</Text>
      </View>

      {savedCooks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No saved cooks yet</Text>
          <Text style={styles.emptyBody}>When you heart a cook, they will show up here for quick access.</Text>
        </View>
      ) : (
        <View style={styles.stack}>
          {savedCooks.map((cook) => (
            <Pressable
              key={cook.id}
              style={styles.cookCard}
              onPress={() =>
                router.push({
                  pathname: "/cooks/[id]",
                  params: { id: cook.id },
                })
              }
            >
              <RoundedAvatar
                name={cook.name}
                photoUrl={cook.user.photoUrl}
                size={60}
                backgroundColor={activeTheme.accent}
              />
              <View style={styles.cookCopy}>
                <Text style={styles.cookName}>{cook.name}</Text>
                <Text numberOfLines={1} style={styles.cookMeta}>{cook.serviceAreaLabel}</Text>
                <Text numberOfLines={2} style={styles.cookBio}>{cook.headline}</Text>
              </View>
              <Pressable
                style={styles.heartButton}
                onPress={(event) => {
                  event.stopPropagation();
                  void handleRemoveSavedCook(cook.id);
                }}
              >
                <Ionicons name="heart" size={18} color={activeTheme.secondaryAccent} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.layout.screenTop,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    loadingScreen: {
      flex: 1,
      backgroundColor: activeTheme.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: { color: activeTheme.text, fontSize: 16, fontWeight: "700" },
    backButton: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
    backText: { color: activeTheme.text, fontSize: 15, fontWeight: "700" },
    headerBlock: { gap: 6 },
    title: { color: activeTheme.text, fontSize: 30, lineHeight: 34, fontWeight: "800" },
    subtitle: { color: activeTheme.textMuted, fontSize: 15, lineHeight: 23 },
    emptyCard: {
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: 6,
    },
    emptyTitle: { color: activeTheme.text, fontSize: 18, fontWeight: "800" },
    emptyBody: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    stack: { gap: theme.spacing.md },
    cookCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
    },
    cookCopy: { flex: 1, gap: 3 },
    cookName: { color: activeTheme.text, fontSize: 17, fontWeight: "800" },
    cookMeta: { color: activeTheme.primaryDark, fontSize: 13, fontWeight: "700" },
    cookBio: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20 },
    heartButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.bg,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
  });
