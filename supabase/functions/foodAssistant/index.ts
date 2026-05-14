type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantAction = {
  label: string;
  route: string;
  type: "navigate" | "search" | "start_booking";
  params?: Record<string, string>;
  reason?: string;
};

type AssistantResponse = {
  ok: true;
  reply: string;
  actions: AssistantAction[];
  routeIntent: string;
  model: string;
  cached?: boolean;
};

type AppRoute = {
  key: string;
  label: string;
  route: string;
  type: AssistantAction["type"];
  words: string[];
  description: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const openAiKey = Deno.env.get("OPENAI_API_KEY") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const fastModel = Deno.env.get("FOOD_AI_FAST_MODEL") || "gpt-4.1-mini";
const largeModel = Deno.env.get("FOOD_AI_LARGE_MODEL") || "gpt-4.1";
const cacheTtlMs = Number(Deno.env.get("ASSISTANT_CACHE_TTL_SECONDS") || "900") * 1000;

const appRoutes: AppRoute[] = [
  { key: "explore", label: "Explore cooks", route: "/explore", type: "navigate", words: ["cook", "chef", "hire", "find", "explore"], description: "Find cooks and dishes." },
  { key: "booking", label: "Start booking", route: "/booking-request", type: "start_booking", words: ["book", "booking", "request", "private chef"], description: "Create a booking request." },
  { key: "bookings", label: "View bookings", route: "/bookings", type: "navigate", words: ["bookings", "upcoming", "reservation", "appointment"], description: "Manage bookings." },
  { key: "requests", label: "Cook requests", route: "/requests", type: "navigate", words: ["requests", "offer", "accept"], description: "Cook-side request inbox." },
  { key: "chats", label: "Open chats", route: "/chats", type: "navigate", words: ["chat", "message", "inbox", "conversation"], description: "Open chats." },
  { key: "recipes", label: "Browse recipes", route: "/recipes", type: "navigate", words: ["recipe", "recipes", "cook myself", "steps"], description: "Browse recipes." },
  { key: "search", label: "Search meals", route: "/search", type: "search", words: ["search", "look for", "find food", "dish"], description: "Search meals and cooks." },
  { key: "meal_match", label: "Meal match", route: "/meal-match", type: "navigate", words: ["meal match", "what should i eat", "hungry", "craving"], description: "Find meal ideas." },
  { key: "gym", label: "Gym meals", route: "/gym", type: "navigate", words: ["gym", "protein", "workout", "muscle", "bulk", "cut"], description: "Gym-focused food help." },
  { key: "kitchen", label: "My kitchen", route: "/my-kitchen", type: "navigate", words: ["kitchen", "pantry", "ingredients", "preferences"], description: "Kitchen and food preferences." },
  { key: "profile", label: "Profile", route: "/profile", type: "navigate", words: ["profile", "account", "settings"], description: "Profile and account settings." },
  { key: "notifications", label: "Notifications", route: "/notifications", type: "navigate", words: ["notification", "alert", "updates"], description: "App notifications." },
];

const commonReplies: Record<string, AssistantResponse> = {
  hi: {
    ok: true,
    reply: "Hey, I am here. Tell me what you want to eat, what you want to book, or what you need help with.",
    actions: [],
    routeIntent: "greeting",
    model: "instant-cache",
    cached: true,
  },
  hello: {
    ok: true,
    reply: "Hey, I am ready. I can help with meals, recipes, bookings, gym food, or finding a cook.",
    actions: [],
    routeIntent: "greeting",
    model: "instant-cache",
    cached: true,
  },
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return json({ ok: true }, 200);
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const messages = sanitizeMessages(body.messages);
    const latest = messages.at(-1)?.content.trim() || "";

    if (!latest) {
      return json({
        ok: true,
        reply: "Send me a craving, goal, or app task and I will help.",
        actions: [],
        routeIntent: "empty",
        model: "local-router",
      } satisfies AssistantResponse);
    }

    const normalized = normalizeText(latest);
    if (commonReplies[normalized]) {
      return json(commonReplies[normalized]);
    }

    const cacheKey = await buildCacheKey(messages, body.user, body.app_context);
    const cached = await readCache(cacheKey);
    if (cached) {
      return json({ ...cached, cached: true });
    }

    const suggestedActions = shouldSuggestActions(latest) ? inferActions(latest) : [];
    const localReply = buildLocalReply(latest, suggestedActions);

    if (!openAiKey) {
      const response: AssistantResponse = {
        ok: true,
        reply: localReply,
        actions: suggestedActions,
        routeIntent: inferRouteIntent(suggestedActions),
        model: "local-router",
      };
      await writeCache(cacheKey, response);
      return json(response);
    }

    const cookSignals = await loadCookSignals(latest);
    const chosenModel = shouldUseLargeModel(latest) ? largeModel : fastModel;
    const response = await callOpenAI({
      model: chosenModel,
      messages,
      user: sanitizeUserContext(body.user),
      appContext: sanitizeAppContext(body.app_context),
      suggestedActions,
      localReply,
      cookSignals,
    });

    await writeCache(cacheKey, response);
    return json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant failed.";
    return json({ ok: false, error: message }, 500);
  }
});

async function callOpenAI(params: {
  model: string;
  messages: ChatMessage[];
  user: Record<string, unknown>;
  appContext: Record<string, unknown>;
  suggestedActions: AssistantAction[];
  localReply: string;
  cookSignals: Array<Record<string, unknown>>;
}): Promise<AssistantResponse> {
  const prompt = {
    app: "Private Chef",
    rules: [
      "Answer fast and concisely.",
      "Return JSON only.",
      "Do not include action buttons unless the user asks to open, find, book, view, manage, search, or continue in the app.",
      "Use only routes from routeRegistry.",
      "When recommending cooks, use neutral signals such as relevance, verified status, rating, completed booking count, response quality, location, and profile completeness. Do not favor a cook for protected traits or paid/featured status alone.",
      "Never request or expose passwords, payment card data, government IDs, exact addresses, or document numbers.",
    ],
    outputShape: {
      reply: "string",
      routeIntent: "string",
      actions: [{ label: "string", route: "/route", type: "navigate|search|start_booking", params: {}, reason: "string" }],
    },
    routeRegistry: appRoutes.map(({ key, label, route, type, description }) => ({ key, label, route, type, description })),
    safeUserContext: params.user,
    appContext: params.appContext,
    cookSignals: params.cookSignals,
    localRouterSuggestion: {
      reply: params.localReply,
      actions: params.suggestedActions,
    },
    messages: params.messages.slice(-8),
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      input: JSON.stringify(prompt),
      instructions:
        "You are Private Chef's premium food and app-navigation assistant. Output only valid JSON. Keep casual chat natural and do not add buttons unless app navigation is useful.",
      temperature: 0.25,
      max_output_tokens: 650,
      store: false,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  const raw = extractOutputText(data);
  const parsed = parseJsonObject(raw);
  const actions = shouldSuggestActions(params.messages.at(-1)?.content || "")
    ? validateActions(parsed.actions)
    : [];

  return {
    ok: true,
    reply: cleanReply(parsed.reply) || params.localReply,
    actions,
    routeIntent: cleanRouteIntent(parsed.routeIntent) || inferRouteIntent(actions),
    model: params.model,
  };
}

async function loadCookSignals(prompt: string): Promise<Array<Record<string, unknown>>> {
  if (!supabaseUrl || !serviceRoleKey || !mentionsCookDiscovery(prompt)) {
    return [];
  }

  const userResponse = await fetch(
    `${supabaseUrl}/rest/v1/users?role=eq.cook&profileComplete=eq.true&select=id,name,city,region,countryName,specialtiesText,availableMealCategories,cookVerification,yearsExperience,serviceAreaLabel,ratingAverage,ratingCount,featured,completedBookingCount,responseScore&limit=12`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!userResponse.ok) {
    return [];
  }

  const cooks = await userResponse.json();
  if (!Array.isArray(cooks)) {
    return [];
  }

  return cooks.map((cook) => ({
    id: cook.id,
    name: cook.name,
    city: cook.city,
    region: cook.region,
    countryName: cook.countryName,
    specialties: cook.specialtiesText,
    categories: cook.availableMealCategories,
    verified: cook.cookVerification?.status === "verified",
    yearsExperience: cook.yearsExperience,
    serviceAreaLabel: cook.serviceAreaLabel,
    ratingAverage: Number(cook.ratingAverage || 0),
    ratingCount: Number(cook.ratingCount || 0),
    completedBookingCount: Number(cook.completedBookingCount || 0),
    responseScore: Number(cook.responseScore || 0),
    featured: Boolean(cook.featured),
  }));
}

function sanitizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => item as Partial<ChatMessage>)
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({ role: item.role!, content: String(item.content || "").slice(0, 4000) }))
    .filter((item) => item.content.trim())
    .slice(-12);
}

function shouldSuggestActions(prompt: string): boolean {
  const text = normalizeText(prompt);
  return /\b(open|show|find|book|booking|view|go to|take me|search|message|chat|profile|cook|chef|recipe|gym|kitchen|notification)\b/.test(text);
}

function shouldUseLargeModel(prompt: string): boolean {
  const text = normalizeText(prompt);
  return text.length > 260 || /\b(compare|plan|weekly|complex|analyze|detailed|family|nutrition plan)\b/.test(text);
}

function inferActions(prompt: string): AssistantAction[] {
  const text = normalizeText(prompt);
  return appRoutes
    .map((route) => ({
      route,
      score: route.words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ route }) => ({
      label: route.label,
      route: route.route,
      type: route.type,
      params: {},
      reason: `${route.key}_intent`,
    }));
}

function buildLocalReply(prompt: string, actions: AssistantAction[]): string {
  const text = normalizeText(prompt);
  if (/\b(book|chef|private cook)\b/.test(text)) {
    return "I can help you shape a clear booking request. Tell me the date, guest count, cuisine, budget, and whether ingredients are included.";
  }
  if (/\b(gym|protein|workout|muscle)\b/.test(text)) {
    return "For fast gym fuel, anchor the meal with protein, add a steady carb, and keep fats moderate near training.";
  }
  if (/\b(recipe|ingredient|cook myself)\b/.test(text)) {
    return "Tell me what ingredients you have and how much time you want to spend, and I will shape a practical recipe.";
  }
  if (actions.length) {
    return "I found the best place in the app for that. Use the button when you are ready.";
  }
  return "Got it. Tell me one more detail and I will keep this practical and quick.";
}

function validateActions(raw: unknown): AssistantAction[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const knownRoutes = new Map(appRoutes.map((route) => [route.route, route]));
  const actions: AssistantAction[] = [];

  for (const rawItem of raw) {
    if (!rawItem || typeof rawItem !== "object") {
      continue;
    }

    const item = rawItem as Partial<AssistantAction>;
    const route = knownRoutes.get(String(item.route || ""));
    if (!route) {
      continue;
    }

    actions.push({
        label: String(item.label || route.label).slice(0, 36),
        route: route.route,
        type: item.type === "search" || item.type === "start_booking" || item.type === "navigate" ? item.type : route.type,
        params: sanitizeParams(item.params),
        reason: String(item.reason || route.key).slice(0, 120),
    });
  }

  return actions.slice(0, 3);
}

async function readCache(key: string): Promise<AssistantResponse | null> {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/assistantResponseCache?id=eq.${key}&select=response,createdAt&limit=1`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row?.response || !row.createdAt) {
    return null;
  }

  if (Date.now() - new Date(row.createdAt).getTime() > cacheTtlMs) {
    return null;
  }

  return row.response as AssistantResponse;
}

async function writeCache(key: string, response: AssistantResponse) {
  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  await fetch(`${supabaseUrl}/rest/v1/assistantResponseCache`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: key,
      response,
      createdAt: new Date().toISOString(),
    }),
  }).catch(() => undefined);
}

async function buildCacheKey(messages: ChatMessage[], user: unknown, appContext: unknown) {
  const value = JSON.stringify({
    messages: messages.slice(-6).map((message) => ({ role: message.role, content: normalizeText(message.content) })),
    user: sanitizeUserContext(user),
    appContext: sanitizeAppContext(appContext),
  });
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sanitizeUserContext(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const raw = value as Record<string, unknown>;
  return {
    id: typeof raw.id === "string" ? raw.id : undefined,
    role: raw.role === "cook" || raw.role === "explorer" ? raw.role : undefined,
    profileComplete: typeof raw.profileComplete === "boolean" ? raw.profileComplete : undefined,
  };
}

function sanitizeAppContext(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const raw = value as Record<string, unknown>;
  return {
    platform: typeof raw.platform === "string" ? raw.platform : undefined,
    currentRoute: typeof raw.currentRoute === "string" ? raw.currentRoute : undefined,
  };
}

function sanitizeParams(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, String(item).slice(0, 120)]),
  );
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return {};
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

function extractOutputText(data: any): string {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }
  return (data.output || [])
    .flatMap((item: any) => item.content || [])
    .map((content: any) => content.text || content.output_text || "")
    .join("\n")
    .trim();
}

function cleanReply(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 1200) : "";
}

function cleanRouteIntent(value: unknown): string {
  return typeof value === "string" ? value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) : "";
}

function inferRouteIntent(actions: AssistantAction[]) {
  return actions[0]?.reason || "general";
}

function mentionsCookDiscovery(prompt: string) {
  return /\b(cook|chef|book|hire|featured|rating|popular|frequently booked)\b/.test(normalizeText(prompt));
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
