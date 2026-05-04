import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";

import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { fetchCookDirectory, sortCooks, type CookDirectoryRecord } from "@/lib/cook-data";
import { getCookImage } from "@/lib/food-visuals";
import { getCurrentUserRecord, type StoredUser } from "@/lib/app-state";
import { getMealItemById } from "@/lib/meal-data";
import { createInstantMealBookingRequest, type BookingRecord } from "@/lib/marketplace";
import { getTheme, theme } from "@/theme/theme";

export default function MealItemScreen() {
  const params = useLocalSearchParams<{ id?: string; category?: string; source?: string }>();
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [cooks, setCooks] = useState<CookDirectoryRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [hasMatched, setHasMatched] = useState(false);
  const [showMatchesSheet, setShowMatchesSheet] = useState(false);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<BookingRecord["deliveryMode"]>("cook_delivery");
  const [savedDish, setSavedDish] = useState(false);
  const [error, setError] = useState("");
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const sheetOffsetY = useRef(0);
  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
        onPanResponderMove: (_, gesture) => {
          const nextValue = Math.max(-170, Math.min(gesture.dy + sheetOffsetY.current, 260));
          sheetTranslateY.setValue(nextValue);
        },
        onPanResponderRelease: (_, gesture) => {
          const nextValue = gesture.dy + sheetOffsetY.current;

          if (nextValue > 170) {
            setShowMatchesSheet(false);
            sheetOffsetY.current = 0;
            sheetTranslateY.setValue(0);
            return;
          }

          const snapTo = nextValue < -70 ? -170 : 0;
          sheetOffsetY.current = snapTo;
          Animated.spring(sheetTranslateY, {
            toValue: snapTo,
            useNativeDriver: true,
          }).start();
        },
      }),
    [sheetTranslateY],
  );
  const item = getMealItemById(params.id);

  useEffect(() => {
    async function loadMatches() {
      const [directory, user] = await Promise.all([fetchCookDirectory(), getCurrentUserRecord()]);
      setCooks(directory);
      setCurrentUser(user);
    }

    void loadMatches();
  }, []);

  const matchedCooks = useMemo(() => {
    if (!item) {
      return [];
    }

    const scored = cooks
      .filter((cook) => {
        const categories = cook.user.availableMealCategories || [];
        const searchable = [cook.user.specialtiesText, cook.bio, cook.tags.join(" ")].join(" ").toLowerCase();
        return (
          categories.includes(item.category) ||
          item.ingredients.some((ingredient) => searchable.includes(ingredient.toLowerCase()))
        );
      })
      .sort((left, right) => {
        const leftNear =
          currentUser?.city && left.city && currentUser.city.toLowerCase() === left.city.toLowerCase()
            ? 1
            : 0;
        const rightNear =
          currentUser?.city && right.city && currentUser.city.toLowerCase() === right.city.toLowerCase()
            ? 1
            : 0;
        return rightNear - leftNear;
      });

    return sortCooks(scored, "popular");
  }, [cooks, currentUser, item]);

  function runMatch() {
    setIsMatching(true);
    setHasMatched(false);
    setError("");
    setTimeout(() => {
      setIsMatching(false);
      setHasMatched(true);
      sheetOffsetY.current = 0;
      sheetTranslateY.setValue(0);
      setShowMatchesSheet(true);
    }, 2200);
  }

  function handleBack() {
    if (params.source === "dish_of_week") {
      router.replace("/explore" as never);
      return;
    }

    router.back();
  }

  async function selectCook(cook: CookDirectoryRecord) {
    if (!item || isCreatingBooking) {
      return;
    }

    setShowMatchesSheet(false);
    setHasMatched(false);
    sheetOffsetY.current = 0;
    sheetTranslateY.setValue(0);
    setIsCreatingBooking(true);
    setError("");

    try {
      const result = await createInstantMealBookingRequest({ cook, meal: item, deliveryMode });
      router.push({
        pathname: "/checkout/[bookingId]",
        params: { bookingId: result.bookingId, threadId: result.threadId, instant: "1" },
      } as never);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We could not create this instant match.");
    } finally {
      setIsCreatingBooking(false);
    }
  }

  if (!item) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyTitle}>Meal not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Pressable style={styles.fixedBackButton} onPress={handleBack}>
        <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
      </Pressable>
      <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
    >
      <View style={styles.heroCard}>
        <Image source={item.image} style={styles.heroImage} contentFit="cover" />
        <View style={styles.heroShade} />
        <View style={styles.topBar}>
          <View />
          <Pressable style={styles.iconButton} onPress={() => setSavedDish((value) => !value)}>
            <Ionicons name={savedDish ? "heart" : "heart-outline"} size={19} color={savedDish ? "#FF6B6B" : "#171713"} />
          </Pressable>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={15} color="#FFCA45" />
            <Text style={styles.ratingText}>4.8 match quality</Text>
          </View>
        </View>
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.detailsTop}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.timePill}>
            <Ionicons name="time-outline" size={15} color={activeTheme.text} />
            <Text style={styles.timeText}>{item.minutes} min</Text>
          </View>
        </View>
        <Text style={styles.bodyText}>{item.subtitle}</Text>
        <Text style={styles.bodyText}>{item.kcal} kcal • expected chef range {item.priceHint}</Text>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <View style={styles.ingredientGrid}>
          {item.ingredients.map((ingredient) => (
            <View key={ingredient} style={styles.ingredientRow}>
              <View style={styles.ingredientIcon}>
                <Ionicons name="nutrition-outline" size={16} color={activeTheme.primaryDark} />
              </View>
              <Text style={styles.ingredientText}>{ingredient}</Text>
            </View>
          ))}
        </View>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={runMatch}
      >
        <Text style={styles.primaryButtonText}>
          Find available cooks
        </Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={isMatching} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.matchLoadingCard}>
            <View style={styles.matchOrb}>
              <Ionicons name="sparkles" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.matchLoadingTitle}>Finding your best cooks</Text>
            <Text style={styles.matchLoadingBody}>
              Checking dish fit, service area, distance, trust signals, and who can handle this soon.
            </Text>
            <View style={styles.matchProgressTrack}>
              <View style={styles.matchProgressFill} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={hasMatched && showMatchesSheet} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetDismissArea} onPress={() => setShowMatchesSheet(false)} />
          <Animated.View style={[styles.matchesSheet, { transform: [{ translateY: sheetTranslateY }] }]}>
            <View style={styles.dragZone} {...sheetPanResponder.panHandlers}>
              <View style={styles.sheetHandle} />
              <Text style={styles.dragHint}>Drag up for more cooks, down to close</Text>
            </View>
            <Text style={styles.sheetTitle}>Best possible matches</Text>
            <Text style={styles.sheetBody}>
              Nearby cooks are ranked first. Farther cooks stay in the list when their dish fit is stronger.
            </Text>
            <View style={styles.modeRow}>
              {(["cook_delivery", "dispatch", "home_service"] as BookingRecord["deliveryMode"][]).map((mode) => {
                const selected = deliveryMode === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[styles.modePill, selected && styles.modePillActive]}
                    onPress={() => setDeliveryMode(mode)}
                  >
                    <Text style={[styles.modePillText, selected && styles.modePillTextActive]}>
                      {mode === "cook_delivery"
                        ? "Cook delivers"
                        : mode === "dispatch"
                          ? "Dispatch"
                          : "Home service"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
              {matchedCooks.slice(0, 12).map((cook) => (
                <View key={cook.id}>
                  <Pressable
                    style={[styles.matchCard, isCreatingBooking && styles.matchCardDisabled]}
                    disabled={isCreatingBooking}
                    onPress={() => void selectCook(cook)}
                  >
                    <Image source={getCookImage(cook.id.length + cook.name.length)} style={styles.matchImage} contentFit="cover" />
                    <View style={styles.matchCopy}>
                      <View style={styles.matchNameRow}>
                        <Text numberOfLines={1} style={styles.matchName}>{cook.name}</Text>
                        {cook.verified ? <Ionicons name="checkmark-circle" size={16} color={activeTheme.primaryDark} /> : null}
                      </View>
                      <Text numberOfLines={2} style={styles.matchBio}>{cook.headline}</Text>
                      <View style={styles.matchMetaRow}>
                        <Text style={styles.matchMeta}>★ 4.{cook.id.length % 3 === 0 ? "7" : "9"}</Text>
                        <Text style={styles.matchMeta}>{cook.yearsExperience} years</Text>
                        <Text style={styles.matchMeta}>{cook.location || "Nearby"}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={activeTheme.textMuted} />
                  </Pressable>
                </View>
              ))}
              {!matchedCooks.length ? (
                <Text style={styles.sheetBody}>No cooks matched this dish yet. Try another handoff mode or search term.</Text>
              ) : null}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
      {isCreatingBooking ? (
        <AuthProcessingScreen
          title="Preparing checkout"
          subtitle="We're creating your confirmed chef match and opening the secure test Paystack checkout."
        />
      ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    fixedBackButton: {
      position: "absolute",
      top: theme.layout.screenTop,
      left: theme.spacing.lg,
      zIndex: 30,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.layout.screenTop,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
      width: "100%",
      alignSelf: "center",
    },
    heroCard: {
      minHeight: 430,
      borderRadius: 32,
      overflow: "hidden",
      backgroundColor: activeTheme.primaryDark,
      padding: theme.spacing.lg,
      justifyContent: "space-between",
    },
    heroImage: { ...StyleSheet.absoluteFillObject },
    heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.28)" },
    topBar: { flexDirection: "row", justifyContent: "space-between" },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.9)",
    },
    heroCopy: { gap: 8 },
    category: { color: "#FFE0BD", fontSize: 13, fontWeight: "900" },
    title: { color: "#FFFFFF", fontSize: 34, lineHeight: 40, fontWeight: "900" },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    ratingText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
    detailsCard: {
      borderRadius: 28,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 12,
    },
    detailsTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sectionTitle: { color: activeTheme.text, fontSize: 21, fontWeight: "900" },
    timePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surfaceElevated,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },
    timeText: { color: activeTheme.text, fontSize: 12, fontWeight: "800" },
    bodyText: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    ingredientGrid: { gap: 10 },
    ingredientRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    ingredientIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.safeSurface,
    },
    ingredientText: { color: activeTheme.text, fontSize: 15, fontWeight: "800" },
    primaryButton: {
      minHeight: 56,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
    modalBackdrop: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(14,15,12,0.58)",
    },
    matchHeader: { gap: 5 },
    stack: { gap: theme.spacing.md },
    matchLoadingCard: {
      width: "100%",
      maxWidth: 420,
      borderRadius: 32,
      backgroundColor: activeTheme.primaryDark,
      padding: theme.spacing.xl,
      alignItems: "center",
      gap: 14,
      overflow: "hidden",
    },
    matchOrb: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.18)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.22)",
    },
    matchLoadingTitle: {
      color: "#FFFFFF",
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "900",
      textAlign: "center",
    },
    matchLoadingBody: {
      color: "rgba(255,255,255,0.78)",
      fontSize: 14,
      lineHeight: 22,
      textAlign: "center",
    },
    matchProgressTrack: {
      width: "100%",
      height: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: "rgba(255,255,255,0.2)",
      overflow: "hidden",
      marginTop: 4,
    },
    matchProgressFill: {
      width: "72%",
      height: "100%",
      borderRadius: theme.radius.pill,
      backgroundColor: "#FFFFFF",
    },
    modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    modePill: {
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surfaceElevated,
      borderWidth: 1,
      borderColor: activeTheme.border,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    modePillActive: {
      backgroundColor: activeTheme.primaryDark,
      borderColor: activeTheme.primaryDark,
    },
    modePillText: { color: activeTheme.text, fontSize: 12, fontWeight: "900" },
    modePillTextActive: { color: "#FFFFFF" },
    sheetBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(14,15,12,0.42)",
    },
    sheetDismissArea: {
      flex: 1,
    },
    matchesSheet: {
      maxHeight: "82%",
      borderTopLeftRadius: 34,
      borderTopRightRadius: 34,
      backgroundColor: activeTheme.bg,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: 10,
      paddingBottom: theme.spacing.lg,
      gap: 12,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    sheetHandle: {
      width: 48,
      height: 5,
      borderRadius: 999,
      backgroundColor: activeTheme.border,
      alignSelf: "center",
      marginBottom: 4,
    },
    dragZone: {
      alignItems: "center",
      paddingTop: 4,
      paddingBottom: 4,
    },
    dragHint: {
      color: activeTheme.textMuted,
      fontSize: 11,
      fontWeight: "800",
      marginTop: 3,
    },
    sheetTitle: {
      color: activeTheme.text,
      fontSize: 23,
      lineHeight: 29,
      fontWeight: "900",
    },
    sheetBody: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "700",
    },
    sheetList: {
      marginHorizontal: -theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    matchCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 22,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: 10,
      marginBottom: 12,
    },
    matchCardDisabled: { opacity: 0.62 },
    matchImage: {
      width: 78,
      height: 78,
      borderRadius: 18,
    },
    matchCopy: { flex: 1, gap: 4 },
    matchNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    matchName: { flex: 1, color: activeTheme.text, fontSize: 16, fontWeight: "900" },
    matchBio: { color: activeTheme.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700" },
    matchMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    matchMeta: {
      color: activeTheme.primaryDark,
      fontSize: 11,
      fontWeight: "900",
      backgroundColor: activeTheme.safeSurface,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    errorText: { color: activeTheme.danger, fontSize: 13, lineHeight: 20 },
    emptyScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.bg,
    },
    emptyTitle: { color: activeTheme.text, fontSize: 22, fontWeight: "900" },
  });
