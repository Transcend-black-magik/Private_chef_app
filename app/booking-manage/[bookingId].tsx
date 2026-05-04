import { useEffect, useState } from "react";
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

import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { subscribeToBookingsForCurrentUser, rescheduleBookingAsExplorer, type BookingRecord } from "@/lib/marketplace";
import { getTheme, theme } from "@/theme/theme";

export default function BookingManageScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [serviceDateLabel, setServiceDateLabel] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToBookingsForCurrentUser((bookings) => {
      const nextBooking = bookings.find((item) => item.id === params.bookingId) || null;
      setBooking(nextBooking);
      if (nextBooking) {
        setServiceDateLabel((currentValue) => currentValue || nextBooking.serviceDateLabel);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [params.bookingId]);

  async function handleSave() {
    if (!params.bookingId) {
      setError("Booking could not be found.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await rescheduleBookingAsExplorer(params.bookingId, serviceDateLabel, note);
      router.replace("/bookings");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We could not update this booking.");
      setIsSaving(false);
      return;
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
          <Text style={styles.eyebrow}>Reschedule booking</Text>
          <Text style={styles.title}>Adjust the date inside the app.</Text>
          <Text style={styles.subtitle}>
            Keep timing changes inside the platform so the cook sees the update, the thread stays clean, and support can still follow the booking.
          </Text>
        </View>

        {booking ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{booking.cookName}</Text>
            <Text style={styles.detailText}>{booking.dishSummary}</Text>
            <Text style={styles.detailText}>Current date: {booking.serviceDateLabel}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>New timing</Text>
          <TextInput
            value={serviceDateLabel}
            onChangeText={setServiceDateLabel}
            placeholder="New preferred date and time"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.input}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a short note for the cook"
            placeholderTextColor={activeTheme.textMuted}
            style={[styles.input, styles.textArea]}
            multiline
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={() => void handleSave()}>
          <Text style={styles.primaryButtonText}>Send reschedule request</Text>
        </Pressable>
      </ScrollView>

      {isSaving ? (
        <AuthProcessingScreen
          title="Updating booking"
          subtitle="We're saving the new timing and posting the update into the protected booking thread."
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
    },
    backButton: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
    backText: { color: activeTheme.text, fontSize: 15, fontWeight: "700" },
    headerBlock: { gap: theme.spacing.xs },
    eyebrow: { color: activeTheme.primaryDark, fontSize: 14, fontWeight: "800" },
    title: { color: activeTheme.text, fontSize: 31, lineHeight: 37, fontWeight: "800" },
    subtitle: { color: activeTheme.textMuted, fontSize: 15, lineHeight: 23 },
    card: {
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    sectionTitle: { color: activeTheme.text, fontSize: 19, fontWeight: "800" },
    detailText: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    input: {
      backgroundColor: activeTheme.bg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 16,
      color: activeTheme.text,
      fontSize: 15,
    },
    textArea: { minHeight: 120, textAlignVertical: "top" },
    errorText: { color: activeTheme.danger, fontSize: 13, lineHeight: 20 },
    primaryButton: {
      minHeight: 56,
      borderRadius: theme.radius.md,
      backgroundColor: activeTheme.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  });
