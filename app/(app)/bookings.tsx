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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { formatCurrency } from "@/lib/currency";
import {
  acceptCounterOfferAsExplorer,
  cancelBookingAsExplorer,
  counterBookingOfferAsExplorer,
  isBookingThreadBlocked,
  releaseBookingFundsAsExplorer,
  rescheduleBookingAsExplorer,
  serviceKindLabel,
  subscribeToBookingsForCurrentUser,
  type BookingRecord,
} from "@/lib/marketplace";
import { getTheme, theme } from "@/theme/theme";

type ActionState =
  | { type: "reschedule"; booking: BookingRecord }
  | { type: "counter"; booking: BookingRecord }
  | { type: "cancel"; booking: BookingRecord }
  | null;

export default function BookingsScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [dateValue, setDateValue] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToBookingsForCurrentUser(setBookings);
    return () => unsubscribe();
  }, []);

  const liveBookings = bookings.filter(
    (item) =>
      item.status !== "funds_released" &&
      item.status !== "cancelled" &&
      item.status !== "declined",
  );
  const archivedBookings = bookings.filter(
    (item) => item.status === "cancelled" || item.status === "declined",
  );

  function openAction(nextAction: NonNullable<ActionState>) {
    setActionState(nextAction);
    setError("");
    setNote("");
    setDateValue(nextAction.booking.serviceDateLabel);
    setAmount(nextAction.booking.latestOfferAmount ? String(nextAction.booking.latestOfferAmount) : "");
  }

  async function handleActionSubmit() {
    if (!actionState) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (actionState.type === "cancel") {
        await cancelBookingAsExplorer(actionState.booking.id);
      } else if (actionState.type === "reschedule") {
        await rescheduleBookingAsExplorer(actionState.booking.id, dateValue, note);
      } else {
        await counterBookingOfferAsExplorer(actionState.booking.id, amount, note);
      }

      setActionState(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We could not update this booking.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const visibleBookings = showCancelled
    ? archivedBookings
    : bookings.filter((item) => item.status !== "cancelled" && item.status !== "declined");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Bookings</Text>
        <View style={styles.headerActions}>
          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>{liveBookings.length}</Text>
          </View>
          <Pressable style={styles.binButton} onPress={() => setShowCancelled((value) => !value)}>
            <Ionicons name={showCancelled ? "archive-outline" : "trash-outline"} size={18} color={activeTheme.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.stack}>
        {visibleBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{showCancelled ? "No cancelled bookings" : "No active bookings"}</Text>
            <Text style={styles.emptyBody}>
              {showCancelled
                ? "Cancelled or declined bookings will be moved here."
                : "Once you start sending requests, they will appear here in real time."}
            </Text>
          </View>
        ) : null}

        {visibleBookings.map((item) => {
          const blocked = isBookingThreadBlocked(item);
          const canRelease = item.status === "completed" && item.fundsReleaseStatus === "held";
          const isExpanded = expandedId === item.id;

          return (
            <View key={item.id} style={styles.requestCard}>
              <Pressable
                style={styles.requestHeaderButton}
                onPress={() => setExpandedId((current) => (current === item.id ? null : item.id))}
              >
                <View style={styles.requestTopCopy}>
                  <Text style={styles.requestTitle}>{item.cookName}</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color={activeTheme.textMuted} />
                    <Text style={styles.infoText}>{item.serviceDateLabel}</Text>
                  </View>
                </View>
                <View style={styles.requestHeaderRight}>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>{item.status.replace(/_/g, " ")}</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={activeTheme.textMuted}
                  />
                </View>
              </Pressable>

              {isExpanded ? (
                <>
                  <Text style={styles.requestDetail}>{item.dishSummary}</Text>
                  <Text style={styles.requestDetail}>
                    {serviceKindLabel(item.serviceKind)} at{" "}
                    {item.serviceMode === "cook_home" ? "cook's home" : "your home"}
                  </Text>
                  {item.wantedInMeal ? <Text style={styles.requestDetail}>Must have: {item.wantedInMeal}</Text> : null}
                  {item.avoidInMeal ? <Text style={styles.requestDetail}>Avoid: {item.avoidInMeal}</Text> : null}
                  {item.kitchenGuidance ? <Text style={styles.requestDetail}>Kitchen guidance: {item.kitchenGuidance}</Text> : null}
                  {item.fitnessGoal ? <Text style={styles.requestDetail}>Fitness goal: {item.fitnessGoal}</Text> : null}
                  {item.portionGuidance ? <Text style={styles.requestDetail}>Portion target: {item.portionGuidance}</Text> : null}
                  {item.homeAccessNotes ? <Text style={styles.requestDetail}>Home access: {item.homeAccessNotes}</Text> : null}
                  <Text style={styles.requestDetail}>Guests: {item.guestCount}</Text>
                  <Text style={styles.requestDetail}>
                    Total {formatCurrency(item.totalAmount, item.explorerCountryCode)} • Cook payout{" "}
                    {formatCurrency(item.payoutAmount, item.explorerCountryCode)}
                  </Text>
                  {item.latestOfferNote ? <Text style={styles.requestNote}>Latest note: {item.latestOfferNote}</Text> : null}
                  {item.cancellationReason ? <Text style={styles.requestNote}>Reason: {item.cancellationReason}</Text> : null}

                  <View style={styles.actionRow}>
                    {!blocked ? (
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() =>
                          router.push({
                            pathname: "/chat-thread/[id]",
                            params: { id: item.threadId },
                          })
                        }
                      >
                        <Text style={styles.secondaryButtonText}>Open thread</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.blockedPill}>
                        <Text style={styles.blockedPillText}>Thread blocked</Text>
                      </View>
                    )}

                    {!blocked && item.status !== "funds_released" ? (
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => openAction({ type: "reschedule", booking: item })}
                      >
                        <Text style={styles.secondaryButtonText}>Reschedule</Text>
                      </Pressable>
                    ) : null}

                    {!blocked && item.status !== "funds_released" ? (
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => openAction({ type: "counter", booking: item })}
                      >
                        <Text style={styles.secondaryButtonText}>Counter</Text>
                      </Pressable>
                    ) : null}

                    {item.status === "awaiting_explorer" ? (
                      <Pressable
                        style={styles.primaryButton}
                        onPress={() => void acceptCounterOfferAsExplorer(item.id)}
                      >
                        <Text style={styles.primaryButtonText}>Accept offer</Text>
                      </Pressable>
                    ) : null}

                    {item.status === "pending_payment" ? (
                      <Pressable
                        style={styles.primaryButton}
                        onPress={() =>
                          router.push({
                            pathname: "/checkout/[bookingId]",
                            params: { bookingId: item.id, threadId: item.threadId },
                          })
                        }
                      >
                        <Text style={styles.primaryButtonText}>Hold funds</Text>
                      </Pressable>
                    ) : null}

                    {canRelease ? (
                      <Pressable
                        style={styles.primaryButton}
                        onPress={() => void releaseBookingFundsAsExplorer(item.id)}
                      >
                        <Text style={styles.primaryButtonText}>Trust/release</Text>
                      </Pressable>
                    ) : null}

                    {!blocked && item.status !== "funds_released" ? (
                      <Pressable
                        style={styles.dangerButton}
                        onPress={() => openAction({ type: "cancel", booking: item })}
                      >
                        <Text style={styles.dangerButtonText}>Cancel</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              ) : null}
            </View>
          );
        })}
      </View>

      {actionState ? (
        <View style={styles.actionSheet}>
          <Text style={styles.sheetTitle}>
            {actionState.type === "counter"
              ? "Counter the price"
              : actionState.type === "reschedule"
                ? "Reschedule booking"
                : "Cancel booking"}
          </Text>

          {actionState.type === "reschedule" ? (
            <TextInput
              value={dateValue}
              onChangeText={setDateValue}
              placeholder="New date and time"
              placeholderTextColor={activeTheme.textMuted}
              style={styles.input}
            />
          ) : null}

          {actionState.type === "counter" ? (
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="New subtotal"
              placeholderTextColor={activeTheme.textMuted}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          ) : null}

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={actionState.type === "cancel" ? "Optional final note" : "Add a note"}
            placeholderTextColor={activeTheme.textMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.sheetActions}>
            <Pressable style={styles.secondaryButton} onPress={() => setActionState(null)}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
              disabled={isSubmitting}
              onPress={() => void handleActionSubmit()}
            >
              <Text style={styles.primaryButtonText}>{isSubmitting ? "Saving..." : "Confirm"}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {isSubmitting ? (
        <AuthProcessingScreen
          title="Updating booking"
          subtitle="We're saving this change and updating the cook in real time."
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
      paddingBottom: 120,
      gap: theme.spacing.md,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    title: { color: activeTheme.text, fontSize: 30, lineHeight: 34, fontWeight: "800" },
    headerPill: {
      minWidth: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surfaceElevated,
      borderWidth: 1,
      borderColor: activeTheme.border,
      paddingHorizontal: 10,
    },
    headerPillText: { color: activeTheme.text, fontSize: 13, fontWeight: "800" },
    binButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surfaceElevated,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    stack: { gap: theme.spacing.md },
    emptyCard: {
      backgroundColor: activeTheme.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 6,
    },
    emptyTitle: { color: activeTheme.text, fontSize: 17, fontWeight: "800" },
    emptyBody: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    requestCard: {
      backgroundColor: activeTheme.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 10,
    },
    requestHeaderButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    requestTopCopy: { flex: 1, gap: 4 },
    requestHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
    statusPill: {
      alignSelf: "flex-start",
      backgroundColor: activeTheme.surfaceElevated,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    statusText: { color: activeTheme.accent, fontSize: 13, fontWeight: "800" },
    requestTitle: { color: activeTheme.text, fontSize: 20, fontWeight: "800" },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    infoText: { color: activeTheme.textMuted, fontSize: 14, fontWeight: "600" },
    requestDetail: { color: activeTheme.text, fontSize: 15, lineHeight: 23 },
    requestNote: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20 },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
    secondaryButton: {
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.bg,
    },
    secondaryButtonText: { color: activeTheme.text, fontSize: 14, fontWeight: "700" },
    primaryButton: {
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primary,
    },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
    dangerButton: {
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.danger,
    },
    dangerButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
    blockedPill: {
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surfaceElevated,
    },
    blockedPillText: { color: activeTheme.textMuted, fontSize: 13, fontWeight: "700" },
    actionSheet: {
      backgroundColor: activeTheme.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    sheetTitle: { color: activeTheme.text, fontSize: 19, fontWeight: "800" },
    input: {
      backgroundColor: activeTheme.bg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
      color: activeTheme.text,
      fontSize: 15,
    },
    textArea: { minHeight: 100, textAlignVertical: "top" },
    sheetActions: { flexDirection: "row", gap: 10 },
    errorText: { color: activeTheme.danger, fontSize: 13, lineHeight: 20 },
  });
