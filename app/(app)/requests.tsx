import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
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

import RoundedAvatar from "@/components/RoundedAvatar";
import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { getUserByIdentifier } from "@/lib/app-state";
import { formatCurrency } from "@/lib/currency";
import {
  acceptBookingAsCook,
  completeBookingAsCook,
  counterBookingOfferAsCook,
  declineBookingAsCook,
  isBookingThreadOpenWindow,
  isBookingThreadBlocked,
  serviceKindLabel,
  subscribeToBookingsForCurrentUser,
  type BookingRecord,
} from "@/lib/marketplace";
import { getHiddenArchivedBookingIds, hideArchivedBookingIds } from "@/lib/archived-booking-visibility";
import { getTheme, theme } from "@/theme/theme";

type ActionState =
  | { type: "accept"; booking: BookingRecord }
  | { type: "complete"; booking: BookingRecord }
  | { type: "counter"; booking: BookingRecord }
  | { type: "decline"; booking: BookingRecord }
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

export default function RequestsScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width >= 900;
  const styles = createStyles(activeTheme, isWideWeb);
  const [requests, setRequests] = useState<BookingRecord[]>([]);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [locallyDeletedRequestIds, setLocallyDeletedRequestIds] = useState<Set<string>>(() => new Set());
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<Set<string>>(() => new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToBookingsForCurrentUser(setRequests);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHiddenArchivedRequests() {
      const ids = await getHiddenArchivedBookingIds();

      if (!cancelled) {
        setLocallyDeletedRequestIds(new Set(ids));
      }
    }

    void loadHiddenArchivedRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!requests.length) {
      setPhotoMap({});
      return;
    }

    let cancelled = false;

    async function loadPhotos() {
      const entries = await Promise.all(
        requests.map(async (item) => {
          const user = await getUserByIdentifier(item.explorerId);
          return [item.explorerId, user?.photoUrl || ""] as const;
        }),
      );

      if (!cancelled) {
        setPhotoMap(Object.fromEntries(entries));
      }
    }

    void loadPhotos();

    return () => {
      cancelled = true;
    };
  }, [requests]);

  const visibleRequestRecords = useMemo(
    () => requests.filter((item) => !locallyDeletedRequestIds.has(item.id)),
    [locallyDeletedRequestIds, requests],
  );

  const groupedRequests = useMemo(() => {
    const grouped = new Map<string, BookingRecord[]>();

    visibleRequestRecords
      .slice()
      .sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || ""))
      .forEach((request) => {
        const key = request.explorerId || request.requestGroupKey || request.id;
        const existing = grouped.get(key) || [];
        existing.push(request);
        grouped.set(key, existing);
      });

    return Array.from(grouped.values());
  }, [visibleRequestRecords]);

  const activeRequests = visibleRequestRecords.filter((item) => item.status !== "cancelled" && item.status !== "declined");
  const archivedRequests = visibleRequestRecords.filter((item) => item.status === "cancelled" || item.status === "declined");
  const needsReplyCount = visibleRequestRecords.filter(
    (item) => item.status === "pending_cook" || item.status === "awaiting_explorer",
  ).length;

  function openAction(nextAction: NonNullable<ActionState>) {
    setActionState(nextAction);
    setError("");
    setNote("");
    setAmount(nextAction.booking.latestOfferAmount ? String(nextAction.booking.latestOfferAmount) : "");
  }

  async function handleSubmitAction() {
    if (!actionState) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (actionState.type === "accept") {
        await acceptBookingAsCook(actionState.booking.id, note);
      } else if (actionState.type === "complete") {
        await completeBookingAsCook(actionState.booking.id, note);
      } else if (actionState.type === "counter") {
        await counterBookingOfferAsCook(actionState.booking.id, amount, note);
      } else {
        await declineBookingAsCook(actionState.booking.id, note);
      }

      setActionState(null);
      setNote("");
      setAmount("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We could not update this request.");
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

  function selectAllArchivedRequests() {
    setSelectedArchivedIds(new Set(archivedRequests.map((item) => item.id)));
  }

  async function confirmArchivedDelete() {
    const ids = pendingDeleteIds;

    if (!ids.length) {
      setPendingDeleteIds([]);
      return;
    }

    const nextIds = await hideArchivedBookingIds(ids);
    setLocallyDeletedRequestIds(new Set(nextIds));
    setSelectedArchivedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setPendingDeleteIds([]);
  }

  const visibleGroups = groupedRequests
    .map((group) =>
      group.filter((item) =>
        showCancelled
          ? item.status === "cancelled" || item.status === "declined"
          : item.status !== "cancelled" && item.status !== "declined",
      ),
    )
    .filter((group) => group.length > 0);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundBand} />
      <View style={styles.backgroundTile} />
      <View style={styles.fixedTop}>
      <View style={styles.headerRow}>
        <View style={styles.headerGlow} />
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Cook workspace</Text>
          <Text style={styles.title}>Requests</Text>
          <Text style={styles.subtitle}>Review grouped explorer requests, counter offers, and service updates.</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>{needsReplyCount}</Text>
          </View>
          <Pressable style={styles.binButton} onPress={() => setShowCancelled((value) => !value)}>
            <Ionicons name={showCancelled ? "archive-outline" : "trash-outline"} size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <View style={styles.metricCard}>
          <Ionicons name="mail-unread-outline" size={19} color={activeTheme.primaryDark} />
          <Text style={styles.metricValue}>{needsReplyCount}</Text>
          <Text style={styles.metricLabel}>Needs reply</Text>
        </View>
        <View style={styles.metricCard}>
          <Ionicons name="restaurant-outline" size={19} color={activeTheme.primaryDark} />
          <Text style={styles.metricValue}>{activeRequests.length}</Text>
          <Text style={styles.metricLabel}>Open</Text>
        </View>
        <View style={styles.metricCard}>
          <Ionicons name="archive-outline" size={19} color={activeTheme.primaryDark} />
          <Text style={styles.metricValue}>{archivedRequests.length}</Text>
          <Text style={styles.metricLabel}>Archived</Text>
        </View>
      </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      {showCancelled && archivedRequests.length ? (
        <View style={styles.bulkBar}>
          <Pressable style={styles.bulkButton} onPress={selectAllArchivedRequests}>
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
        {(showCancelled ? archivedRequests : activeRequests).length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{showCancelled ? "No cancelled requests" : "No open requests"}</Text>
            <Text style={styles.emptyBody}>
              {showCancelled
                ? "Declined and cancelled requests will land here."
                : "New explorer requests will show here as soon as they come in."}
            </Text>
          </View>
        ) : null}

        {visibleGroups.map((group) => {
          const leadRequest = group[0];
          const isMultiRequest = group.length > 1;

          return (
            <View key={leadRequest.requestGroupKey || leadRequest.id} style={styles.groupCard}>
              <View style={[styles.groupAccent, { backgroundColor: getStatusAccentColor(leadRequest.status) }]} />
              <View style={styles.groupHeader}>
                <RoundedAvatar
                  name={leadRequest.explorerName}
                  photoUrl={photoMap[leadRequest.explorerId]}
                  size={56}
                  backgroundColor={activeTheme.accent}
                />
                <View style={styles.groupCopy}>
                  <Text style={styles.groupEyebrow}>Explorer thread</Text>
                  <Text style={styles.groupTitle}>{leadRequest.explorerName}</Text>
                  <Text style={styles.groupMeta}>
                    {isMultiRequest ? `${group.length} requests in this thread` : "1 request"}
                  </Text>
                </View>
                <View style={styles.groupCountPill}>
                  <Text style={styles.groupCountText}>{group.length}</Text>
                </View>
              </View>

              {group.map((item) => {
                const blocked = isBookingThreadBlocked(item);
                const canOpenThread = !blocked && isBookingThreadOpenWindow(item);
                const isExpanded = expandedId === item.id;

                return (
                  <View key={item.id} style={styles.requestCard}>
                    {showCancelled ? (
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
                      <View style={styles.requestIconTile}>
                        <Ionicons name="receipt-outline" size={20} color={activeTheme.primaryDark} />
                      </View>
                      <View style={styles.requestTopCopy}>
                        <Text style={styles.requestTitle}>{item.dishSummary}</Text>
                        <View style={styles.infoRow}>
                          <Ionicons name="calendar-outline" size={15} color={activeTheme.textMuted} />
                          <Text numberOfLines={1} style={styles.requestTime}>{compactServiceDate(item.serviceDateLabel)}</Text>
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
                      <View style={styles.summaryItem}>
                        <View style={styles.summaryIconWrap}>
                          <Ionicons name="wallet-outline" size={14} color={activeTheme.primaryDark} />
                        </View>
                        <Text style={styles.summaryLabel}>Payout</Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrency(item.payoutAmount, item.explorerCountryCode)}
                        </Text>
                      </View>
                      <View style={[styles.summaryItem, styles.summaryItemLarge]}>
                        <View style={styles.summaryIconWrap}>
                          <Ionicons name="home-outline" size={14} color={activeTheme.primaryDark} />
                        </View>
                        <Text style={styles.summaryLabel}>Mode</Text>
                        <Text style={styles.summaryValue}>
                          {item.serviceMode === "cook_home" ? "Cook home" : "Explorer home"}
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
                            <Ionicons name="location-outline" size={17} color={activeTheme.primaryDark} />
                            <View style={styles.detailCopy}>
                              <Text style={styles.detailLabel}>Area</Text>
                              <Text style={styles.requestDetail}>{item.areaLabel}</Text>
                            </View>
                          </View>
                          <View style={styles.detailItem}>
                            <Ionicons name="restaurant-outline" size={17} color={activeTheme.primaryDark} />
                            <View style={styles.detailCopy}>
                              <Text style={styles.detailLabel}>Service</Text>
                              <Text style={styles.requestDetail}>
                                {serviceKindLabel(item.serviceKind)} at{" "}
                                {item.serviceMode === "cook_home" ? "cook's home" : "explorer's home"}
                              </Text>
                            </View>
                          </View>
                        </View>
                        {item.wantedInMeal ? <Text style={styles.requestDetail}>Must have: {item.wantedInMeal}</Text> : null}
                        {item.avoidInMeal ? <Text style={styles.requestDetail}>Avoid: {item.avoidInMeal}</Text> : null}
                        {item.kitchenGuidance ? <Text style={styles.requestDetail}>Kitchen guidance: {item.kitchenGuidance}</Text> : null}
                        {item.fitnessGoal ? <Text style={styles.requestDetail}>Fitness goal: {item.fitnessGoal}</Text> : null}
                        {item.portionGuidance ? <Text style={styles.requestDetail}>Portion target: {item.portionGuidance}</Text> : null}
                        {item.homeAccessNotes ? <Text style={styles.requestDetail}>Home access: {item.homeAccessNotes}</Text> : null}
                        <Text style={styles.requestDetail}>
                          Explorer pays {formatCurrency(item.totalAmount, item.explorerCountryCode)} • Cook receives{" "}
                          {formatCurrency(item.payoutAmount, item.explorerCountryCode)}
                        </Text>
                        {item.latestOfferNote ? <Text style={styles.requestNote}>Latest note: {item.latestOfferNote}</Text> : null}
                        {item.cancellationReason ? <Text style={styles.requestNote}>Reason: {item.cancellationReason}</Text> : null}

                        <View style={styles.actionRow}>
                          {!item.instantMatch && !blocked && item.status !== "accepted" ? (
                            <Pressable
                              style={styles.secondaryButton}
                              onPress={() => openAction({ type: "accept", booking: item })}
                            >
                              <Ionicons name="checkmark-circle-outline" size={16} color={activeTheme.text} />
                              <Text style={styles.secondaryButtonText}>Accept</Text>
                            </Pressable>
                          ) : null}
                          {!item.instantMatch && !blocked ? (
                            <Pressable
                              style={styles.secondaryButton}
                              onPress={() => openAction({ type: "counter", booking: item })}
                            >
                              <Ionicons name="swap-horizontal-outline" size={16} color={activeTheme.text} />
                              <Text style={styles.secondaryButtonText}>Counter</Text>
                            </Pressable>
                          ) : null}
                          {!blocked ? (
                            <Pressable
                              style={styles.secondaryButton}
                              onPress={() => openAction({ type: "decline", booking: item })}
                            >
                              <Ionicons name="close-circle-outline" size={16} color={activeTheme.text} />
                              <Text style={styles.secondaryButtonText}>
                                {item.instantMatch ? "Cancel" : "Decline"}
                              </Text>
                            </Pressable>
                          ) : null}
                          {!item.instantMatch && item.status === "accepted" ? (
                            <Pressable
                              style={styles.primaryButton}
                              onPress={() => openAction({ type: "complete", booking: item })}
                            >
                              <Ionicons name="checkmark-done-outline" size={16} color="#FFFFFF" />
                              <Text style={styles.primaryButtonText}>Mark done</Text>
                            </Pressable>
                          ) : null}
                          {item.instantMatch && !blocked ? (
                            <Pressable
                              style={styles.secondaryButton}
                              onPress={() =>
                                router.push({
                                  pathname: "/live-service/[bookingId]",
                                  params: { bookingId: item.id },
                                } as never)
                              }
                            >
                              <Ionicons name="navigate-outline" size={16} color={activeTheme.text} />
                              <Text style={styles.secondaryButtonText}>
                                {item.deliveryMode === "dispatch" ? "Home address" : "Live direction"}
                              </Text>
                            </Pressable>
                          ) : null}
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
          );
        })}
      </View>

      {actionState ? (
        <View style={styles.actionSheet}>
          <Text style={styles.sheetTitle}>
            {actionState.type === "counter"
              ? "Counter this request"
              : actionState.type === "decline"
                ? "Decline request"
                : actionState.type === "complete"
                  ? "Mark service done"
                  : "Accept request"}
          </Text>
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
            placeholder={
              actionState.type === "decline"
                ? "Why are you declining?"
                : actionState.type === "complete"
                  ? "Optional note for the explorer"
                  : "Add a note"
            }
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
              onPress={() => void handleSubmitAction()}
            >
              <Text style={styles.primaryButtonText}>{isSubmitting ? "Saving..." : "Send update"}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {isSubmitting ? (
        <AuthProcessingScreen
          title="Updating request"
          subtitle="We're saving this change and updating the explorer in real time."
        />
      ) : null}
      </ScrollView>
      <Modal visible={pendingDeleteIds.length > 0} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmSheet}>
            <Text style={styles.sheetTitle}>Delete from archived?</Text>
            <Text style={styles.confirmBody}>
              This removes {pendingDeleteIds.length === 1 ? "this archived request" : `${pendingDeleteIds.length} archived requests`} from your view. Admin records stay available; only an admin can permanently delete records later.
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
    groupCard: {
      backgroundColor: activeTheme.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: activeTheme.bg === "#FFFFFF" ? "rgba(77,105,78,0.16)" : activeTheme.border,
      padding: theme.spacing.md,
      gap: 12,
      overflow: "hidden",
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 7 },
      elevation: 5,
    },
    groupAccent: {
      position: "absolute",
      left: 0,
      top: 14,
      bottom: 14,
      width: 4,
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
      backgroundColor: activeTheme.primary,
    },
    groupHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    groupCopy: { flex: 1, gap: 2, minWidth: 0 },
    groupEyebrow: { color: activeTheme.secondaryAccent, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
    groupTitle: { color: activeTheme.text, fontSize: 18, lineHeight: 23, fontWeight: "900" },
    groupMeta: { color: activeTheme.textMuted, fontSize: 13, fontWeight: "600" },
    groupCountPill: {
      minWidth: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.safeSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      paddingHorizontal: 10,
    },
    groupCountText: { color: activeTheme.primaryDark, fontSize: 14, fontWeight: "900" },
    requestCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: 13,
      gap: 11,
      backgroundColor: activeTheme.bg === "#FFFFFF" ? "#F7FAF1" : activeTheme.safeSurface,
    },
    selectCircle: {
      position: "absolute",
      top: 9,
      right: 9,
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
    requestHeaderButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    requestIconTile: {
      width: 40,
      height: 40,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
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
    infoRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    requestTime: { flex: 1, color: activeTheme.textMuted, fontSize: 13, fontWeight: "700" },
    summaryStrip: {
      flexDirection: "row",
      gap: 10,
      borderRadius: 19,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: 9,
    },
    summaryItem: {
      flex: 1,
      minHeight: 58,
      borderRadius: 15,
      padding: 9,
      gap: 3,
      justifyContent: "flex-end",
      backgroundColor: activeTheme.bg,
    },
    summaryItemLarge: {
      flex: 1.25,
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
      backgroundColor: activeTheme.surface,
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
      backgroundColor: activeTheme.bg,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    detailCopy: { flex: 1, gap: 2, minWidth: 0 },
    detailLabel: { color: activeTheme.textMuted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
    requestDetail: { color: activeTheme.text, fontSize: 13, lineHeight: 20, fontWeight: "700" },
    requestNote: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20 },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 2 },
    secondaryButton: {
      flexDirection: "row",
      gap: 7,
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: activeTheme.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
    },
    secondaryButtonText: { color: activeTheme.text, fontSize: 14, fontWeight: "700" },
    primaryButton: {
      flexDirection: "row",
      gap: 7,
      minHeight: 42,
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
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.danger,
    },
    dangerButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
    blockedPill: {
      minHeight: 42,
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
    modalBackdrop: {
      flex: 1,
      padding: theme.spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(14,15,12,0.34)",
    },
    confirmSheet: {
      width: "100%",
      maxWidth: 520,
      backgroundColor: activeTheme.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
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
