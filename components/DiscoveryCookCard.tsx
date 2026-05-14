import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";

import type { CookDirectoryRecord } from "@/lib/cook-data";
import { getCookImage } from "@/lib/food-visuals";
import { getTheme, theme } from "@/theme/theme";

export default function DiscoveryCookCard({
  cook,
  compact = false,
  hideActions = false,
  onPress,
}: {
  cook: CookDirectoryRecord;
  compact?: boolean;
  hideActions?: boolean;
  onPress?: () => void;
}) {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme, compact);

  return (
    <Pressable
      style={styles.card}
      onPress={onPress ?? (() => router.push({ pathname: "/cooks/[id]", params: { id: cook.id } }))}
    >
      <View style={styles.imageWrap}>
        <Image source={getCookImage(cook.id.length + cook.name.length)} style={styles.foodImage} contentFit="cover" />
        <View style={styles.imageShade} />
        <View style={styles.imageBadge}>
          <Ionicons name="star" size={13} color="#FFCA45" />
          <Text style={styles.imageBadgeText}>
            {cook.ratingCount > 0 ? cook.ratingAverage.toFixed(1) : "New"}
          </Text>
        </View>
      </View>

      <View style={styles.topRow}>
        <View style={styles.avatarBadge}>
          {cook.user.photoUrl ? (
            <Image source={cook.user.photoUrl} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={styles.avatarText}>{cook.name.slice(0, 1)}</Text>
          )}
        </View>
        <View style={styles.meta}>
          <Text style={styles.name}>{cook.name}</Text>
          <Text numberOfLines={compact ? 1 : 2} style={styles.headline}>
            {cook.headline}
          </Text>
        </View>
        <View style={[styles.statusPill, cook.verified && styles.statusPillVerified]}>
          <Text style={styles.statusText}>{cook.verified ? "Verified" : "Reviewing"}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>{cook.location}</Text>
        <Text style={styles.infoText}>{cook.yearsExperience} yrs</Text>
        <Text style={styles.infoText}>{cook.profilePercent}% profile</Text>
      </View>

      <View style={styles.tagRow}>
        {cook.tags.slice(0, compact ? 3 : 4).map((tag) => (
          <View key={`${cook.id}-${tag}`} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      {!compact ? (
        <>
          <Text numberOfLines={2} style={styles.note}>
            {cook.note}
          </Text>
          <View style={styles.badgeRow}>
            {cook.trustBadges.slice(0, 3).map((badge) => (
              <View key={`${cook.id}-${badge}`} style={styles.badge}>
                <Ionicons name="checkmark-circle" size={14} color={activeTheme.primaryDark} />
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {!hideActions ? <View style={styles.actionRow}>
        <Pressable
          style={styles.secondaryAction}
          onPress={() =>
            router.push({
              pathname: "/cooks/[id]",
              params: { id: cook.id },
            })
          }
        >
          <Text style={styles.secondaryActionText}>View details</Text>
        </Pressable>
        <Pressable
          style={styles.primaryAction}
          onPress={() =>
            router.push({
              pathname: "/booking-request",
              params: { cookId: cook.id },
            })
          }
        >
          <Text style={styles.primaryActionText}>Book</Text>
        </Pressable>
      </View> : null}
    </Pressable>
  );
}

const createStyles = (
  activeTheme: ReturnType<typeof getTheme>,
  compact: boolean,
) =>
  StyleSheet.create({
    card: {
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: 28,
      padding: compact ? 12 : theme.spacing.md,
      gap: compact ? theme.spacing.sm : theme.spacing.md,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    imageWrap: {
      height: compact ? 124 : 162,
      borderRadius: 23,
      overflow: "hidden",
      backgroundColor: activeTheme.surfaceElevated,
    },
    foodImage: {
      width: "100%",
      height: "100%",
    },
    imageShade: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.12)",
    },
    imageBadge: {
      position: "absolute",
      top: 12,
      right: 12,
      minHeight: 30,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 10,
      backgroundColor: "rgba(0,0,0,0.48)",
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    imageBadgeText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    avatarBadge: {
      width: compact ? 48 : 52,
      height: compact ? 48 : 52,
      borderRadius: compact ? 24 : 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.accent,
      overflow: "hidden",
    },
    avatarText: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "800",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    meta: {
      flex: 1,
      gap: 2,
    },
    name: {
      color: activeTheme.text,
      fontSize: compact ? 17 : 19,
      fontWeight: "800",
    },
    headline: {
      color: activeTheme.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    statusPill: {
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.accent,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    statusPillVerified: {
      backgroundColor: activeTheme.primary,
    },
    statusText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },
    infoRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 14,
    },
    infoText: {
      color: activeTheme.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tag: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surfaceElevated,
    },
    tagText: {
      color: activeTheme.text,
      fontSize: 12,
      fontWeight: "700",
    },
    note: {
      color: activeTheme.text,
      fontSize: 15,
      lineHeight: 23,
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.bg,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    badgeText: {
      color: activeTheme.text,
      fontSize: 12,
      fontWeight: "700",
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
    },
    secondaryAction: {
      flex: 1,
      minHeight: 44,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.bg,
    },
    secondaryActionText: {
      color: activeTheme.text,
      fontSize: 14,
      fontWeight: "700",
    },
    primaryAction: {
      flex: 1,
      minHeight: 44,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.accent,
    },
    primaryActionText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
  });
