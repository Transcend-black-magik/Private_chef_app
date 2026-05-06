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
import { getHiddenArchivedBookingIds, hideArchivedBookingIds } from "@/lib/archived-booking-visibility";
import { subscribeToNotificationsForCurrentUser } from "@/lib/notifications";
import { getTheme, theme } from "@/theme/theme";

type ActionState =
  | { type: "reschedule"; booking: BookingRecord }
  | { type: "counter"; booking: BookingRecord }
  | { type: "cancel"; booking: BookingRecord }
  | null;

function prettifyStatus(status: BookingRecord["status"]) {
  return status.replace(/_/g, " ");
}

function compactServiceDate(value: string) {
  return value
    .replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/i, "")
    .replace(/\b(\w+)\s+(\d{1,2}),\s*(\d{4})/i, "$1 $2")
    .replace(/\s+at\s+/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getStatusAccentColor(status: BookingRecord["status"]) {
  if (status === "accepted" || status === "completed" || status === "funds_released") {
    return "#4D9F6F";
  }

  if (status === "cancelled" || status === "declined") {
    return "#9B8B7B";
  }

  if (status === "awaiting_explorer" || status === "pending_payment") {
    return "#D89B35";
  }

  return "#4D694E";
}

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
  const [locallyDeletedBookingIds, setLocallyDeletedBookingIds] = useState<Set<string>>(() => new Set());
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<Set<string>>(() => new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
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

  useEffect(() => {
    let cancelled = false;

    async function loadHiddenArchivedBookings() {
      const ids = await getHiddenArchivedBookingIds();

      if (!cancelled) {
        setLocallyDeletedBookingIds(new Set(ids));
      }
    }

    void loadHiddenArchivedBookings();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleBookingRecords = bookings.filter((item) => !locallyDeletedBookingIds.has(item.id));
  const liveBookings = visibleBookingRecords.filter(
    (item) =>
      item.status !== "completed" &&
      item.status !== "funds_released" &&
      item.status !== "cancelled" &&
      item.status !== "declined",
  );
  const archivedBookings = visibleBookingRecords.filter(
    (item) => item.status === "cancelled" || item.status === "declined",
  );
  const completedBookings = visibleBookingRecords.filter(
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

  function toggleArchivedSelection(bookingId: string) {
    setSelectedArchivedIds((current) => {
      const next = new Set(current);
      if (next.has(bookingId)) {
        next.delete(bookingId);
      } else {
        next.add(bookingId);
      }
      return next;
    });
  }

  function selectAllArchivedBookings() {
    setSelectedArchivedIds(new Set(archivedBookings.map((item) => item.id)));
  }

  async function confirmArchivedDelete() {
    const ids = pendingDeleteIds;

    if (!ids.length) {
      setPendingDeleteIds([]);
      return;
    }

    const nextIds = await hideArchivedBookingIds(ids);
    setLocallyDeletedBookingIds(new Set(nextIds));
    setSelectedArchivedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setPendingDeleteIds([]);
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
      <View style={styles.fixedTop}>
      <View style={styles.headerRow}>
        <View style={styles.headerGlow} />
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Explorer bookings</Text>
          <Text style={styles.title}>Bookings</Text>
          <Text style={styles.subtitle}>Track active meals, offers, payment holds, and release decisions.</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.binButton, bookingView === "completed" && styles.binButtonActive]}
            onPress={() => setBookingView((value) => (value === "completed" ? "active" : "completed"))}
          >
            <Ionicons name="checkmark-done-outline" size={18} color={bookingView === "completed" ? "#171713" : "#FFFFFF"} />
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
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      {bookingView === "cancelled" && archivedBookings.length ? (
        <View style={styles.bulkBar}>
          <Pressable style={styles.bulkButton} onPress={selectAllArchivedBookings}>
            <Ionicons name="checkbox-outline" size={16} color={activeTheme.text} />
            <Text style={styles.bulkButtonText}>Select all</Text>
          </Pressable>
          <Text style={styles.bulkMeta}>{selectedArchivedIds.size} selected</Text>
          <Pressable
            style={[styles.bulkDeleteButton, !selectedArchivedIds.size && styles.bulkDeleteButtonDisabled]}
            disabled={!selectedArchivedIds.size}
            onPress={() => setPendingDeleteIds(Array.from(selectedArchivedIds))}
          >
            <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
            <Text style={styles.bulkDeleteText}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
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
              <View style={[styles.cardAccent, { backgroundColor: getStatusAccentColor(item.status) }]} />
              {bookingView === "cancelled" ? (
                <Pressable
                  style={[styles.selectCircle, selectedArchivedIds.has(item.id) && styles.selectCircleActive]}
                  onPress={() => toggleArchivedSelection(item.id)}
                >
                  {selectedArchivedIds.has(item.id) ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
                </Pressable>
              ) : null}
              <Pressable
                style={styles.requestHeaderButton}
                onPress={() => setExpandedId((current) => (current === item.id ? null : item.id))}
              >
                <View style={styles.avatarTile}>
                  <Ionicons name="restaurant-outline" size={21} color={activeTheme.primaryDark} />
                </View>
                <View style={styles.requestTopCopy}>
                  <Text style={styles.requestTitle}>{item.cookName}</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color={activeTheme.textMuted} />
                    <Text numberOfLines={1} style={styles.infoText}>{compactServiceDate(item.serviceDateLabel)}</Text>
                  </View>
                </View>
                <View style={styles.requestHeaderRight}>
                  <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>{prettifyStatus(item.status)}</Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={activeTheme.textMuted}
                  />
                </View>
              </Pressable>

              <View style={styles.summaryStrip}>
                <View style={[styles.summaryItem, styles.summaryItemLarge]}>
                  <View style={styles.summaryIconWrap}>
                    <Ionicons name="sparkles-outline" size={14} color={activeTheme.primaryDark} />
                  </View>
                  <Text style={styles.summaryLabel}>Meal</Text>
                  <Text numberOfLines={1} style={styles.summaryValue}>{item.dishSummary}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <View style={styles.summaryIconWrap}>
                    <Ionicons name="card-outline" size={14} color={activeTheme.primaryDark} />
                  </View>
                  <Text style={styles.summaryLabel}>Total</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(item.totalAmount, item.explorerCountryCode)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <View style={styles.summaryIconWrap}>
                    <Ionicons name="people-outline" size={14} color={activeTheme.primaryDark} />
                  </View>
                  <Text style={styles.summaryLabel}>Guests</Text>
                  <Text style={styles.summaryValue}>{item.guestCount || "1"}</Text>
                </View>
              </View>

              {isExpanded ? (
                <View style={styles.expandedPanel}>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}>
                      <Ionicons name="receipt-outline" size={17} color={activeTheme.primaryDark} />
                      <View style={styles.detailCopy}>
                        <Text style={styles.detailLabel}>Total held</Text>
                        <Text style={styles.requestDetail}>
                          {formatCurrency(item.totalAmount, item.explorerCountryCode)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="shield-checkmark-outline" size={17} color={activeTheme.primaryDark} />
                      <View style={styles.detailCopy}>
                        <Text style={styles.detailLabel}>Funds</Text>
                        <Text style={styles.requestDetail}>{item.fundsReleaseStatus.replace(/_/g, " ")}</Text>
                      </View>
                    </View>
                  </View>
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
                        <Ionicons name="chatbubble-outline" size={16} color={activeTheme.text} />
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
                        <Ionicons name="calendar-clear-outline" size={16} color={activeTheme.text} />
                        <Text style={styles.secondaryButtonText}>Reschedule</Text>
                      </Pressable>
                    ) : null}

                    {!blocked && item.status !== "funds_released" ? (
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => openAction({ type: "counter", booking: item })}
                      >
                        <Ionicons name="swap-horizontal-outline" size={16} color={activeTheme.text} />
                        <Text style={styles.secondaryButtonText}>Counter</Text>
                      </Pressable>
                    ) : null}

                    {item.status === "awaiting_explorer" ? (
                      <Pressable
                        style={styles.primaryButton}
                        onPress={() => void acceptCounterOfferAsExplorer(item.id)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
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
                        <Ionicons name="lock-closed-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Hold funds</Text>
                      </Pressable>
                    ) : null}

                    {canRelease ? (
                      <Pressable
                        style={styles.primaryButton}
                        onPress={() => void releaseBookingFundsAsExplorer(item.id)}
                      >
                        <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Trust/release</Text>
                      </Pressable>
                    ) : null}

                    {!blocked && item.status !== "funds_released" ? (
                      <Pressable
                        style={styles.dangerButton}
                        onPress={() => openAction({ type: "cancel", booking: item })}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.dangerButtonText}>Cancel</Text>
                      </Pressable>
                    ) : null}

                    {(item.status === "cancelled" || item.status === "declined") ? (
                      <Pressable
                        style={styles.dangerButton}
                        onPress={() => setPendingDeleteIds([item.id])}
                      >
                        <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.dangerButtonText}>Delete</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
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
      <Modal visible={pendingDeleteIds.length > 0} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.actionSheet}>
            <Text style={styles.sheetTitle}>Delete from archived?</Text>
            <Text style={styles.confirmBody}>
              This removes {pendingDeleteIds.length === 1 ? "this archived booking" : `${pendingDeleteIds.length} archived bookings`} from your view. Admin records stay available; only an admin can permanently delete records later.
            </Text>
            <View style={styles.sheetActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setPendingDeleteIds([])}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.dangerButton} onPress={() => void confirmArchivedDelete()}>
                <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                <Text style={styles.dangerButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
      paddingTop: theme.spacing.md,
      paddingBottom: 120,
      gap: theme.spacing.md,
      width: "100%",
      alignSelf: "center",
    },
    fixedTop: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: isWideWeb ? theme.spacing.lg : theme.layout.screenTop - 18,
      backgroundColor: activeTheme.bg,
      gap: theme.spacing.md,
      zIndex: 5,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      borderRadius: 34,
      padding: theme.spacing.lg,
      minHeight: isWideWeb ? 220 : 178,
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
      marginTop: isWideWeb ? -theme.spacing.lg : -theme.layout.screenTop + 18,
      paddingTop: isWideWeb ? theme.spacing.lg : theme.layout.screenTop - 2,
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
    title: { color: "#FFFFFF", fontSize: isWideWeb ? 44 : 32, lineHeight: isWideWeb ? 50 : 38, fontWeight: "900" },
    subtitle: { color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 19, maxWidth: 560 },
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
      marginTop: -30,
    },
    metricCard: {
      flex: 1,
      minHeight: 88,
      borderRadius: 20,
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
    bulkBar: {
      minHeight: 54,
      borderRadius: 20,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    bulkButton: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: activeTheme.surfaceElevated,
    },
    bulkButtonText: { color: activeTheme.text, fontSize: 12, fontWeight: "900" },
    bulkMeta: { flex: 1, color: activeTheme.textMuted, fontSize: 12, fontWeight: "800" },
    bulkDeleteButton: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: activeTheme.danger,
    },
    bulkDeleteButtonDisabled: { opacity: 0.42 },
    bulkDeleteText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
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
      borderRadius: 24,
      borderWidth: 1,
      borderColor: activeTheme.bg === "#FFFFFF" ? "rgba(77,105,78,0.16)" : activeTheme.border,
      padding: theme.spacing.md,
      gap: 11,
      overflow: "hidden",
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 7 },
      elevation: 5,
    },
    selectCircle: {
      position: "absolute",
      top: 10,
      right: 10,
      zIndex: 4,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    selectCircleActive: {
      backgroundColor: activeTheme.primaryDark,
      borderColor: activeTheme.primaryDark,
    },
    cardAccent: {
      position: "absolute",
      left: 0,
      top: 14,
      bottom: 14,
      width: 4,
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
      backgroundColor: activeTheme.primary,
    },
    requestHeaderButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    avatarTile: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.safeSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    requestTopCopy: { flex: 1, gap: 5, minWidth: 0 },
    requestHeaderRight: { alignItems: "flex-end", gap: 8 },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: activeTheme.surfaceElevated,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: activeTheme.border,
      maxWidth: 146,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: activeTheme.secondaryAccent,
    },
    statusText: { color: activeTheme.accent, fontSize: 12, fontWeight: "900", textTransform: "capitalize" },
    requestTitle: { color: activeTheme.text, fontSize: 18, lineHeight: 23, fontWeight: "900" },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    infoText: { flex: 1, color: activeTheme.textMuted, fontSize: 13, fontWeight: "700" },
    summaryStrip: {
      flexDirection: "row",
      gap: 10,
      borderRadius: 20,
      backgroundColor: activeTheme.bg === "#FFFFFF" ? "#F7FAF1" : activeTheme.safeSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: 8,
    },
    summaryItem: {
      flex: 1,
      minHeight: 58,
      borderRadius: 15,
      padding: 9,
      gap: 3,
      justifyContent: "flex-end",
      backgroundColor: activeTheme.surface,
    },
    summaryItemLarge: {
      flex: 1.35,
    },
    summaryIconWrap: {
      position: "absolute",
      top: 9,
      right: 9,
      width: 21,
      height: 21,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surfaceElevated,
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
    expandedPanel: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.bg,
      padding: 12,
      gap: 10,
    },
    detailGrid: { flexDirection: "row", gap: 10 },
    detailItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      borderRadius: 18,
      padding: 12,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    detailCopy: { flex: 1, gap: 2, minWidth: 0 },
    detailLabel: { color: activeTheme.textMuted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
    requestDetail: { color: activeTheme.text, fontSize: 13, lineHeight: 19, fontWeight: "800" },
    requestNote: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20 },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
    secondaryButton: {
      flexDirection: "row",
      gap: 7,
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
      flexDirection: "row",
      gap: 7,
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
      flexDirection: "row",
      gap: 7,
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
    confirmBody: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 21 },
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
