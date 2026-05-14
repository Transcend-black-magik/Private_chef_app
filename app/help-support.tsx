import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
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

import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { toSafeUserErrorMessage } from "@/lib/async-guard";
import { createSupportTicket, type SupportTicketCategory } from "@/lib/support";
import { getTheme, theme } from "@/theme/theme";

const categories: { label: string; value: SupportTicketCategory; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Booking", value: "booking", icon: "calendar-outline" },
  { label: "Payment", value: "payment", icon: "card-outline" },
  { label: "Safety", value: "safety", icon: "shield-checkmark-outline" },
  { label: "Account", value: "account", icon: "person-outline" },
  { label: "Technical", value: "technical", icon: "construct-outline" },
  { label: "General", value: "general", icon: "chatbubble-ellipses-outline" },
];

export default function HelpSupportScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [category, setCategory] = useState<SupportTicketCategory>("general");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sentTicketId, setSentTicketId] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit() {
    Keyboard.dismiss();
    setError("");
    setIsSending(true);

    try {
      const ticketId = await createSupportTicket({ category, subject, body });
      setSentTicketId(ticketId);
      setSubject("");
      setBody("");
    } catch (nextError) {
      setError(toSafeUserErrorMessage(nextError instanceof Error ? nextError.message : "", "We could not send that support request."));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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

        <View style={styles.header}>
          <Text style={styles.kicker}>Help and support</Text>
          <Text style={styles.title}>Tell us what needs attention.</Text>
          <Text style={styles.subtitle}>
            Support tickets stay tied to your account so booking, payment, safety, and technical issues can be handled without leaving the app.
          </Text>
        </View>

        <View style={styles.categoryGrid}>
          {categories.map((item) => {
            const selected = item.value === category;
            return (
              <Pressable
                key={item.value}
                style={[styles.categoryButton, selected && styles.categoryButtonActive]}
                onPress={() => setCategory(item.value)}
              >
                <Ionicons name={item.icon} size={17} color={selected ? "#FFFFFF" : activeTheme.primaryDark} />
                <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.formCard}>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.input}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Describe what happened, including booking or payment context if relevant"
            placeholderTextColor={activeTheme.textMuted}
            multiline
            style={[styles.input, styles.textArea]}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {sentTicketId ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={18} color={activeTheme.primaryDark} />
              <Text style={styles.successText}>Support ticket created: {sentTicketId}</Text>
            </View>
          ) : null}
          <Pressable
            style={[styles.submitButton, isSending && styles.submitButtonDisabled]}
            disabled={isSending}
            onPress={() => void handleSubmit()}
          >
            <Text style={styles.submitText}>{isSending ? "Sending..." : "Send to support"}</Text>
          </Pressable>
        </View>
      </ScrollView>
      {isSending ? <AuthProcessingScreen title="Sending support request" subtitle="Creating a support ticket for your account." /> : null}
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
    backText: { color: activeTheme.text, fontSize: 15, fontWeight: "800" },
    header: { gap: 8 },
    kicker: { color: activeTheme.primaryDark, fontSize: 13, fontWeight: "900", textTransform: "uppercase" },
    title: { color: activeTheme.text, fontSize: 31, lineHeight: 38, fontWeight: "900" },
    subtitle: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    categoryButton: {
      minHeight: 44,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surface,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    categoryButtonActive: { backgroundColor: activeTheme.primaryDark, borderColor: activeTheme.primaryDark },
    categoryText: { color: activeTheme.text, fontSize: 13, fontWeight: "900" },
    categoryTextActive: { color: "#FFFFFF" },
    formCard: {
      borderRadius: 28,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    input: {
      minHeight: 54,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surfaceElevated,
      color: activeTheme.text,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
      fontSize: 15,
    },
    textArea: { minHeight: 150, textAlignVertical: "top" },
    errorText: { color: activeTheme.danger, fontSize: 13, lineHeight: 20, fontWeight: "700" },
    successBox: {
      borderRadius: 18,
      backgroundColor: activeTheme.safeSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    successText: { flex: 1, color: activeTheme.text, fontSize: 13, lineHeight: 19, fontWeight: "800" },
    submitButton: {
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: activeTheme.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },
    submitButtonDisabled: { opacity: 0.55 },
    submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  });
