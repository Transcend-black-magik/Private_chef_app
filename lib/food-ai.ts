import { getFunctions, httpsCallable } from "firebase/functions";

import { getAsyncErrorMessage, withTimeout } from "@/lib/async-guard";
import { firebaseApp } from "@/lib/firebase";

export type FoodAssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

const foodAiEndpoint = process.env.EXPO_PUBLIC_FOOD_AI_ENDPOINT;

type FoodAssistantCallableResponse = {
  ok: boolean;
  reply?: string;
  model?: string;
};

export async function generateFoodAssistantReply(messages: FoodAssistantMessage[]) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  let firebaseError = "";
  let endpointError = "";

  const instantReply = buildInstantFoodCompanionReply(latestUserMessage);
  if (instantReply) {
    return instantReply;
  }

  if (firebaseApp) {
    try {
      const callable = httpsCallable<{ messages: FoodAssistantMessage[] }, FoodAssistantCallableResponse>(
        getFunctions(firebaseApp),
        "foodAssistant",
      );
      const response = await withTimeout(callable({ messages }), {
        timeoutMessage: "Food AI is taking too long. Please try again.",
      });

      if (response.data.ok && typeof response.data.reply === "string" && response.data.reply.trim()) {
        return response.data.reply.trim();
      }
    } catch (error) {
      firebaseError = getAsyncErrorMessage(error, "Food AI could not respond right now.");
    }
  }

  if (foodAiEndpoint) {
    try {
      const response = await fetch(foodAiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          system:
            "You are Cook for Me's warm food, wellness, gym, and cook-booking companion. Help with meal ideas, food journaling, nutrition goals, recipe planning, ingredient swaps, motivation, and finding cooks. Stay emotionally supportive but do not replace therapy or medical care, and keep medical advice cautious.",
        }),
      });

      if (!response.ok) {
        throw new Error("The AI assistant endpoint is not reachable yet.");
      }

      const data = (await response.json()) as { reply?: unknown; message?: unknown };
      const reply = typeof data.reply === "string" ? data.reply : typeof data.message === "string" ? data.message : "";

      if (reply.trim()) {
        return reply.trim();
      }
    } catch (error) {
      endpointError = getAsyncErrorMessage(error, "The AI assistant endpoint is not reachable yet.");
    }
  }

  if (foodAiEndpoint || !firebaseError || endpointError) {
    return buildLocalFoodReply(latestUserMessage);
  }

  throw new Error(firebaseError);
}

function buildLocalFoodReply(prompt: string) {
  const text = prompt.toLowerCase();

  if (text.includes("sad") || text.includes("stressed") || text.includes("overwhelmed") || text.includes("tired")) {
    return "I’m with you. Let’s keep this gentle: drink some water, tell me whether you want comfort food, something light, or a quick high-protein option, and I’ll help you build the next small step.";
  }

  if (text.includes("protein") || text.includes("gym") || text.includes("muscle")) {
    return "For a high-protein plan, aim for a lean protein anchor, a slow carb, and a high-fiber vegetable in each meal. Try grilled chicken with jollof cauliflower rice, salmon with sweet potato, or turkey suya bowls. I can turn this into a 7-day plan with calories and prep windows.";
  }

  if (text.includes("calorie") || text.includes("weight") || text.includes("health")) {
    return "A practical health plate would be half vegetables, one quarter protein, and one quarter carbs, with sauces measured instead of guessed. Tell me your goal, height, weight, activity level, and foods you avoid, and I will shape a realistic plan.";
  }

  if (text.includes("recipe") || text.includes("cook")) {
    return "I can help you choose between a free recipe path and a professional cook path. For a recipe, I will give steps and timing. For a cook, I can suggest dishes that need precise measurements, sourcing, and professional prep.";
  }

  return "Tell me what you are craving, your health goal, and how soon you want to eat. I can suggest meals, estimate nutrition, build a grocery list, or help you decide whether to book a cook.";
}

function buildInstantFoodCompanionReply(prompt: string) {
  const text = prompt.trim().toLowerCase();

  if (!text) {
    return "";
  }

  if (["hi", "hello", "hey", "yo", "good morning", "good afternoon", "good evening"].includes(text)) {
    return "Hey, I’m here. Tell me your mood, your craving, or your goal today and I’ll help like a smart food diary, supportive nutrition buddy, and cook-planning partner.";
  }

  if (text === "how are you" || text === "how are you?") {
    return "I’m good and ready for food duty. Tell me what kind of day this is: comfort, healthy reset, gym fuel, meal prep, or something you want a cook to handle.";
  }

  if (text.includes("journal") || text.includes("diary")) {
    return "Absolutely. You can use me like a food and wellness diary here. Tell me what you ate, how you felt, what your energy was like, and what you want to improve next.";
  }

  return "";
}
