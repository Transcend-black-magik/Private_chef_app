import { useEffect, useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";

import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { toSafeUserErrorMessage } from "@/lib/async-guard";
import { formatCurrency } from "@/lib/currency";
import { heroFoodImages } from "@/lib/food-visuals";
import {
  confirmBookingPaymentHold,
  subscribeToBookingsForCurrentUser,
  type BookingRecord,
} from "@/lib/marketplace";
import { getTheme, theme } from "@/theme/theme";

function buildCheckoutPlans(booking: BookingRecord | null) {
  const total = booking ? formatCurrency(booking.totalAmount, booking.explorerCountryCode) : "$0.00";
  const subtotal = booking ? formatCurrency(booking.subtotalAmount, booking.explorerCountryCode) : "$0.00";

  return [
    {
      id: "full",
      title: `${total} / service`,
      badge: "Protected hold",
      lines: ["Instant chef match", "Funds held safely", "Auto-confirmed after payment"],
    },
    {
      id: "subtotal",
      title: `${subtotal} cook subtotal`,
      lines: ["Cook payout protected", "Service details included", "Booking appears for both sides"],
    },
    {
      id: "selected",
      title: booking?.dishSummary || "Selected dish",
      lines: [booking?.cookName || "Matched chef", booking?.serviceDateLabel || "Fast service window", "Cancel rules still apply"],
      selected: true,
    },
  ];
}

export default function CheckoutScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const params = useLocalSearchParams<{ bookingId?: string; threadId?: string; instant?: string }>();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeToBookingsForCurrentUser((bookings) => {
      if (!isMounted) {
        return;
      }

      const nextBooking = bookings.find((item) => item.id === params.bookingId) || null;
      setBooking(nextBooking);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [params.bookingId]);

  async function handleCheckout() {
    if (!params.bookingId) {
      setError("Booking could not be found.");
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    setError("");

    try {
      const result = await confirmBookingPaymentHold(params.bookingId);
      if (params.instant === "1") {
        router.replace("/explore" as never);
        return;
      }

      router.replace({
        pathname: "/chat-thread/[id]",
        params: { id: params.threadId || result.threadId },
      });
    } catch (nextError) {
      setError(toSafeUserErrorMessage(nextError instanceof Error ? nextError.message : "", "We could not complete this payment step."));
    } finally {
      setIsLoading(false);
    }
  }

  const plans = buildCheckoutPlans(booking);

  return (
    <View style={styles.screen}>
      <Pressable style={styles.fixedBackButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color="#171713" />
      </Pressable>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.phoneFrame}>
          <View style={styles.heroImageCard}>
            <Image source={heroFoodImages.assistant} style={styles.heroImage} contentFit="cover" />
            <View style={styles.heroShade} />
          </View>

          <View style={styles.checkoutPanel}>
            <Text style={styles.title}>Taste Journey Plus</Text>

            {plans.map((plan) => (
              <View key={plan.id} style={[styles.planCard, plan.selected && styles.planCardSelected]}>
                <View style={styles.planTopRow}>
                  <Text style={styles.planPrice}>{plan.title}</Text>
                  {plan.badge ? (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>{plan.badge}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.radio, plan.selected && styles.radioSelected]}>
                    {plan.selected ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
                  </View>
                </View>
                {plan.lines.map((line) => (
                  <Text key={line} style={styles.planLine}>- {line}</Text>
                ))}
              </View>
            ))}

            {booking ? (
              <Text style={styles.summaryText}>
                {booking.cookName} will receive {formatCurrency(booking.payoutAmount, booking.explorerCountryCode)} after release.
              </Text>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={styles.primaryButton} onPress={() => void handleCheckout()}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {isLoading ? (
        <AuthProcessingScreen
          title="Completing test Paystack"
          subtitle="We're confirming the booking and updating the chef request."
        />
      ) : null}
    </View>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.surface },
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
      backgroundColor: "rgba(255,255,255,0.9)",
    },
    content: {
      paddingTop: 0,
      paddingBottom: 0,
    },
    phoneFrame: {
      width: "100%",
      minHeight: "100%",
      overflow: "hidden",
      backgroundColor: activeTheme.surface,
    },
    heroImageCard: {
      height: 172,
      overflow: "hidden",
      backgroundColor: activeTheme.primaryDark,
    },
    heroImage: { width: "100%", height: "100%" },
    heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.1)" },
    checkoutPanel: {
      marginTop: -24,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: activeTheme.surface,
      padding: theme.spacing.lg,
      gap: 13,
    },
    title: { color: activeTheme.text, fontSize: 24, lineHeight: 30, fontWeight: "900", textAlign: "center" },
    planCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      gap: 5,
      backgroundColor: activeTheme.surface,
    },
    planCardSelected: {
      borderColor: activeTheme.primaryDark,
      backgroundColor: activeTheme.safeSurface,
    },
    planTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    planPrice: { flex: 1, color: activeTheme.text, fontSize: 14, fontWeight: "900" },
    planBadge: {
      borderRadius: theme.radius.pill,
      backgroundColor: "#FF8A1F",
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    planBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: activeTheme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: { backgroundColor: activeTheme.primaryDark, borderColor: activeTheme.primaryDark },
    planLine: { color: activeTheme.textMuted, fontSize: 11, lineHeight: 16, fontWeight: "700" },
    summaryText: { color: activeTheme.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center" },
    primaryButton: {
      minHeight: 56,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primaryDark,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
    },
    primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
    errorText: { color: activeTheme.danger, fontSize: 13, lineHeight: 20, textAlign: "center" },
  });
