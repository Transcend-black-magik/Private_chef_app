import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
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
import LogoLoadingScreen from "@/components/LogoLoadingScreen";
import { getCurrentUserRecord } from "@/lib/app-state";
import { toSafeUserErrorMessage } from "@/lib/async-guard";
import type { CookDirectoryRecord } from "@/lib/cook-data";
import { formatCurrency } from "@/lib/currency";
import { getCookImage, heroFoodImages } from "@/lib/food-visuals";
import {
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
  const [activeStep, setActiveStep] = useState(0);
  const stepMotion = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    stepMotion.setValue(0);
    Animated.timing(stepMotion, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeStep, stepMotion]);

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
    return <LogoLoadingScreen title="Preparing booking request" subtitle="Loading cook details and your saved preferences." />;
  }

  if (!cook) {
    return <LogoLoadingScreen title="Cook profile not found" subtitle="This cook may no longer be available." />;
  }

  const currentCook = cook;
  const subtotalPreview = subtotalInput.trim() ? Number.parseFloat(subtotalInput) : 0;
  const ingredientBudgetPreview = ingredientBudgetInput.trim()
    ? Number.parseFloat(ingredientBudgetInput)
    : 0;
  const totalPreview = subtotalPreview + ingredientBudgetPreview + (subtotalInput.trim() ? subtotalPreview * 0.1 : 0);
  const stepTranslateY = stepMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  async function handleSubmit() {
    Keyboard.dismiss();
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
      setError(toSafeUserErrorMessage(nextError instanceof Error ? nextError.message : "", "We could not create this booking request."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color="#171713" />
      </Pressable>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
      >
        <View style={styles.headerBlock}>
          <Image source={heroFoodImages.platter} style={styles.headerImage} contentFit="cover" />
          <View style={styles.headerShade} />
          <View style={styles.heroContent}>
            <View style={styles.heroPill}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#FFFFFF" />
              <Text style={styles.heroPillText}>Protected request</Text>
            </View>
            <Text style={styles.eyebrow}>Booking request</Text>
            <Text style={styles.title}>Book {currentCook.name} with confidence.</Text>
            <Text style={styles.subtitle}>
              Set the dish, timing, location, kitchen notes, and payment expectations before the thread opens.
            </Text>
          </View>
        </View>

        <View style={styles.cookSnapshot}>
          <Image source={getCookImage(currentCook.id.length + currentCook.name.length)} style={styles.cookAvatarImage} contentFit="cover" />
          <View style={styles.cookSnapshotCopy}>
            <Text numberOfLines={1} style={styles.cookName}>{currentCook.name}</Text>
            <Text numberOfLines={1} style={styles.cookMeta}>{currentCook.headline}</Text>
          </View>
          <View style={styles.cookTrustPill}>
            <Ionicons name="star" size={13} color="#FFCA45" />
            <Text style={styles.cookTrustText}>4.9</Text>
          </View>
        </View>

        <View style={styles.stepRail}>
          {["Details", "Service", "Taste", "Budget"].map((label, index) => (
            <Pressable
              key={label}
              style={[styles.stepPill, activeStep === index && styles.stepPillActive]}
              onPress={() => setActiveStep(index)}
            >
              <Text style={[styles.stepPillText, activeStep === index && styles.stepPillTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Area</Text>
            <Text numberOfLines={1} style={styles.overviewValue}>{currentCook.serviceAreaLabel || currentCook.location || "Flexible"}</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Experience</Text>
            <Text numberOfLines={1} style={styles.overviewValue}>{currentCook.yearsExperience} years</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Format</Text>
            <Text numberOfLines={1} style={styles.overviewValue}>{serviceKindLabel(serviceKind)}</Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.stepScene,
            {
              opacity: stepMotion,
              transform: [{ translateY: stepTranslateY }],
            },
          ]}
        >
        {activeStep === 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionKicker}>Step 1</Text>
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
        </View>
        ) : null}

        {activeStep === 1 ? (
        <View style={styles.card}>
          <Text style={styles.sectionKicker}>Step 2</Text>
          <Text style={styles.sectionTitle}>Choose the service setup</Text>
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
          <View style={styles.serviceKindRow}>
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
        </View>
        ) : null}

        {activeStep === 2 ? (
        <View style={styles.card}>
          <Text style={styles.sectionKicker}>Step 3</Text>
          <Text style={styles.sectionTitle}>Shape the food experience</Text>
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
            value={notes}
            onChangeText={setNotes}
            placeholder="Kitchen notes, allergies, building access, quiet handoff details, or hosting context"
            placeholderTextColor={activeTheme.textMuted}
            multiline
            style={[styles.input, styles.textArea]}
          />
        </View>
        ) : null}

        {activeStep === 3 ? (
        <View style={styles.card}>
          <Text style={styles.sectionKicker}>Step 4</Text>
          <Text style={styles.sectionTitle}>Set the working budget</Text>
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
        </View>
        ) : null}

        {activeStep === 3 ? (
        <View style={styles.card}>
          <View style={styles.feeHeader}>
            <View>
              <Text style={styles.sectionTitle}>You pay</Text>
              <Text style={styles.feeHeaderSubtext}>The amount billed before your request is sent</Text>
            </View>
            <View style={styles.feeBadge}>
              <Text style={styles.feeBadgeText}>Today</Text>
            </View>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalAmount}>
              {formatCurrency(Number.isFinite(totalPreview) ? totalPreview : 0, countryCode)}
            </Text>
            <Text style={styles.totalBody}>
              Includes your selected cook amount{serviceKind !== "cook_only" ? " and ingredient budget" : ""}.
            </Text>
          </View>
        </View>
        ) : null}
        </Animated.View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.wizardFooter}>
          <Pressable
            style={[styles.footerButton, activeStep === 0 && styles.footerButtonDisabled]}
            disabled={activeStep === 0}
            onPress={() => setActiveStep((value) => Math.max(0, value - 1))}
          >
            <Ionicons name="arrow-back" size={17} color={activeTheme.text} />
            <Text style={styles.footerButtonText}>Back</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              if (activeStep < 3) {
                setActiveStep((value) => Math.min(3, value + 1));
              } else {
                void handleSubmit();
              }
            }}
          >
            <Text style={styles.primaryButtonText}>
              {activeStep < 3 ? "Continue" : "Send booking request"}
            </Text>
            <Ionicons name={activeStep < 3 ? "arrow-forward" : "checkmark"} size={18} color="#FFFFFF" />
          </Pressable>
        </View>
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
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: 120,
      gap: theme.spacing.md,
      width: "100%",
      alignSelf: "center",
    },
    backButton: {
      position: "absolute",
      top: theme.layout.screenTop - 8,
      left: theme.spacing.lg,
      zIndex: 40,
      elevation: 40,
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.92)",
    },
    headerBlock: {
      minHeight: 370,
      overflow: "hidden",
      padding: theme.spacing.lg,
      paddingTop: theme.layout.screenTop,
      justifyContent: "flex-end",
      gap: theme.spacing.md,
      backgroundColor: activeTheme.primaryDark,
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
    },
    headerImage: { ...StyleSheet.absoluteFillObject },
    headerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.36)" },
    heroContent: { gap: 8, maxWidth: 620 },
    heroPill: {
      alignSelf: "flex-start",
      minHeight: 34,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(255,255,255,0.16)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
    },
    heroPillText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
    eyebrow: { color: "#FFE0BD", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
    title: { color: "#FFFFFF", fontSize: 34, lineHeight: 40, fontWeight: "900" },
    subtitle: { color: "rgba(255,255,255,0.84)", fontSize: 14, lineHeight: 22 },
    cookSnapshot: {
      marginHorizontal: theme.spacing.lg,
      marginTop: -34,
      minHeight: 86,
      borderRadius: 26,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    cookAvatarImage: {
      width: 52,
      height: 52,
      borderRadius: 18,
    },
    cookSnapshotCopy: { flex: 1, gap: 3, minWidth: 0 },
    cookName: { color: activeTheme.text, fontSize: 17, fontWeight: "900" },
    cookMeta: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "700" },
    cookTrustPill: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: activeTheme.surfaceElevated,
    },
    cookTrustText: { color: activeTheme.text, fontSize: 12, fontWeight: "900" },
    stepRail: {
      marginHorizontal: theme.spacing.lg,
      flexDirection: "row",
      gap: 10,
    },
    stepPill: {
      flex: 1,
      minHeight: 42,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      paddingHorizontal: 8,
    },
    stepPillActive: {
      backgroundColor: activeTheme.primaryDark,
      borderColor: activeTheme.primaryDark,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    stepPillText: {
      color: activeTheme.textMuted,
      fontSize: 12,
      fontWeight: "900",
    },
    stepPillTextActive: {
      color: "#FFFFFF",
    },
    overviewRow: {
      marginHorizontal: theme.spacing.lg,
      flexDirection: "row",
      gap: 10,
    },
    overviewCard: {
      flex: 1,
      minHeight: 82,
      borderRadius: 22,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      justifyContent: "space-between",
      shadowColor: activeTheme.shadow,
      shadowOpacity: 0.9,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    overviewLabel: {
      color: activeTheme.primaryDark,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    overviewValue: {
      color: activeTheme.text,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "900",
    },
    progressStep: {
      flex: 1,
      minHeight: 68,
      borderRadius: 20,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingHorizontal: 6,
    },
    stepScene: {
      gap: theme.spacing.md,
    },
    progressStepNumber: {
      color: activeTheme.primaryDark,
      fontSize: 18,
      fontWeight: "900",
    },
    progressStepLabel: {
      color: activeTheme.textMuted,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      textAlign: "center",
    },
    card: {
      marginHorizontal: theme.spacing.lg,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: 30,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    sectionKicker: {
      color: activeTheme.primaryDark,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    sectionTitle: { color: activeTheme.text, fontSize: 21, fontWeight: "900" },
    sectionSubTitle: { color: activeTheme.text, fontSize: 15, fontWeight: "900" },
    input: {
      backgroundColor: activeTheme.bg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: 20,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 16,
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "700",
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
      borderRadius: 22,
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
    serviceKindRow: { gap: 10 },
    modeCard: {
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: 22,
      backgroundColor: activeTheme.bg,
      padding: theme.spacing.md,
      gap: 6,
    },
    modeCardActive: {
      backgroundColor: activeTheme.safeSurface,
      borderColor: activeTheme.accent,
    },
    modeTitle: { color: activeTheme.text, fontSize: 15, fontWeight: "800" },
    modeTitleActive: { color: activeTheme.text },
    modeBody: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20 },
    modeBodyActive: { color: activeTheme.text },
    preferenceCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.warmSurface,
      padding: theme.spacing.md,
      gap: 10,
    },
    fitnessCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.focusSurface,
      padding: theme.spacing.md,
      gap: 10,
    },
    safetyCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.safeSurface,
      padding: theme.spacing.md,
      gap: 10,
    },
    textArea: { minHeight: 110, textAlignVertical: "top" },
    bodyText: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    feeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    feeHeaderSubtext: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "800", marginTop: 3 },
    feeBadge: {
      minHeight: 34,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.safeSurface,
    },
    feeBadgeText: { color: activeTheme.primaryDark, fontSize: 11, fontWeight: "900" },
    feeText: { color: activeTheme.text, fontSize: 15, lineHeight: 21, fontWeight: "900" },
    totalCard: {
      borderRadius: 24,
      backgroundColor: activeTheme.primaryDark,
      padding: theme.spacing.lg,
      gap: 8,
    },
    totalAmount: {
      color: "#FFFFFF",
      fontSize: 36,
      lineHeight: 42,
      fontWeight: "900",
    },
    totalBody: { color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 21, fontWeight: "700" },
    errorText: { color: activeTheme.danger, fontSize: 13, lineHeight: 20 },
    wizardFooter: {
      marginHorizontal: theme.spacing.lg,
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
    footerButton: {
      minHeight: 54,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    footerButtonDisabled: {
      opacity: 0.36,
    },
    footerButtonText: {
      color: activeTheme.text,
      fontSize: 14,
      fontWeight: "900",
    },
    primaryButton: {
      flex: 1,
      minHeight: 56,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primaryDark,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  });
