import { useEffect, useState } from "react";
import {
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Platform,
  useColorScheme,
  useWindowDimensions,
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
  isBookingThreadOpenWindow,
  isBookingThreadBlocked,
  releaseBookingFundsAsExplorer,
  rescheduleBookingAsExplorer,
  subscribeToBookingsForCurrentUser,
  type BookingRecord,
} from "@/lib/marketplace";
import { subscribeToNotificationsForCurrentUser } from "@/lib/notifications";
import { getTheme, theme } from "@/theme/theme";

type ActionState =
  | { type: "reschedule"; booking: BookingRecord }
  | { type: "counter"; booking: BookingRecord }
  | { type: "cancel"; booking: BookingRecord }
  | null;

export default function BookingsScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width >= 900;
  const styles = createStyles(activeTheme, isWideWeb);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [dateValue, setDateValue] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingView, setBookingView] = useState<"active" | "cancelled" | "completed">("active");
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToBookingsForCurrentUser(setBookings);
    return () => unsubscribe();
  }, []);

  useEffect(
    () =>
      subscribeToNotificationsForCurrentUser((items) => {
        setUnreadNotifications(items.filter((item) => !item.read).length);
      }),
    [],
  );

  const liveBookings = bookings.filter(
    (item) =>
      item.status !== "completed" &&
      item.status !== "funds_released" &&
      item.status !== "cancelled" &&
      item.status !== "declined",
  );
  const archivedBookings = bookings.filter(
    (item) => item.status === "cancelled" || item.status === "declined",
  );
  const completedBookings = bookings.filter(
    (item) => item.status === "completed" || item.status === "funds_released",
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

  const visibleBookings =
    bookingView === "cancelled"
      ? archivedBookings
      : bookingView === "completed"
        ? completedBookings
        : liveBookings;

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundBand} />
      <View style={styles.backgroundTile} />
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <View style={styles.headerRow}>
        <View style={styles.headerGlow} />
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Explorer bookings</Text>
          <Text style={styles.title}>Bookings</Text>
          <Text style={styles.subtitle}>Track active meals, offers, payment holds, and release decisions.</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>{liveBookings.length}</Text>
          </View>
          <Pressable
            style={[styles.binButton, bookingView === "completed" && styles.binButtonActive]}
            onPress={() => setBookingView((value) => (value === "completed" ? "active" : "completed"))}
          >
            <Ionicons name="wallet-outline" size={18} color={bookingView === "completed" ? "#171713" : "#FFFFFF"} />
          </Pressable>
          <Pressable
            style={[styles.binButton, bookingView === "cancelled" && styles.binButtonActive]}
            onPress={() => setBookingView((value) => (value === "cancelled" ? "active" : "cancelled"))}
          >
            <Ionicons name={bookingView === "cancelled" ? "archive-outline" : "trash-outline"} size={18} color={bookingView === "cancelled" ? "#171713" : "#FFFFFF"} />
          </Pressable>
          <Pressable style={styles.binButton} onPress={() => router.push("/notifications" as never)}>
            <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
            {unreadNotifications ? (
              <View style={styles.smallBadge}>
                <Text style={styles.smallBadgeText}>{unreadNotifications}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <View style={styles.metricCard}>
          <Ionicons name="flame-outline" size={19} color={activeTheme.primaryDark} />
          <Text style={styles.metricValue}>{liveBookings.length}</Text>
          <Text style={styles.metricLabel}>Active</Text>
        </View>
        <View style={styles.metricCard}>
          <Ionicons name="checkmark-done-outline" size={19} color={activeTheme.primaryDark} />
          <Text style={styles.metricValue}>{completedBookings.length}</Text>
          <Text style={styles.metricLabel}>Completed</Text>
        </View>
        <View style={styles.metricCard}>
          <Ionicons name="archive-outline" size={19} color={activeTheme.primaryDark} />
          <Text style={styles.metricValue}>{archivedBookings.length}</Text>
          <Text style={styles.metricLabel}>Archived</Text>
        </View>
      </View>

      <View style={styles.stack}>
        {visibleBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {bookingView === "cancelled"
                ? "No cancelled bookings"
                : bookingView === "completed"
                  ? "No completed bookings"
                  : "No active bookings"}
            </Text>
            <Text style={styles.emptyBody}>
              {bookingView === "cancelled"
                ? "Cancelled or declined bookings will be moved here."
                : bookingView === "completed"
                  ? "Completed services and released funds will show here."
                : "Once you start sending requests, they will appear here in real time."}
            </Text>
          </View>
        ) : null}

        {visibleBookings.map((item) => {
          const blocked = isBookingThreadBlocked(item);
          const canOpenThread = !blocked && isBookingThreadOpenWindow(item);
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

              <View style={styles.summaryStrip}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Meal</Text>
                  <Text numberOfLines={1} style={styles.summaryValue}>{item.dishSummary}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(item.totalAmount, item.explorerCountryCode)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Guests</Text>
                  <Text style={styles.summaryValue}>{item.guestCount || "1"}</Text>
                </View>
              </View>

              {isExpanded ? (
                <>
                  <Text style={styles.requestDetail}>
                    Total {formatCurrency(item.totalAmount, item.explorerCountryCode)} • Cook payout{" "}
                    {formatCurrency(item.payoutAmount, item.explorerCountryCode)}
                  </Text>
                  {item.latestOfferNote ? <Text style={styles.requestNote}>Latest note: {item.latestOfferNote}</Text> : null}

                  <View style={styles.actionRow}>
                    {canOpenThread ? (
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
                        <Text style={styles.blockedPillText}>
                          {blocked ? "Thread closed" : "Thread opens near service time"}
                        </Text>
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

      {isSubmitting ? (
        <AuthProcessingScreen
          title="Updating booking"
          subtitle="We're saving this change and updating the cook in real time."
        />
      ) : null}
      </ScrollView>
      <Modal visible={Boolean(actionState)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.actionSheet}>
            <Text style={styles.sheetTitle}>
              {actionState?.type === "counter"
                ? "Counter the price"
                : actionState?.type === "reschedule"
                  ? "Reschedule booking"
                  : "Cancel booking"}
            </Text>

            {actionState?.type === "reschedule" ? (
              <TextInput
                value={dateValue}
                onChangeText={setDateValue}
                placeholder="New date and time"
                placeholderTextColor={activeTheme.textMuted}
                style={styles.input}
              />
            ) : null}

            {actionState?.type === "counter" ? (
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
              placeholder={actionState?.type === "cancel" ? "Optional final note" : "Add a note"}
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
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>, isWideWeb: boolean) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    scrollArea: { flex: 1 },
    backgroundBand: {
      position: "absolute",
      top: -70,
      left: -40,
      right: -40,
      height: 230,
      borderBottomLeftRadius: 48,
      borderBottomRightRadius: 48,
      backgroundColor: activeTheme.warmSurface,
      transform: [{ rotate: "-3deg" }],
      opacity: activeTheme.bg === "#FFFFFF" ? 1 : 0.14,
    },
    backgroundTile: {
      position: "absolute",
      top: 128,
      right: -82,
      width: 220,
      height: 130,
      borderRadius: 34,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.safeSurface,
      transform: [{ rotate: "12deg" }],
      opacity: activeTheme.bg === "#FFFFFF" ? 0.72 : 0.12,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: isWideWeb ? theme.spacing.xxl : theme.layout.screenTop,
      paddingBottom: 120,
      gap: theme.spacing.lg,
      width: "100%",
      alignSelf: "center",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      borderRadius: 34,
      padding: theme.spacing.lg,
      minHeight: isWideWeb ? 300 : 250,
      overflow: "hidden",
      backgroundColor: activeTheme.primaryDark,
      borderWidth: 1,
      borderColor: activeTheme.primaryDark,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
      marginHorizontal: -theme.spacing.lg,
      marginTop: isWideWeb ? -theme.spacing.xxl : -theme.layout.screenTop,
      paddingTop: isWideWeb ? theme.spacing.xxl : theme.layout.screenTop,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    },
    headerGlow: {
      position: "absolute",
      right: -60,
      bottom: -80,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: "rgba(255,255,255,0.14)",
    },
    headerCopy: { flex: 1, gap: 5, paddingRight: 16 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    kicker: { color: "#FFE0BD", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
    title: { color: "#FFFFFF", fontSize: isWideWeb ? 52 : 38, lineHeight: isWideWeb ? 58 : 44, fontWeight: "900" },
    subtitle: { color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 21, maxWidth: 560 },
    headerPill: {
      minWidth: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.16)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      paddingHorizontal: 10,
    },
    headerPillText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
    binButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.16)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },
    binButtonActive: {
      backgroundColor: "#FFFFFF",
      borderColor: "#FFFFFF",
    },
    metricGrid: {
      flexDirection: "row",
      gap: 10,
      marginTop: -44,
    },
    metricCard: {
      flex: 1,
      minHeight: 112,
      borderRadius: 24,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      justifyContent: "space-between",
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    metricValue: { color: activeTheme.text, fontSize: 26, fontWeight: "900" },
    metricLabel: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
    smallBadge: {
      position: "absolute",
      top: -5,
      right: -5,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: activeTheme.secondaryAccent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
    },
    smallBadgeText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "900",
    },
    stack: { gap: theme.spacing.md },
    emptyCard: {
      backgroundColor: activeTheme.surface,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 6,
    },
    emptyTitle: { color: activeTheme.text, fontSize: 17, fontWeight: "800" },
    emptyBody: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    requestCard: {
      backgroundColor: activeTheme.surface,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 12,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
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
    summaryStrip: {
      flexDirection: "row",
      gap: 8,
      borderRadius: 20,
      backgroundColor: activeTheme.safeSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: 10,
    },
    summaryItem: {
      flex: 1,
      gap: 2,
    },
    summaryLabel: {
      color: activeTheme.textMuted,
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    summaryValue: {
      color: activeTheme.text,
      fontSize: 12,
      fontWeight: "900",
    },
    requestDetail: { display: "none" },
    requestNote: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20 },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
    secondaryButton: {
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: theme.radius.pill,
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
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primary,
    },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
    dangerButton: {
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: theme.radius.pill,
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
    modalBackdrop: {
      flex: 1,
      padding: theme.spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(14,15,12,0.46)",
    },
    actionSheet: {
      backgroundColor: activeTheme.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      width: "100%",
      maxWidth: 520,
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
