import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";

import {
  generateFoodAssistantReply,
  type FoodAssistantAction,
  type FoodAssistantMessage,
  type FoodAssistantUserContext,
} from "@/lib/food-ai";
import { toSafeUserErrorMessage } from "@/lib/async-guard";
import { getSession } from "@/lib/app-state";
import { heroFoodImages } from "@/lib/food-visuals";
import { getTheme, theme } from "@/theme/theme";

const ASSISTANT_SUBSCRIPTION_KEY = "private-chef:food-ai-subscription-active";
const ASSISTANT_MESSAGES_KEY_PREFIX = "private-chef:food-ai-messages:";

const starterPrompts = [
  "Plan a high-protein dinner",
  "What can I eat after gym?",
  "Build a 3-day meal prep",
  "Find meals for weight loss",
];

const capabilityTopics = [
  {
    label: "Meal plans",
    prompts: [
      "Build me a realistic 3-day meal plan.",
      "Plan a high-protein week with simple groceries.",
      "Make a quick meal prep plan for busy days.",
    ],
  },
  {
    label: "Health goals",
    prompts: [
      "Help me eat better without making food boring.",
      "Make a weight-loss dinner plan that still feels filling.",
      "Help me balance gym fuel, cravings, and portion sizes.",
    ],
  },
  {
    label: "Recipe help",
    prompts: [
      "Turn what I have at home into a good recipe.",
      "Give me a fast recipe with clear steps and timing.",
      "Help me fix a dish that tastes flat.",
    ],
  },
  {
    label: "Cook matching",
    prompts: [
      "Help me decide when to book a cook instead of cooking myself.",
      "Suggest dishes that are worth booking a cook for.",
      "Help me write a clear booking request for a cook.",
    ],
  },
];

const plans = [
  {
    id: "plus",
    name: "Food AI Plus",
    price: "$7.99/mo",
    detail: "Recipes, health goals, weekly meal planning, and cook matching.",
  },
  {
    id: "pro",
    name: "Food AI Pro",
    price: "$14.99/mo",
    detail: "Deeper nutrition memory, family plans, pantry strategy, and priority AI.",
  },
];

const initialMessages: FoodAssistantMessage[] = [
  {
    role: "assistant",
    content:
      "Hey, I’m here for cravings, meal plans, food journaling, gym-fuel ideas, nutrition check-ins, and deciding when it makes sense to book a cook. Start anywhere.",
  },
];

type AssistantMode = "landing" | "plans" | "chat";
type AssistantConnectionStatus = "online" | "offline" | "connecting";

export default function CookingAssistantScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const scrollRef = useRef<ScrollView | null>(null);
  const memoryKeyRef = useRef(`${ASSISTANT_MESSAGES_KEY_PREFIX}guest`);
  const [mode, setMode] = useState<AssistantMode>("landing");
  const [hasSubscription, setHasSubscription] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(plans[0].id);
  const [messages, setMessages] = useState<FoodAssistantMessage[]>(initialMessages);
  const [assistantUser, setAssistantUser] = useState<FoodAssistantUserContext | null>(null);
  const [memoryLoaded, setMemoryLoaded] = useState(false);
  const [topicTick, setTopicTick] = useState(0);
  const [pendingStarter, setPendingStarter] = useState("");
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<AssistantConnectionStatus>("online");
  const streamIdRef = useRef(0);
  const selectedPlanDetails = useMemo(
    () => plans.find((plan) => plan.id === selectedPlan) ?? plans[0],
    [selectedPlan],
  );

  useEffect(() => {
    async function loadAssistantState() {
      const session = await getSession();
      memoryKeyRef.current = `${ASSISTANT_MESSAGES_KEY_PREFIX}${session?.id || "guest"}`;
      setAssistantUser(
        session
          ? {
              id: session.id,
              role: session.role,
              profileComplete: session.profileComplete,
            }
          : null,
      );
      const [subscriptionValue, savedMessages] = await Promise.all([
        AsyncStorage.getItem(ASSISTANT_SUBSCRIPTION_KEY),
        AsyncStorage.getItem(memoryKeyRef.current),
      ]);

      setHasSubscription(subscriptionValue === "true");

      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          if (Array.isArray(parsed) && parsed.length) {
            setMessages(
              parsed
                .filter(
                  (message): message is FoodAssistantMessage =>
                    message &&
                    typeof message === "object" &&
                    (message.role === "user" || message.role === "assistant") &&
                    typeof message.content === "string",
                )
                .map((message) => ({
                  role: message.role,
                  content: message.content,
                  actions: sanitizeMessageActions(message.actions),
                }))
                .slice(-60),
            );
          }
        } catch {
          // Assistant memory is helpful, but a bad cache should never block chat.
        }
      }

      setMemoryLoaded(true);
    }

    void loadAssistantState();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTopicTick((value) => value + 1);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!memoryLoaded) {
      return;
    }

    void AsyncStorage.setItem(memoryKeyRef.current, JSON.stringify(messages.slice(-60)));
  }, [memoryLoaded, messages]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages, mode]);

  async function startAssistant() {
    if (hasSubscription) {
      setMode("chat");
      return;
    }

    setMode("plans");
  }

  async function completeTestPayment() {
    await AsyncStorage.setItem(ASSISTANT_SUBSCRIPTION_KEY, "true");
    setHasSubscription(true);
    setMode("chat");

    if (pendingStarter) {
      const starter = pendingStarter;
      setPendingStarter("");
      requestAnimationFrame(() => void sendMessage(starter));
    }
  }

  function openTopic(prompt: string) {
    if (!hasSubscription) {
      setPendingStarter(prompt);
      setMode("plans");
      return;
    }

    setMode("chat");
    requestAnimationFrame(() => void sendMessage(prompt));
  }

  async function sendMessage(nextText = draft) {
    const trimmed = nextText.trim();

    if (!trimmed || isThinking) {
      return;
    }

    const nextMessages: FoodAssistantMessage[] = [...messages, { role: "user", content: trimmed }];
    const pendingMessage: FoodAssistantMessage = {
      role: "assistant",
      content: "I’m reading your message and checking the best food plan, nutrition angle, or app action.",
    };
    const streamId = streamIdRef.current + 1;
    streamIdRef.current = streamId;

    Keyboard.dismiss();
    setMessages([...nextMessages, pendingMessage]);
    setDraft("");
    setIsThinking(true);
    setConnectionStatus("connecting");

    try {
      const response = await generateFoodAssistantReply(nextMessages, assistantUser);
      setConnectionStatus(response.remoteAvailable === false ? "offline" : "online");
      revealAssistantReply({
        streamId,
        baseMessages: nextMessages,
        reply: response.reply,
        actions: response.actions,
      });
    } catch (error) {
      setConnectionStatus("offline");
      const fallback = toSafeUserErrorMessage(
        error instanceof Error ? error.message : "",
        "I could not reach the assistant right now. I can still help with local meal guidance while your connection recovers.",
      );
      revealAssistantReply({ streamId, baseMessages: nextMessages, reply: fallback, actions: [] });
    } finally {
      setIsThinking(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  function revealAssistantReply(params: {
    streamId: number;
    baseMessages: FoodAssistantMessage[];
    reply: string;
    actions: FoodAssistantAction[];
  }) {
    const words = params.reply.split(/(\s+)/);
    let cursor = 0;

    function tick() {
      if (streamIdRef.current !== params.streamId) {
        return;
      }

      cursor = Math.min(words.length, cursor + 4);
      const visibleReply = words.slice(0, cursor).join("");
      const done = cursor >= words.length;

      setMessages([
        ...params.baseMessages,
        {
          role: "assistant",
          content: visibleReply,
          actions: done ? params.actions : [],
        },
      ]);

      if (!done) {
        setTimeout(tick, 28);
      }
    }

    tick();
  }

  function handleAssistantAction(action: FoodAssistantAction) {
    if (action.params && Object.keys(action.params).length > 0) {
      router.push({ pathname: action.route, params: action.params } as never);
      return;
    }

    router.push(action.route as never);
  }

  if (mode === "landing") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.landingContent} showsVerticalScrollIndicator={false}
                  bounces={false}
                  overScrollMode="never">
        <View style={styles.landingHero}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
          </Pressable>
          <View style={styles.heroImageWrap}>
            <Image source={heroFoodImages.salad} style={styles.heroImage} contentFit="cover" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.landingKicker}>Premium food intelligence</Text>
            <Text style={styles.landingTitle}>Your Personal Food AI Assistant</Text>
            <Text style={styles.landingSubtitle}>
              Talk through cravings, health goals, food moods, recipes, and cook booking decisions in one calm place.
            </Text>
            <Pressable style={styles.assistantButton} onPress={() => void startAssistant()}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              <Text style={styles.assistantButtonText}>Start assistant</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.capabilityGrid}>
          {capabilityTopics.map((item, index) => {
            const prompt = item.prompts[(topicTick + index) % item.prompts.length];
            return (
              <Pressable key={item.label} style={styles.capabilityCard} onPress={() => openTopic(prompt)}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={activeTheme.primaryDark} />
                <Text style={styles.capabilityText}>{item.label}</Text>
                <Text numberOfLines={2} style={styles.capabilityPrompt}>{prompt}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  if (mode === "plans") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.planContent} showsVerticalScrollIndicator={false}
                  bounces={false}
                  overScrollMode="never">
        <View style={styles.planHeader}>
          <Pressable style={styles.backButton} onPress={() => setMode("landing")}>
            <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
          </Pressable>
          <Text style={styles.planTitle}>Choose your AI plan</Text>
          <Text style={styles.planSubtitle}>
            This is the subscription gate. Connect it to Stripe, Paystack, or RevenueCat before launch.
          </Text>
        </View>

        {plans.map((plan) => {
          const selected = selectedPlan === plan.id;
          return (
            <Pressable
              key={plan.id}
              style={[styles.planCard, selected && styles.planCardActive]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              <View style={styles.planCardTop}>
                <Text style={[styles.planName, selected && styles.planNameActive]}>{plan.name}</Text>
                <Text style={[styles.planPrice, selected && styles.planPriceActive]}>{plan.price}</Text>
              </View>
              <Text style={[styles.planDetail, selected && styles.planDetailActive]}>{plan.detail}</Text>
              {selected ? (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  <Text style={styles.selectedBadgeText}>Selected</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        <Pressable style={styles.payButton} onPress={() => void completeTestPayment()}>
          <Ionicons name="card-outline" size={17} color="#FFFFFF" />
          <Text style={styles.payButtonText}>Continue with {selectedPlanDetails.price}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => setMode("landing")}>
          <Ionicons name="chevron-back" size={19} color={activeTheme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.kicker}>Food AI</Text>
          <Text style={styles.title}>Food companion</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                connectionStatus === "offline" && styles.statusDotOffline,
                connectionStatus === "connecting" && styles.statusDotConnecting,
              ]}
            />
            <Text style={styles.statusText}>
              {connectionStatus === "connecting"
                ? "Checking connection"
                : connectionStatus === "offline"
                  ? "Offline guidance active"
                  : "Online"}
            </Text>
          </View>
        </View>
        <View style={styles.planPill}>
          <Ionicons name="diamond-outline" size={15} color="#FFFFFF" />
          <Text style={styles.planPillText}>Active</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.promptRow}>
          {starterPrompts.map((prompt) => (
            <Pressable key={prompt} style={styles.promptChip} onPress={() => void sendMessage(prompt)}>
              <Text style={styles.promptChipText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>

        {messages.map((message, index) => {
          const isUser = message.role === "user";
          return (
            <View
              key={`${message.role}-${index}`}
              style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}
            >
              {!isUser ? (
                <View style={styles.assistantMark}>
                  <Image source={require("@/assets/images/icon.png")} style={styles.assistantLogo} contentFit="contain" />
                </View>
              ) : null}
              <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.bubbleText, isUser ? styles.userBubbleText : styles.assistantBubbleText]}>
                  {message.content}
                </Text>
                {!isUser && message.actions?.length ? (
                  <View style={styles.actionRow}>
                    {message.actions.map((action) => (
                      <Pressable
                        key={`${action.route}-${action.label}`}
                        style={styles.actionButton}
                        onPress={() => handleAssistantAction(action)}
                      >
                        <Text style={styles.actionButtonText}>{action.label}</Text>
                        <Ionicons name="chevron-forward" size={14} color={activeTheme.primaryDark} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.composerWrap}>
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Tell me what you ate, want, feel, or need help planning"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.input}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => void sendMessage()}
          />
          <Pressable
            style={[styles.sendButton, (!draft.trim() || isThinking) && styles.sendButtonDisabled]}
            disabled={!draft.trim() || isThinking}
            onPress={() => void sendMessage()}
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function sanitizeMessageActions(actions: unknown): FoodAssistantAction[] {
  if (!Array.isArray(actions)) {
    return [];
  }

  return actions
    .filter((action): action is FoodAssistantAction =>
      Boolean(
        action &&
          typeof action === "object" &&
          typeof action.label === "string" &&
          typeof action.route === "string" &&
          (action.type === "navigate" || action.type === "search" || action.type === "start_booking"),
      ),
    )
    .slice(0, 3);
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    landingContent: { padding: theme.spacing.lg, paddingTop: theme.layout.screenTop, gap: theme.spacing.lg },
    landingHero: {
      minHeight: 520,
      borderRadius: 38,
      overflow: "hidden",
      backgroundColor: activeTheme.safeSurface,
      padding: theme.spacing.lg,
      justifyContent: "space-between",
    },
    heroImageWrap: {
      alignSelf: "center",
      width: 245,
      height: 245,
      borderRadius: 123,
      overflow: "hidden",
      borderWidth: 12,
      borderColor: "rgba(255,255,255,0.55)",
      backgroundColor: activeTheme.surface,
    },
    heroImage: { width: "100%", height: "100%" },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    heroCopy: { gap: 12 },
    landingKicker: { color: activeTheme.primaryDark, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
    landingTitle: { color: activeTheme.text, fontSize: 34, lineHeight: 42, fontWeight: "900" },
    landingSubtitle: { color: activeTheme.textMuted, fontSize: 15, lineHeight: 23 },
    assistantButton: {
      minHeight: 54,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primaryDark,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    assistantButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
    capabilityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    capabilityCard: {
      width: "48%",
      minHeight: 118,
      borderRadius: 22,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.md,
      gap: 8,
    },
    capabilityText: { color: activeTheme.text, fontSize: 14, fontWeight: "900" },
    capabilityPrompt: { color: activeTheme.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700" },
    planContent: { padding: theme.spacing.lg, paddingTop: theme.layout.screenTop, gap: theme.spacing.md },
    planHeader: { gap: 10, marginBottom: 8 },
    planTitle: { color: activeTheme.text, fontSize: 31, lineHeight: 38, fontWeight: "900" },
    planSubtitle: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    planCard: {
      borderRadius: 28,
      padding: theme.spacing.lg,
      gap: 12,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    planCardActive: {
      backgroundColor: activeTheme.primaryDark,
      borderColor: activeTheme.primaryDark,
    },
    planCardTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    planName: { flex: 1, color: activeTheme.text, fontSize: 19, fontWeight: "900" },
    planPrice: { color: activeTheme.primaryDark, fontSize: 16, fontWeight: "900" },
    planNameActive: { color: "#FFFFFF" },
    planPriceActive: { color: "#FFFFFF" },
    planDetail: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 21, fontWeight: "700" },
    planDetailActive: { color: "rgba(255,255,255,0.78)" },
    selectedBadge: {
      alignSelf: "flex-start",
      minHeight: 30,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(255,255,255,0.18)",
    },
    selectedBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
    payButton: {
      minHeight: 56,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primaryDark,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
    },
    payButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
    header: {
      paddingTop: theme.layout.screenTop - 10,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: activeTheme.bg,
      borderBottomWidth: 1,
      borderBottomColor: activeTheme.border,
    },
    headerCenter: { flex: 1, gap: 2 },
    kicker: { color: activeTheme.primaryDark, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
    title: { color: activeTheme.text, fontSize: 21, lineHeight: 26, fontWeight: "900" },
    statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: activeTheme.primaryDark },
    statusDotOffline: { backgroundColor: activeTheme.danger },
    statusDotConnecting: { backgroundColor: "#FFAA26" },
    statusText: { color: activeTheme.textMuted, fontSize: 11, fontWeight: "800" },
    planPill: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primaryDark,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    planPillText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
    chatScroll: { flex: 1 },
    chatContent: {
      padding: theme.spacing.lg,
      gap: 12,
    },
    promptRow: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 4 },
    promptChip: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    promptChipText: { color: activeTheme.text, fontSize: 12, fontWeight: "900" },
    messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    messageRowAssistant: { justifyContent: "flex-start" },
    messageRowUser: { justifyContent: "flex-end" },
    assistantMark: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.safeSurface,
      overflow: "hidden",
    },
    assistantLogo: { width: 22, height: 22 },
    bubble: {
      maxWidth: "82%",
      borderRadius: 22,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    assistantBubble: {
      backgroundColor: activeTheme.surface,
      borderBottomLeftRadius: 8,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    userBubble: {
      backgroundColor: activeTheme.primaryDark,
      borderBottomRightRadius: 8,
    },
    bubbleText: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
    assistantBubbleText: { color: activeTheme.text },
    userBubbleText: { color: "#FFFFFF" },
    actionRow: {
      marginTop: 10,
      gap: 8,
    },
    actionButton: {
      minHeight: 38,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      backgroundColor: activeTheme.safeSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    actionButtonText: {
      flex: 1,
      color: activeTheme.primaryDark,
      fontSize: 12,
      fontWeight: "900",
    },
    thinkingRow: {
      alignSelf: "flex-start",
      minHeight: 38,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    thinkingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: activeTheme.primaryDark,
    },
    thinkingText: { color: activeTheme.textMuted, fontSize: 12, fontWeight: "800" },
    composerWrap: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.lg,
      backgroundColor: activeTheme.bg,
      borderTopWidth: 1,
      borderTopColor: activeTheme.border,
    },
    composer: {
      minHeight: 58,
      borderRadius: 26,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      paddingLeft: 16,
      paddingRight: 8,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
    },
    input: {
      flex: 1,
      maxHeight: 96,
      color: activeTheme.text,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "700",
      paddingVertical: 8,
    },
    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primaryDark,
    },
    sendButtonDisabled: { opacity: 0.42 },
  });
