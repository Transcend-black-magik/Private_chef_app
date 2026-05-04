import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";

import RoundedAvatar from "@/components/RoundedAvatar";
import { getCookById, type CookDirectoryRecord } from "@/lib/cook-data";
import { getCookImage } from "@/lib/food-visuals";
import { isCookSaved, toggleSavedCook } from "@/lib/saved-cooks";
import { getTheme, theme } from "@/theme/theme";

export default function CookDetailScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const params = useLocalSearchParams<{ id?: string }>();
  const [cook, setCook] = useState<CookDirectoryRecord | null | undefined>(undefined);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadCook() {
      const [nextCook, nextSaved] = await Promise.all([
        getCookById(params.id ?? ""),
        params.id ? isCookSaved(params.id) : Promise.resolve(false),
      ]);

      setCook(nextCook);
      setIsSaved(nextSaved);
    }

    void loadCook();
  }, [params.id]);

  async function handleSave() {
    if (!cook || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const nextSaved = await toggleSavedCook(cook.id);
      setIsSaved(nextSaved.includes(cook.id));
    } finally {
      setIsSaving(false);
    }
  }

  if (cook === undefined) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyTitle}>Loading chef profile...</Text>
      </View>
    );
  }

  if (!cook) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyTitle}>Chef profile not found.</Text>
        <Pressable style={styles.orderButton} onPress={() => router.back()}>
          <Text style={styles.orderButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Pressable style={[styles.roundIcon, styles.backButton]} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
      </Pressable>
      <Pressable style={[styles.roundIcon, styles.moreButton]} onPress={() => void handleSave()}>
        <Ionicons name={isSaved ? "heart" : "ellipsis-horizontal"} size={21} color="#FFFFFF" />
      </Pressable>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.hero}>
          <Image source={getCookImage(cook.id.length + cook.name.length)} style={styles.heroImage} contentFit="cover" />
          <View style={styles.heroShade} />
          <Text style={styles.accountTitle}>Account</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <RoundedAvatar
              name={cook.name}
              photoUrl={cook.user.photoUrl}
              size={58}
              backgroundColor={activeTheme.accent}
            />
            <View style={styles.profileCopy}>
              <View style={styles.nameRow}>
                <Text numberOfLines={1} style={styles.name}>{cook.name}</Text>
                {cook.verified ? <Ionicons name="checkmark-circle" size={16} color="#39A7FF" /> : null}
              </View>
              <Text style={styles.roleText}>Professional Chef</Text>
            </View>
            <Pressable
              style={styles.orderButton}
              onPress={() =>
                router.push({
                  pathname: "/booking-request",
                  params: { cookId: cook.id },
                })
              }
            >
              <Text style={styles.orderButtonText}>Order</Text>
            </Pressable>
          </View>

          <Text style={styles.bioText}>
            {cook.bio} <Text style={styles.readMoreText}>Read more</Text>
          </Text>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={15} color="#FFAA26" />
              <Text style={styles.statStrong}>4.7</Text>
              <Text style={styles.statMuted}>(311 reviews)</Text>
            </View>
            <View style={styles.addButton}>
              <Ionicons name="add" size={19} color="#FF9B31" />
            </View>
            <View style={styles.statItem}>
              <Ionicons name="restaurant" size={15} color="#FF9B31" />
              <Text style={styles.statStrong}>{cook.yearsExperience} years</Text>
            </View>
          </View>
        </View>

        <View style={styles.reviewsHeader}>
          <Text style={styles.reviewsTitle}>Reviews</Text>
          <Text style={styles.viewAllText}>View all</Text>
        </View>

        <View style={styles.reviewCard}>
          <View style={styles.reviewTop}>
            <RoundedAvatar name="Devon Lane" size={48} backgroundColor="#F0B49B" />
            <View style={styles.reviewCopy}>
              <Text style={styles.reviewName}>Devon Lane</Text>
              <Text style={styles.reviewDate}>May 24, 2020</Text>
            </View>
            <View style={styles.reviewRating}>
              <Ionicons name="star" size={13} color="#FFAA26" />
              <Text style={styles.reviewRatingText}>4.7</Text>
            </View>
          </View>
          <Text style={styles.reviewBody}>
            {cook.name.split(" ")[0]} is the best chef I have ever seen. The service was quick, calm, and delicious for everyone.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    content: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: theme.spacing.xl,
      width: "100%",
      alignSelf: "center",
    },
    roundIcon: {
      position: "absolute",
      top: theme.layout.screenTop,
      zIndex: 30,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.34)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },
    backButton: { left: theme.spacing.lg },
    moreButton: { right: theme.spacing.lg },
    hero: {
      height: 300,
      overflow: "hidden",
      backgroundColor: activeTheme.primaryDark,
      justifyContent: "flex-end",
      padding: theme.spacing.lg,
    },
    heroImage: { ...StyleSheet.absoluteFillObject },
    heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.22)" },
    accountTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
    profileCard: {
      marginHorizontal: 0,
      marginTop: -22,
      borderRadius: 28,
      backgroundColor: activeTheme.surface,
      padding: theme.spacing.lg,
      gap: 16,
      borderWidth: 1,
      borderColor: activeTheme.border,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    profileTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    profileCopy: { flex: 1, gap: 2 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    name: { flex: 1, color: activeTheme.text, fontSize: 17, fontWeight: "900" },
    roleText: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
    orderButton: {
      minHeight: 44,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFAD5B",
    },
    orderButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
    bioText: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 21 },
    readMoreText: { color: "#FFAD5B", fontWeight: "900" },
    divider: { height: 1, backgroundColor: activeTheme.border },
    statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    statStrong: { color: activeTheme.text, fontSize: 13, fontWeight: "900" },
    statMuted: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#FFBD77",
      backgroundColor: activeTheme.surface,
    },
    reviewsHeader: {
      paddingHorizontal: theme.spacing.lg,
      marginTop: 28,
      marginBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    reviewsTitle: { color: activeTheme.text, fontSize: 19, fontWeight: "900" },
    viewAllText: { color: "#FFAD5B", fontSize: 13, fontWeight: "800" },
    reviewCard: {
      marginHorizontal: theme.spacing.lg,
      borderRadius: 24,
      backgroundColor: activeTheme.surface,
      padding: theme.spacing.lg,
      gap: 14,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    reviewTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    reviewCopy: { flex: 1 },
    reviewName: { color: activeTheme.text, fontSize: 14, fontWeight: "900" },
    reviewDate: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
    reviewRating: {
      minHeight: 32,
      borderRadius: 10,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: activeTheme.warmSurface,
    },
    reviewRatingText: { color: "#FF9B31", fontSize: 13, fontWeight: "900" },
    reviewBody: { color: activeTheme.text, fontSize: 13, lineHeight: 20 },
    emptyScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      backgroundColor: activeTheme.bg,
      padding: theme.spacing.lg,
    },
    emptyTitle: { color: activeTheme.text, fontSize: 22, fontWeight: "900", textAlign: "center" },
  });
