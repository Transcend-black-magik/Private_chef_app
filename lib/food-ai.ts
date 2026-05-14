import { getAsyncErrorMessage, withTimeout } from "@/lib/async-guard";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export type FoodAssistantAction = {
  label: string;
  route: string;
  type: "navigate" | "search" | "start_booking";
  params?: Record<string, string>;
  reason?: string;
};

export type FoodAssistantMessage = {
  role: "user" | "assistant";
  content: string;
  actions?: FoodAssistantAction[];
};

export type FoodAssistantUserContext = {
  id?: string;
  role?: "explorer" | "cook";
  profileComplete?: boolean;
};

export type FoodAssistantReply = {
  reply: string;
  actions: FoodAssistantAction[];
  routeIntent: string;
  model?: string;
  cached?: boolean;
  source?: "remote" | "local" | "instant";
  remoteAvailable?: boolean;
};

const foodAiEndpoint = process.env.EXPO_PUBLIC_FOOD_AI_ENDPOINT;

type FoodAssistantCallableResponse = {
  ok: boolean;
  reply?: string;
  actions?: unknown;
  routeIntent?: unknown;
  model?: string;
  cached?: boolean;
};

export async function generateFoodAssistantReply(
  messages: FoodAssistantMessage[],
  user?: FoodAssistantUserContext | null,
): Promise<FoodAssistantReply> {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  let supabaseError = "";
  let endpointError = "";

  const instantReply = buildInstantFoodCompanionReply(latestUserMessage);
  if (instantReply) {
    return instantReply;
  }

  if (supabaseConfigured) {
    try {
      const response = await withTimeout(
        supabase.functions.invoke<FoodAssistantCallableResponse>("foodAssistant", {
          body: {
            messages: toWireMessages(messages),
            user: sanitizeUserContext(user),
            app_context: { platform: "react-native" },
          },
        }),
        {
          timeoutMs: 8000,
          timeoutMessage: "Food AI is taking too long. Please try again.",
        },
      );

      if (response.error) {
        throw response.error;
      }

      if (response.data?.ok && typeof response.data.reply === "string" && response.data.reply.trim()) {
        return normalizeAssistantReply(response.data);
      }
    } catch (error) {
      supabaseError = getAsyncErrorMessage(error, "Food AI could not respond right now.");
    }
  }

  if (foodAiEndpoint) {
    try {
      const response = await fetch(foodAiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: toWireMessages(messages),
          user: sanitizeUserContext(user),
          app_context: { platform: "react-native" },
        }),
      });

      if (!response.ok) {
        throw new Error("The AI assistant endpoint is not reachable yet.");
      }

      const data = (await response.json()) as FoodAssistantCallableResponse & { message?: unknown };
      const reply = typeof data.reply === "string" ? data.reply : typeof data.message === "string" ? data.message : "";

      if (reply.trim()) {
        return normalizeAssistantReply({ ...data, ok: true, reply });
      }
    } catch (error) {
      endpointError = getAsyncErrorMessage(error, "The AI assistant endpoint is not reachable yet.");
    }
  }

  if (foodAiEndpoint || !supabaseError || endpointError) {
    return {
      ...buildLocalFoodReply(latestUserMessage),
      source: "local",
      remoteAvailable: !supabaseError && !endpointError,
    };
  }

  throw new Error(supabaseError);
}

function buildLocalFoodReply(prompt: string): FoodAssistantReply {
  const text = prompt.toLowerCase();
  const includeActions = shouldSuggestActions(prompt);

  if (text.includes("sad") || text.includes("stressed") || text.includes("overwhelmed") || text.includes("tired")) {
    return {
      reply:
        "I'm with you. Let's keep this gentle: drink some water, tell me whether you want comfort food, something light, or a quick high-protein option, and I'll help you build the next small step.",
      actions: includeActions
        ? [
            { label: "Meal match", route: "/meal-match", type: "navigate", reason: "meal_support" },
            { label: "Browse recipes", route: "/recipes", type: "navigate", reason: "recipe_support" },
          ]
        : [],
      routeIntent: "supportive_meal_help",
    };
  }

  if (text.includes("protein") || text.includes("gym") || text.includes("muscle")) {
    return {
      reply:
        "For a high-protein plan, aim for a lean protein anchor, a slow carb, and a high-fiber vegetable in each meal. Try grilled chicken with jollof cauliflower rice, salmon with sweet potato, or turkey suya bowls.",
      actions: includeActions
        ? [
            { label: "Gym meals", route: "/gym", type: "navigate", reason: "gym_intent" },
            { label: "Meal match", route: "/meal-match", type: "navigate", reason: "meal_match_intent" },
          ]
        : [],
      routeIntent: "gym_nutrition",
    };
  }

  if (text.includes("calorie") || text.includes("weight") || text.includes("health")) {
    return {
      reply:
        "A practical health plate is half vegetables, one quarter protein, and one quarter carbs, with sauces measured instead of guessed. Tell me your goal and foods you avoid, and I will shape a realistic plan.",
      actions: includeActions
        ? [
            { label: "Meal match", route: "/meal-match", type: "navigate", reason: "health_goal" },
            { label: "My kitchen", route: "/my-kitchen", type: "navigate", reason: "preferences" },
          ]
        : [],
      routeIntent: "health_goal",
    };
  }

  if (text.includes("book") || text.includes("chef") || text.includes("private cook")) {
    return {
      reply:
        "I can help you shape a clear booking request. Tell me the date, guest count, cuisine, budget, and whether ingredients are included.",
      actions: [
        { label: "Start booking", route: "/booking-request", type: "start_booking", reason: "booking_intent" },
        { label: "Explore cooks", route: "/explore", type: "navigate", reason: "cook_discovery" },
      ],
      routeIntent: "booking",
    };
  }

  if (text.includes("recipe") || text.includes("ingredient") || text.includes("cook")) {
    return {
      reply:
        "Tell me what ingredients you have and how much time you want to spend. I can suggest a recipe, then send you to recipes or search.",
      actions: includeActions
        ? [
            { label: "Browse recipes", route: "/recipes", type: "navigate", reason: "recipe_intent" },
            { label: "Search meals", route: "/search", type: "search", reason: "meal_search" },
          ]
        : [],
      routeIntent: "recipes",
    };
  }

  if (text.includes("booking") || text.includes("appointment")) {
    return {
      reply: "I can help you get to your booking details or start a new request.",
      actions: [
        { label: "View bookings", route: "/bookings", type: "navigate", reason: "bookings" },
        { label: "Start booking", route: "/booking-request", type: "start_booking", reason: "new_booking" },
      ],
      routeIntent: "bookings",
    };
  }

  if (text.includes("chat") || text.includes("message")) {
    return {
      reply: "I can take you to your conversations with cooks and customers.",
      actions: [{ label: "Open chats", route: "/chats", type: "navigate", reason: "chats" }],
      routeIntent: "chats",
    };
  }

  return {
    reply:
      "Tell me what you are craving, your health goal, and how soon you want to eat. I can suggest meals, estimate nutrition, build a grocery list, or help you decide whether to book a cook.",
    actions: includeActions
      ? [
          { label: "Explore cooks", route: "/explore", type: "navigate", reason: "cook_discovery" },
          { label: "Search meals", route: "/search", type: "search", reason: "meal_search" },
        ]
      : [],
    routeIntent: "general_food_help",
  };
}

function buildInstantFoodCompanionReply(prompt: string): FoodAssistantReply | "" {
  const text = prompt.trim().toLowerCase();

  if (!text) {
    return "";
  }

  if (["hi", "hello", "hey", "yo", "good morning", "good afternoon", "good evening"].includes(text)) {
    return {
      reply:
        "Hey, I'm here. Tell me your mood, your craving, or your goal today and I'll help like a smart food diary, nutrition buddy, and cook-planning partner.",
      actions: [],
      routeIntent: "greeting",
      cached: true,
      source: "instant",
      remoteAvailable: true,
    };
  }

  if (text === "how are you" || text === "how are you?") {
    return {
      reply:
        "I'm good and ready for food duty. Tell me what kind of day this is: comfort, healthy reset, gym fuel, meal prep, or something you want a cook to handle.",
      actions: [],
      routeIntent: "greeting",
      cached: true,
      source: "instant",
      remoteAvailable: true,
    };
  }

  if (text.includes("journal") || text.includes("diary")) {
    return {
      reply:
        "Absolutely. You can use me like a food and wellness diary here. Tell me what you ate, how you felt, what your energy was like, and what you want to improve next.",
      actions: shouldSuggestActions(prompt)
        ? [{ label: "My kitchen", route: "/my-kitchen", type: "navigate", reason: "preferences" }]
        : [],
      routeIntent: "food_journal",
      cached: true,
      source: "instant",
      remoteAvailable: true,
    };
  }

  return "";
}

function normalizeAssistantReply(data: FoodAssistantCallableResponse): FoodAssistantReply {
  return {
    reply: data.reply?.trim() || "I can help with meals, recipes, bookings, and app navigation.",
    actions: sanitizeActions(data.actions),
    routeIntent: typeof data.routeIntent === "string" && data.routeIntent.trim() ? data.routeIntent.trim() : "general",
    model: data.model,
    cached: Boolean(data.cached),
    source: "remote",
    remoteAvailable: true,
  };
}

function sanitizeActions(actions: unknown): FoodAssistantAction[] {
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
    .map((action) => ({
      label: action.label.slice(0, 36),
      route: action.route,
      type: action.type,
      params: action.params && typeof action.params === "object" ? action.params : {},
      reason: typeof action.reason === "string" ? action.reason : "",
    }))
    .slice(0, 3);
}

function sanitizeUserContext(user?: FoodAssistantUserContext | null) {
  if (!user) {
    return undefined;
  }

  return {
    id: user.id,
    role: user.role,
    profileComplete: user.profileComplete,
  };
}

function toWireMessages(messages: FoodAssistantMessage[]) {
  return messages.map(({ role, content }) => ({ role, content }));
}

function shouldSuggestActions(prompt: string) {
  return /\b(open|show|find|book|booking|view|go to|take me|search|message|chat|profile|cook|chef|recipe|gym|kitchen|notification)\b/i.test(
    prompt,
  );
}
