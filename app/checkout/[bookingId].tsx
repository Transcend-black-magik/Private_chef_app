import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { getCurrentUserRecord, saveUserRecord, type StoredUser } from "@/lib/app-state";
import { formatCurrency } from "@/lib/currency";
import { getDocumentPlaceholder, shouldRequireExplorerVerificationForOrder } from "@/lib/identity-review";
import {
  confirmBookingPaymentDummy,
  fetchBookingsForCurrentUser,
  type BookingRecord,
} from "@/lib/marketplace";
import { getTheme, theme } from "@/theme/theme";

export default function CheckoutScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const params = useLocalSearchParams<{ bookingId?: string; threadId?: string }>();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      const [bookings, user] = await Promise.all([fetchBookingsForCurrentUser(), getCurrentUserRecord()]);
      const nextBooking = bookings.find((item) => item.id === params.bookingId) || null;
      setBooking(nextBooking);
      setCurrentUser(user);
      setDocumentType(user?.countryName ? getDocumentPlaceholder(user.countryName) : "Government ID or passport number");
    }

    void loadBooking();
  }, [params.bookingId]);

  async function handleCheckout() {
    if (!params.bookingId) {
      setError("Booking could not be found.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (currentUser && shouldRequireExplorerVerificationForOrder(currentUser)) {
        if (!documentNumber.trim()) {
          throw new Error("Add your ID number before your first protected order.");
        }

        const verifiedUser: StoredUser = {
          ...currentUser,
          cookVerification: {
            provider: currentUser.countryCode === "NG" ? "dojah" : "persona",
            status: "pending_review",
            countryCode: currentUser.countryCode || "",
            countryName: currentUser.countryName || "",
            documentType: documentType.trim(),
            documentNumber: documentNumber.trim(),
            submittedAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        };

        await saveUserRecord(verifiedUser);
        setCurrentUser(verifiedUser);
      }

      const result = await confirmBookingPaymentDummy(params.bookingId);
      router.replace({
        pathname: "/chat-thread/[id]",
        params: { id: params.threadId || result.threadId },
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We could not complete this dummy payment.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>Checkout</Text>
      <Text style={styles.title}>Confirm the booking inside the app.</Text>
      <Text style={styles.subtitle}>
        This is a dummy payment flow for now, but it is structured to swap into Paystack or Flutterwave next.
      </Text>

      {currentUser && shouldRequireExplorerVerificationForOrder(currentUser) ? (
        <View style={styles.verificationCard}>
          <Text style={styles.sectionTitle}>First-order identity check</Text>
          <Text style={styles.bodyText}>
            Before the first protected order, we ask for a government ID so cooks feel safer accepting home service requests.
          </Text>
          <TextInput
            value={documentType}
            onChangeText={setDocumentType}
            placeholder="Document type"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.input}
          />
          <TextInput
            value={documentNumber}
            onChangeText={setDocumentNumber}
            placeholder="Document number"
            placeholderTextColor={activeTheme.textMuted}
            autoCapitalize="characters"
            style={styles.input}
          />
        </View>
      ) : null}

      {booking ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{booking.cookName}</Text>
          <Text style={styles.bodyText}>{booking.dishSummary}</Text>
          <Text style={styles.bodyText}>Date: {booking.serviceDateLabel}</Text>
          <Text style={styles.bodyText}>
            Service location: {booking.serviceMode === "cook_home" ? "Cook home" : "Explorer home"}
          </Text>
          <Text style={styles.bodyText}>Service type: {booking.serviceKind.replace(/_/g, " ")}</Text>
          <Text style={styles.bodyText}>Guests: {booking.guestCount}</Text>
          <Text style={styles.bodyText}>
            Cook subtotal: {formatCurrency(booking.subtotalAmount, booking.explorerCountryCode)}
          </Text>
          {booking.ingredientBudgetAmount ? (
            <Text style={styles.bodyText}>
              Ingredient budget: {formatCurrency(booking.ingredientBudgetAmount, booking.explorerCountryCode)}
            </Text>
          ) : null}
          {booking.wantedInMeal ? <Text style={styles.bodyText}>Must have: {booking.wantedInMeal}</Text> : null}
          {booking.avoidInMeal ? <Text style={styles.bodyText}>Avoid: {booking.avoidInMeal}</Text> : null}
          {booking.kitchenGuidance ? <Text style={styles.bodyText}>Kitchen guidance: {booking.kitchenGuidance}</Text> : null}
          {booking.fitnessGoal ? <Text style={styles.bodyText}>Fitness goal: {booking.fitnessGoal}</Text> : null}
          {booking.portionGuidance ? <Text style={styles.bodyText}>Portion target: {booking.portionGuidance}</Text> : null}
          {booking.homeAccessNotes ? <Text style={styles.bodyText}>Home access note: {booking.homeAccessNotes}</Text> : null}
          <Text style={styles.bodyText}>
            Explorer fee: {formatCurrency(booking.explorerFeeAmount, booking.explorerCountryCode)}
          </Text>
          <Text style={styles.bodyText}>
            Cook fee: {formatCurrency(booking.cookFeeAmount, booking.explorerCountryCode)}
          </Text>
          <Text style={styles.bodyText}>
            Platform fee: {formatCurrency(booking.platformFeeAmount, booking.explorerCountryCode)}
          </Text>
          <Text style={styles.totalText}>
            Total: {formatCurrency(booking.totalAmount, booking.explorerCountryCode)}
          </Text>
          <Text style={styles.bodyText}>
            Funds held for cook after release: {formatCurrency(booking.payoutAmount, booking.explorerCountryCode)}
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Future live provider</Text>
        <Text style={styles.bodyText}>
          We should move this live flow to Paystack next. Paystack&apos;s official docs show a backend-initialized transaction flow and split payments support, which is a strong fit for a Nigeria-first marketplace.
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable style={styles.primaryButton} onPress={() => void handleCheckout()}>
        <Text style={styles.primaryButtonText}>Complete dummy payment</Text>
      </Pressable>

      {isLoading ? (
        <AuthProcessingScreen
          title="Completing dummy payment"
          subtitle="We're marking this booking as paid and opening the protected in-app thread."
        />
      ) : null}
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
    eyebrow: { color: activeTheme.primaryDark, fontSize: 14, fontWeight: "800" },
    title: { color: activeTheme.text, fontSize: 31, lineHeight: 37, fontWeight: "800" },
    subtitle: { color: activeTheme.textMuted, fontSize: 15, lineHeight: 23 },
    card: {
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    verificationCard: {
      backgroundColor: activeTheme.warmSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    sectionTitle: { color: activeTheme.text, fontSize: 20, fontWeight: "800" },
    bodyText: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    totalText: { color: activeTheme.text, fontSize: 18, fontWeight: "800" },
    errorText: { color: activeTheme.danger, fontSize: 13, lineHeight: 20 },
    input: {
      minHeight: 54,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surfaceElevated,
      paddingHorizontal: 14,
      color: activeTheme.text,
    },
    primaryButton: {
      minHeight: 56,
      borderRadius: theme.radius.md,
      backgroundColor: activeTheme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  });

