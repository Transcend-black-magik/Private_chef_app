import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Image } from "expo-image";

import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { getCurrentUserRecord } from "@/lib/app-state";
import type { CookDirectoryRecord } from "@/lib/cook-data";
import { formatCurrency } from "@/lib/currency";
import { heroFoodImages } from "@/lib/food-visuals";
import {
  COOK_FEE_RATE,
  COMMISSION_RATE,
  createBookingRequest,
  fetchCookForBookingRequest,
  serviceKindLabel,
  type ServiceKind,
} from "@/lib/marketplace";
import { getTheme, theme } from "@/theme/theme";

export default function BookingRequestScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const params = useLocalSearchParams<{ cookId?: string; dish?: string }>();
  const [cook, setCook] = useState<CookDirectoryRecord | null | undefined>(undefined);
  const [dishSummary, setDishSummary] = useState("");
  const [serviceDateLabel, setServiceDateLabel] = useState("");
  const [serviceDate, setServiceDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [guestCount, setGuestCount] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [serviceMode, setServiceMode] = useState<"explorer_home" | "cook_home">("explorer_home");
  const [serviceKind, setServiceKind] = useState<ServiceKind>("cook_only");
  const [wantedInMeal, setWantedInMeal] = useState("");
  const [avoidInMeal, setAvoidInMeal] = useState("");
  const [kitchenGuidance, setKitchenGuidance] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [portionGuidance, setPortionGuidance] = useState("");
  const [homeAccessNotes, setHomeAccessNotes] = useState("");
  const [subtotalInput, setSubtotalInput] = useState("");
  const [ingredientBudgetInput, setIngredientBudgetInput] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countryCode, setCountryCode] = useState("US");

  useEffect(() => {
    async function loadCook() {
      const [nextCook, currentUser] = await Promise.all([
        fetchCookForBookingRequest(params.cookId ?? ""),
        getCurrentUserRecord(),
      ]);

      setCook(nextCook);
      setAreaLabel(nextCook?.serviceAreaLabel || nextCook?.location || "");
      setDishSummary(params.dish || "");
      setCountryCode(currentUser?.countryCode || "US");
      setWantedInMeal(currentUser?.wantedIngredients || "");
      setAvoidInMeal(currentUser?.dislikedIngredients || "");
      setFitnessGoal(currentUser?.gymGoal || "");
      setPortionGuidance(currentUser?.portionPreference || "");
    }

    void loadCook();
  }, [params.cookId, params.dish]);

  const bookingDateSummary = useMemo(() => {
    if (!serviceDate) {
      return {
        dateLabel: "Select date",
        timeLabel: "Select time",
      };
    }

    return {
      dateLabel: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(serviceDate),
      timeLabel: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(serviceDate),
    };
  }, [serviceDate]);

  function updateServiceDate(nextDate: Date) {
    setServiceDate(nextDate);
    setServiceDateLabel(
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(nextDate),
    );
  }

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    const nextDate = serviceDate ? new Date(serviceDate) : new Date();
    nextDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    updateServiceDate(nextDate);
  }

  function handleTimeChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS !== "ios") {
      setShowTimePicker(false);
    }

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    const nextDate = serviceDate ? new Date(serviceDate) : new Date();
    nextDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    updateServiceDate(nextDate);
  }

  if (cook === undefined) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Preparing booking request...</Text>
      </View>
    );
  }

  if (!cook) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Cook profile could not be found.</Text>
      </View>
    );
  }

  const currentCook = cook;
  const subtotalPreview = subtotalInput.trim() ? Number.parseFloat(subtotalInput) : 0;
  const ingredientBudgetPreview = ingredientBudgetInput.trim()
    ? Number.parseFloat(ingredientBudgetInput)
    : 0;
  const explorerFeePreview = subtotalInput.trim() ? subtotalPreview * (COMMISSION_RATE - COOK_FEE_RATE) : 0;
  const cookFeePreview = subtotalInput.trim() ? subtotalPreview * COOK_FEE_RATE : 0;
  const feePreview = explorerFeePreview + cookFeePreview;
  const totalPreview = subtotalPreview + ingredientBudgetPreview + explorerFeePreview;
  const payoutPreview = subtotalPreview + ingredientBudgetPreview - cookFeePreview;

  async function handleSubmit() {
    setIsSubmitting(true);
    setError("");

    try {
      const result = await createBookingRequest({
        cook: currentCook,
        dishSummary,
        serviceDateLabel,
        guestCount,
        areaLabel,
        serviceMode,
        serviceKind,
        wantedInMeal,
        avoidInMeal,
        kitchenGuidance,
        fitnessGoal,
        portionGuidance,
        homeAccessNotes,
        notes,
        subtotalInput,
        ingredientBudgetInput,
      });

      router.replace({
        pathname: "/checkout/[bookingId]",
        params: { bookingId: result.bookingId, threadId: result.threadId },
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "We could not create this booking request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerBlock}>
          <Image source={heroFoodImages.platter} style={styles.headerImage} contentFit="cover" />
          <View style={styles.headerShade} />
          <Text style={styles.eyebrow}>Booking request</Text>
          <Text style={styles.title}>Book {currentCook.name} the safe way.</Text>
          <Text style={styles.subtitle}>
            Keep your request, timing, service location, and platform fee inside the app so both sides stay protected.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Request details</Text>
          <TextInput
            value={dishSummary}
            onChangeText={setDishSummary}
            placeholder="Dish or meal request"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.input}
          />
          <View style={styles.dateTimeStack}>
            <Text style={styles.sectionSubTitle}>Preferred date and time</Text>
            <View style={styles.dateTimeRow}>
              <Pressable
                style={styles.dateTimeButton}
                onPress={() => {
                  setShowTimePicker(false);
                  setShowDatePicker((value) => !value);
                }}
              >
                <Ionicons name="calendar-outline" size={18} color={activeTheme.textMuted} />
                <View style={styles.dateTimeCopy}>
                  <Text style={styles.dateTimeLabel}>Date</Text>
                  <Text style={styles.dateTimeValue}>{bookingDateSummary.dateLabel}</Text>
                </View>
              </Pressable>
              <Pressable
                style={styles.dateTimeButton}
                onPress={() => {
                  setShowDatePicker(false);
                  setShowTimePicker((value) => !value);
                }}
              >
                <Ionicons name="time-outline" size={18} color={activeTheme.textMuted} />
                <View style={styles.dateTimeCopy}>
                  <Text style={styles.dateTimeLabel}>Time</Text>
                  <Text style={styles.dateTimeValue}>{bookingDateSummary.timeLabel}</Text>
                </View>
              </Pressable>
            </View>
            {showDatePicker ? (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={serviceDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                />
              </View>
            ) : null}
            {showTimePicker ? (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={serviceDate ?? new Date()}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleTimeChange}
                />
              </View>
            ) : null}
          </View>
          <TextInput
            value={guestCount}
            onChangeText={setGuestCount}
            placeholder="Guest count"
            placeholderTextColor={activeTheme.textMuted}
            keyboardType="number-pad"
            style={styles.input}
          />
          <TextInput
            value={areaLabel}
            onChangeText={setAreaLabel}
            placeholder="Area or neighborhood"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.input}
          />

          <Text style={styles.sectionSubTitle}>Where should the cooking happen?</Text>
          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeCard, serviceMode === "explorer_home" && styles.modeCardActive]}
              onPress={() => setServiceMode("explorer_home")}
            >
              <Text
                style={[
                  styles.modeTitle,
                  serviceMode === "explorer_home" && styles.modeTitleActive,
                ]}
              >
                At my home
              </Text>
              <Text
                style={[
                  styles.modeBody,
                  serviceMode === "explorer_home" && styles.modeBodyActive,
                ]}
              >
                Invite the cook to prepare the meal in your kitchen, even if you are not home.
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeCard, serviceMode === "cook_home" && styles.modeCardActive]}
              onPress={() => setServiceMode("cook_home")}
            >
              <Text
                style={[styles.modeTitle, serviceMode === "cook_home" && styles.modeTitleActive]}
              >
                At the cook&apos;s home
              </Text>
              <Text
                style={[styles.modeBody, serviceMode === "cook_home" && styles.modeBodyActive]}
              >
                Have the cook prepare the food in their own space for pickup or handoff.
              </Text>
            </Pressable>
          </View>

          <Text style={styles.sectionSubTitle}>What help do you need?</Text>
          <View style={styles.modeRow}>
            {(["cook_only", "shop_only", "shop_and_cook"] as ServiceKind[]).map((option) => {
              const selected = serviceKind === option;
              return (
                <Pressable
                  key={option}
                  style={[styles.modeCard, selected && styles.modeCardActive]}
                  onPress={() => setServiceKind(option)}
                >
                  <Text style={[styles.modeTitle, selected && styles.modeTitleActive]}>
                    {serviceKindLabel(option)}
                  </Text>
                  <Text style={[styles.modeBody, selected && styles.modeBodyActive]}>
                    {option === "cook_only"
                      ? "You already have the ingredients and only need the cooking service."
                      : option === "shop_only"
                        ? "Ask the cook to help buy ingredients and hand them over or prep them."
                        : "The cook shops for ingredients and prepares the meal for you."}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.preferenceCard}>
            <Text style={styles.sectionSubTitle}>Keep the explorer connected to the kitchen</Text>
            <TextInput
              value={wantedInMeal}
              onChangeText={setWantedInMeal}
              placeholder="What do you want in the meal?"
              placeholderTextColor={activeTheme.textMuted}
              style={styles.input}
            />
            <TextInput
              value={avoidInMeal}
              onChangeText={setAvoidInMeal}
              placeholder="What should the cook avoid completely?"
              placeholderTextColor={activeTheme.textMuted}
              style={styles.input}
            />
            <TextInput
              value={kitchenGuidance}
              onChangeText={setKitchenGuidance}
              placeholder="How should the cook finish the meal while you guide from a distance?"
              placeholderTextColor={activeTheme.textMuted}
              multiline
              style={[styles.input, styles.textArea]}
            />
          </View>

          <View style={styles.fitnessCard}>
            <Text style={styles.sectionSubTitle}>Gym or nutrition support</Text>
            <TextInput
              value={fitnessGoal}
              onChangeText={setFitnessGoal}
              placeholder="Gym goal or nutrition direction"
              placeholderTextColor={activeTheme.textMuted}
              style={styles.input}
            />
            <TextInput
              value={portionGuidance}
              onChangeText={setPortionGuidance}
              placeholder="Portion guidance, quantity, or macro target"
              placeholderTextColor={activeTheme.textMuted}
              style={styles.input}
            />
          </View>

          {serviceMode === "explorer_home" ? (
            <View style={styles.safetyCard}>
              <Text style={styles.sectionSubTitle}>Home access and safety note</Text>
              <TextInput
                value={homeAccessNotes}
                onChangeText={setHomeAccessNotes}
                placeholder="Gate note, handoff plan, kitchen entry, or quiet-home instruction"
                placeholderTextColor={activeTheme.textMuted}
                multiline
                style={[styles.input, styles.textArea]}
              />
            </View>
          ) : null}

          <TextInput
            value={subtotalInput}
            onChangeText={setSubtotalInput}
            placeholder="Estimated cook subtotal"
            placeholderTextColor={activeTheme.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          {serviceKind !== "cook_only" ? (
            <TextInput
              value={ingredientBudgetInput}
              onChangeText={setIngredientBudgetInput}
              placeholder="Ingredient budget"
              placeholderTextColor={activeTheme.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          ) : null}
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Kitchen notes, allergies, building access, quiet handoff details, or hosting context"
            placeholderTextColor={activeTheme.textMuted}
            multiline
            style={[styles.input, styles.textArea]}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Platform fee</Text>
          <Text style={styles.bodyText}>
            The explorer carries a 10% service fee. The cook carries a 10% payout fee. Both stay inside the app so bookings, trust, and support remain protected.
          </Text>
          <Text style={styles.feeText}>
            Cook subtotal: {formatCurrency(Number.isFinite(subtotalPreview) ? subtotalPreview : 0, countryCode)}
          </Text>
          {serviceKind !== "cook_only" ? (
            <Text style={styles.feeText}>
              Ingredient budget: {formatCurrency(Number.isFinite(ingredientBudgetPreview) ? ingredientBudgetPreview : 0, countryCode)}
            </Text>
          ) : null}
          <Text style={styles.feeText}>
            Explorer fee: {formatCurrency(Number.isFinite(explorerFeePreview) ? explorerFeePreview : 0, countryCode)}
          </Text>
          <Text style={styles.feeText}>
            Cook fee: {formatCurrency(Number.isFinite(cookFeePreview) ? cookFeePreview : 0, countryCode)}
          </Text>
          <Text style={styles.feeText}>
            Platform fee: {formatCurrency(Number.isFinite(feePreview) ? feePreview : 0, countryCode)}
          </Text>
          <Text style={styles.feeText}>
            Estimated total: {formatCurrency(Number.isFinite(totalPreview) ? totalPreview : 0, countryCode)}
          </Text>
          <Text style={styles.bodyText}>
            Cook payout after trust/release: {formatCurrency(Number.isFinite(payoutPreview) ? payoutPreview : 0, countryCode)}
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={() => void handleSubmit()}>
          <Text style={styles.primaryButtonText}>Send booking request</Text>
        </Pressable>
      </ScrollView>

      {isSubmitting ? (
        <AuthProcessingScreen
          title="Creating booking request"
          subtitle="We're opening the in-app thread and storing the commission-aware booking details."
        />
      ) : null}
    </KeyboardAvoidingView>
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
      width: "100%",
      maxWidth: Platform.OS === "web" ? 1040 : undefined,
      alignSelf: "center",
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
    headerBlock: {
      minHeight: 260,
      borderRadius: 34,
      overflow: "hidden",
      padding: theme.spacing.lg,
      justifyContent: "flex-end",
      gap: theme.spacing.xs,
      backgroundColor: activeTheme.primaryDark,
    },
    headerImage: { ...StyleSheet.absoluteFillObject },
    headerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.42)" },
    eyebrow: { color: "#FFE0BD", fontSize: 14, fontWeight: "900" },
    title: { color: "#FFFFFF", fontSize: 31, lineHeight: 37, fontWeight: "900" },
    subtitle: { color: "rgba(255,255,255,0.84)", fontSize: 15, lineHeight: 23 },
    card: {
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: 28,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    sectionTitle: { color: activeTheme.text, fontSize: 19, fontWeight: "800" },
    sectionSubTitle: { color: activeTheme.text, fontSize: 15, fontWeight: "800" },
    input: {
      backgroundColor: activeTheme.surfaceElevated,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 16,
      color: activeTheme.text,
      fontSize: 15,
    },
    dateTimeStack: { gap: 10 },
    dateTimeRow: { flexDirection: "row", gap: 10 },
    dateTimeButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: activeTheme.bg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
    },
    dateTimeCopy: { flex: 1, gap: 2 },
    dateTimeLabel: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
    dateTimeValue: { color: activeTheme.text, fontSize: 15, fontWeight: "700" },
    pickerWrap: {
      overflow: "hidden",
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surfaceElevated,
      paddingHorizontal: 6,
      paddingVertical: Platform.OS === "ios" ? 6 : 0,
    },
    modeRow: { gap: 10 },
    modeCard: {
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.md,
      backgroundColor: activeTheme.surfaceElevated,
      padding: theme.spacing.md,
      gap: 6,
    },
    modeCardActive: {
      backgroundColor: activeTheme.accentSoft,
      borderColor: activeTheme.accent,
    },
    modeTitle: { color: activeTheme.text, fontSize: 15, fontWeight: "800" },
    modeTitleActive: { color: activeTheme.text },
    modeBody: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20 },
    modeBodyActive: { color: activeTheme.text },
    preferenceCard: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.warmSurface,
      padding: theme.spacing.md,
      gap: 10,
    },
    fitnessCard: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.focusSurface,
      padding: theme.spacing.md,
      gap: 10,
    },
    safetyCard: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.safeSurface,
      padding: theme.spacing.md,
      gap: 10,
    },
    textArea: { minHeight: 110, textAlignVertical: "top" },
    bodyText: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    feeText: { color: activeTheme.text, fontSize: 17, fontWeight: "800" },
    errorText: { color: activeTheme.danger, fontSize: 13, lineHeight: 20 },
    primaryButton: {
      minHeight: 56,
      borderRadius: theme.radius.md,
      backgroundColor: activeTheme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  });
