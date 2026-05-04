import { useEffect, useMemo, useState } from "react";
import {
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
import { getTheme, theme } from "@/theme/theme";

type ActionState =
  | { type: "accept"; booking: BookingRecord }
  | { type: "complete"; booking: BookingRecord }
  | { type: "counter"; booking: BookingRecord }
  | { type: "decline"; booking: BookingRecord }
  | null;

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

  useEffect(() => {
    const unsubscribe = subscribeToBookingsForCurrentUser(setRequests);
    return () => unsubscribe();
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

  const groupedRequests = useMemo(() => {
    const grouped = new Map<string, BookingRecord[]>();

    requests
      .slice()
      .sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || ""))
      .forEach((request) => {
        const key = request.explorerId || request.requestGroupKey || request.id;
        const existing = grouped.get(key) || [];
        existing.push(request);
        grouped.set(key, existing);
      });

    return Array.from(grouped.values());
  }, [requests]);

  const activeRequests = requests.filter((item) => item.status !== "cancelled" && item.status !== "declined");
  const archivedRequests = requests.filter((item) => item.status === "cancelled" || item.status === "declined");
  const needsReplyCount = requests.filter(
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
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never">
      <View style={styles.headerRow}>
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
            <Ionicons name={showCancelled ? "archive-outline" : "trash-outline"} size={18} color={activeTheme.text} />
          </Pressable>
        </View>
      </View>

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
              <View style={styles.groupHeader}>
                <RoundedAvatar
                  name={leadRequest.explorerName}
                  photoUrl={photoMap[leadRequest.explorerId]}
                  size={56}
                  backgroundColor={activeTheme.accent}
                />
                <View style={styles.groupCopy}>
                  <Text style={styles.groupTitle}>{leadRequest.explorerName}</Text>
                  <Text style={styles.groupMeta}>
                    {isMultiRequest ? `${group.length} requests in this thread` : "1 request"}
                  </Text>
                </View>
              </View>

              {group.map((item) => {
                const blocked = isBookingThreadBlocked(item);
                const canOpenThread = !blocked && isBookingThreadOpenWindow(item);
                const isExpanded = expandedId === item.id;

                return (
                  <View key={item.id} style={styles.requestCard}>
                    <Pressable
                      style={styles.requestHeaderButton}
                      onPress={() => setExpandedId((current) => (current === item.id ? null : item.id))}
                    >
                      <View style={styles.requestTopCopy}>
                        <Text style={styles.requestTitle}>{item.dishSummary}</Text>
                        <Text style={styles.requestTime}>{item.serviceDateLabel}</Text>
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
                        <Text style={styles.summaryLabel}>Payout</Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrency(item.payoutAmount, item.explorerCountryCode)}
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Mode</Text>
                        <Text style={styles.summaryValue}>
                          {item.serviceMode === "cook_home" ? "Cook home" : "Explorer home"}
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Guests</Text>
                        <Text style={styles.summaryValue}>{item.guestCount || "1"}</Text>
                      </View>
                    </View>

                    {isExpanded ? (
                      <>
                        <Text style={styles.requestDetail}>Area: {item.areaLabel}</Text>
                        <Text style={styles.requestDetail}>
                          Service: {serviceKindLabel(item.serviceKind)} at{" "}
                          {item.serviceMode === "cook_home" ? "cook's home" : "explorer's home"}
                        </Text>
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
                              <Text style={styles.secondaryButtonText}>Accept</Text>
                            </Pressable>
                          ) : null}
                          {!item.instantMatch && !blocked ? (
                            <Pressable
                              style={styles.secondaryButton}
                              onPress={() => openAction({ type: "counter", booking: item })}
                            >
                              <Text style={styles.secondaryButtonText}>Counter</Text>
                            </Pressable>
                          ) : null}
                          {!blocked ? (
                            <Pressable
                              style={styles.secondaryButton}
                              onPress={() => openAction({ type: "decline", booking: item })}
                            >
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
                              <Text style={styles.secondaryButtonText}>Open thread</Text>
                            </Pressable>
                          ) : (
                            <View style={styles.blockedPill}>
                              <Text style={styles.blockedPillText}>
                                {blocked ? "Thread closed" : "Thread opens near service time"}
                              </Text>
                            </View>
                          )}
                        </View>
                      </>
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
      maxWidth: isWideWeb ? 980 : undefined,
      alignSelf: "center",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      borderRadius: 34,
      padding: theme.spacing.lg,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    headerCopy: { flex: 1, gap: 5, paddingRight: 16 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    kicker: { color: activeTheme.primaryDark, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
    title: { color: activeTheme.text, fontSize: isWideWeb ? 42 : 34, lineHeight: isWideWeb ? 48 : 39, fontWeight: "900" },
    subtitle: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 21, maxWidth: 560 },
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
      borderRadius: 28,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    groupHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    groupCopy: { flex: 1, gap: 2 },
    groupTitle: { color: activeTheme.text, fontSize: 18, fontWeight: "800" },
    groupMeta: { color: activeTheme.textMuted, fontSize: 13, fontWeight: "600" },
    requestCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      gap: 12,
      backgroundColor: activeTheme.surfaceElevated,
    },
    requestHeaderButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    requestTopCopy: { flex: 1, gap: 2 },
    requestHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
    statusPill: {
      alignSelf: "flex-start",
      backgroundColor: activeTheme.surfaceElevated,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    statusText: { color: activeTheme.accent, fontSize: 13, fontWeight: "800" },
    requestTitle: { color: activeTheme.text, fontSize: 17, fontWeight: "800" },
    requestTime: { color: activeTheme.textMuted, fontSize: 13, fontWeight: "600" },
    summaryStrip: {
      flexDirection: "row",
      gap: 8,
      borderRadius: 18,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: 8,
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
    requestDetail: { color: activeTheme.text, fontSize: 14, lineHeight: 22 },
    requestNote: { color: activeTheme.textMuted, fontSize: 13, lineHeight: 20 },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 2 },
    secondaryButton: {
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
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primary,
    },
    primaryButtonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
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
