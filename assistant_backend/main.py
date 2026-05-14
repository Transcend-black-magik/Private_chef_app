from __future__ import annotations

import hashlib
import json
import os
import re
import time
from dataclasses import dataclass
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field


AssistantRole = Literal["user", "assistant"]
ActionType = Literal["navigate", "search", "start_booking"]


class ChatMessage(BaseModel):
    role: AssistantRole
    content: str = Field(default="", max_length=4000)


class AssistantRequest(BaseModel):
    messages: list[ChatMessage]
    user: dict | None = None
    app_context: dict | None = None


class AssistantAction(BaseModel):
    label: str
    route: str
    type: ActionType = "navigate"
    params: dict[str, str] = Field(default_factory=dict)
    reason: str = ""


class AssistantResponse(BaseModel):
    ok: bool = True
    reply: str
    actions: list[AssistantAction] = Field(default_factory=list)
    routeIntent: str = "general"
    model: str = "local-router"
    cached: bool = False


@dataclass(frozen=True)
class AppRoute:
    key: str
    label: str
    route: str
    intent_words: tuple[str, ...]
    description: str
    action_type: ActionType = "navigate"


APP_ROUTES: tuple[AppRoute, ...] = (
    AppRoute("explore", "Explore cooks", "/explore", ("cook", "chef", "hire", "find", "book"), "Find cooks and dishes."),
    AppRoute("booking_request", "Start booking", "/booking-request", ("book", "booking", "request", "private chef"), "Create a booking request.", "start_booking"),
    AppRoute("bookings", "View bookings", "/bookings", ("booking", "bookings", "upcoming", "appointment", "reservation"), "Manage bookings."),
    AppRoute("requests", "Cook requests", "/requests", ("requests", "cook requests", "offer", "accept"), "Cook-side request inbox."),
    AppRoute("chats", "Open chats", "/chats", ("chat", "message", "inbox", "conversation"), "Open customer/cook chats."),
    AppRoute("recipes", "Browse recipes", "/recipes", ("recipe", "recipes", "cook myself", "steps"), "Browse recipes."),
    AppRoute("recipe_studio", "Recipe studio", "/recipe-studio", ("create recipe", "recipe studio", "generate recipe"), "Create recipe ideas."),
    AppRoute("meal_match", "Meal match", "/meal-match", ("meal match", "match me", "what should i eat"), "Find meal ideas."),
    AppRoute("search", "Search meals", "/search", ("search", "look for", "find food", "dish"), "Search meals and cooks.", "search"),
    AppRoute("saved", "Saved cooks", "/saved-cooks", ("saved", "favorite", "bookmarked"), "Saved cooks list."),
    AppRoute("kitchen", "My kitchen", "/my-kitchen", ("kitchen", "pantry", "ingredients"), "Kitchen and preference hub."),
    AppRoute("gym", "Gym meals", "/gym", ("gym", "protein", "workout", "muscle", "bulk", "cut"), "Gym-focused meal help."),
    AppRoute("profile", "Profile", "/profile", ("profile", "account", "settings"), "Profile and account settings."),
    AppRoute("complete_profile", "Complete profile", "/complete-profile", ("complete profile", "address", "phone", "setup"), "Finish profile setup."),
    AppRoute("notifications", "Notifications", "/notifications", ("notification", "alert", "updates"), "App notifications."),
)


SYSTEM_PROMPT = """
You are Private Chef's fast, premium in-app assistant.

Core product:
- Private Chef helps explorers find cooks, book private chef services, chat, manage bookings, browse recipes, meal-plan, and get gym/nutrition-aware food guidance.
- Cooks can complete profiles, verify identity, review requests, negotiate offers, chat with explorers, and manage service work.

Behavior:
- Be concise, warm, practical, and accurate.
- Prefer app-specific answers and concrete next steps.
- When the user needs to move inside the app, include route suggestions by choosing from the provided app route registry.
- Do not invent screens that are not in the route registry.
- If medical, allergy, pregnancy, eating disorder, or chronic-condition treatment questions appear, be cautious and recommend professional care.
- Never ask for passwords, payment card data, government IDs, or highly sensitive private data.
- User data may only be used for personalization when supplied in the request context and must not be repeated unnecessarily.

Output:
- Return only valid JSON.
- Shape:
  {
    "reply": "short helpful answer",
    "routeIntent": "short intent name",
    "actions": [
      {"label": "Button label", "route": "/route", "type": "navigate", "params": {}, "reason": "why this helps"}
    ]
  }
""".strip()


COMMON_REPLIES = {
    "hi": AssistantResponse(
        reply="Hey, I am here. Tell me what you want to eat, your goal, or what you need to do in the app.",
        actions=[
            AssistantAction(label="Explore cooks", route="/explore", reason="Start finding cooks."),
            AssistantAction(label="Browse recipes", route="/recipes", reason="Get meal ideas."),
        ],
        routeIntent="greeting",
    ),
    "hello": AssistantResponse(
        reply="Hey, I am ready. I can help with meals, recipes, bookings, gym fuel, or finding a cook.",
        actions=[
            AssistantAction(label="Meal match", route="/meal-match", reason="Find a meal idea."),
            AssistantAction(label="Start booking", route="/booking-request", type="start_booking", reason="Create a booking request."),
        ],
        routeIntent="greeting",
    ),
}


app = FastAPI(title="Private Chef Assistant", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

api_key = os.getenv("OPENAI_API_KEY", "").strip()
client = OpenAI(api_key=api_key) if api_key else None
model_candidates = [
    item.strip()
    for item in os.getenv("FOOD_AI_MODEL_CANDIDATES", "gpt-5.5,gpt-5.4,gpt-4.1,gpt-4.1-mini").split(",")
    if item.strip()
]
cache_ttl_seconds = int(os.getenv("ASSISTANT_CACHE_TTL_SECONDS", "900"))
response_cache: dict[str, tuple[float, AssistantResponse]] = {}


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {"ok": True, "modelConfigured": bool(client), "service": "private-chef-assistant"}


@app.post("/food-ai", response_model=AssistantResponse)
def food_ai(request: AssistantRequest) -> AssistantResponse:
    messages = [message for message in request.messages if message.content.strip()]
    if not messages:
        return AssistantResponse(reply="Send me a craving, goal, or app task and I will help.", actions=default_actions())

    latest = messages[-1].content.strip()
    common = COMMON_REPLIES.get(normalize_text(latest))
    if common:
        return common.model_copy(update={"cached": True})

    cache_key = build_cache_key(messages, request.user, request.app_context)
    cached = get_cached(cache_key)
    if cached:
        return cached.model_copy(update={"cached": True})

    local_actions = infer_actions(latest)
    local_reply = build_local_reply(latest, local_actions)

    if not client:
        response = AssistantResponse(
            reply=local_reply,
            actions=local_actions,
            routeIntent=local_actions[0].reason if local_actions else "general",
            model="local-router",
        )
        set_cached(cache_key, response)
        return response

    response = call_large_model(messages, request.user, request.app_context, local_actions, local_reply)
    set_cached(cache_key, response)
    return response


def call_large_model(
    messages: list[ChatMessage],
    user: dict | None,
    app_context: dict | None,
    local_actions: list[AssistantAction],
    local_reply: str,
) -> AssistantResponse:
    payload = {
        "route_registry": [
            {
                "key": route.key,
                "label": route.label,
                "route": route.route,
                "type": route.action_type,
                "description": route.description,
            }
            for route in APP_ROUTES
        ],
        "safe_user_context": sanitize_user_context(user),
        "app_context": sanitize_app_context(app_context),
        "local_router_suggestion": {
            "reply": local_reply,
            "actions": [action.model_dump() for action in local_actions],
        },
        "messages": [message.model_dump() for message in messages[-12:]],
    }

    errors: list[str] = []
    for model in model_candidates:
        try:
            result = client.responses.create( # type: ignore
                model=model,
                instructions=SYSTEM_PROMPT,
                input=json.dumps(payload),
                temperature=0.35,
                store=False,
            )
            raw = getattr(result, "output_text", "") or ""
            parsed = parse_model_json(raw)
            reply = clean_reply(parsed.get("reply")) or local_reply
            actions = validate_actions(parsed.get("actions")) or local_actions
            route_intent = clean_route_intent(parsed.get("routeIntent")) or infer_route_intent(actions)
            return AssistantResponse(reply=reply, actions=actions[:3], routeIntent=route_intent, model=model)
        except Exception as error:  # noqa: BLE001 - fallback through candidate models.
            errors.append(f"{model}: {error}")
            continue

    return AssistantResponse(
        reply=local_reply,
        actions=local_actions,
        routeIntent=infer_route_intent(local_actions),
        model=f"local-router-after-model-error: {' | '.join(errors)[:240]}",
    )


def infer_actions(prompt: str) -> list[AssistantAction]:
    text = normalize_text(prompt)
    scored: list[tuple[int, AppRoute]] = []
    for route in APP_ROUTES:
        score = sum(1 for word in route.intent_words if word in text)
        if score:
            scored.append((score, route))

    scored.sort(key=lambda item: item[0], reverse=True)
    routes = [route for _, route in scored[:3]]

    if not routes:
        if any(word in text for word in ("hungry", "eat", "meal", "dinner", "lunch", "breakfast", "craving")):
            routes = [find_route("meal_match"), find_route("search"), find_route("recipes")]
        else:
            routes = [find_route("explore"), find_route("recipes")]

    return [
        AssistantAction(
            label=route.label,
            route=route.route,
            type=route.action_type,
            reason=f"{route.key}_intent",
        )
        for route in routes
        if route
    ][:3]


def build_local_reply(prompt: str, actions: list[AssistantAction]) -> str:
    text = normalize_text(prompt)
    if any(word in text for word in ("book", "chef", "cook", "private chef")):
        return "I can help you turn that into a clear booking request. Tell me the date, guest count, cuisine, budget, and whether ingredients are included."
    if any(word in text for word in ("gym", "protein", "workout", "muscle")):
        return "For gym fuel, anchor the meal with protein, add a steady carb, and keep fats moderate near training. I can help you pick a meal or open gym-focused ideas."
    if any(word in text for word in ("recipe", "cook myself", "ingredient")):
        return "Tell me what ingredients you have and how much time you want to spend. I can suggest a recipe, then send you to recipes or search."
    if any(word in text for word in ("booking", "chat", "message", "request")):
        return "I can help you get to the right part of the app. Use one of these buttons to continue."
    return "I can help with meal ideas, recipes, cook booking, chats, profile setup, and gym-aware food planning. Here are the best places to continue."


def validate_actions(raw_actions: object) -> list[AssistantAction]:
    if not isinstance(raw_actions, list):
        return []

    known_routes = {route.route: route for route in APP_ROUTES}
    actions: list[AssistantAction] = []
    for item in raw_actions:
        if not isinstance(item, dict):
            continue
        route_value = str(item.get("route", "")).strip()
        route = known_routes.get(route_value)
        if not route:
            continue
        label = str(item.get("label") or route.label).strip()[:32]
        action_type = item.get("type") if item.get("type") in ("navigate", "search", "start_booking") else route.action_type
        params = item.get("params") if isinstance(item.get("params"), dict) else {}
        safe_params = {str(key): str(value)[:120] for key, value in params.items()} # type: ignore
        reason = str(item.get("reason") or route.key).strip()[:120]
        actions.append(AssistantAction(label=label, route=route.route, type=action_type, params=safe_params, reason=reason)) # type: ignore
    return actions[:3]


def sanitize_user_context(user: dict | None) -> dict:
    if not isinstance(user, dict):
        return {}
    allowed_keys = {
        "id",
        "role",
        "profileComplete",
        "tasteProfile",
        "spicePreference",
        "mealTemperaturePreference",
        "gymGoal",
        "portionPreference",
        "dietaryPreferences",
        "countryCode",
        "countryName",
    }
    blocked = {"password", "phone", "email", "addressLine1", "addressLine2", "documentNumber", "documentType"}
    return {key: value for key, value in user.items() if key in allowed_keys and key not in blocked}


def sanitize_app_context(app_context: dict | None) -> dict:
    if not isinstance(app_context, dict):
        return {}
    allowed = {"currentRoute", "platform", "timezone", "subscriptionPlan"}
    return {key: value for key, value in app_context.items() if key in allowed}


def parse_model_json(raw: str) -> dict:
    if not raw.strip():
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
        if not match:
            return {}
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return {}


def clean_reply(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip()[:1200]


def clean_route_intent(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return re.sub(r"[^a-zA-Z0-9_-]", "", value.strip())[:48]


def infer_route_intent(actions: list[AssistantAction]) -> str:
    return actions[0].reason if actions else "general"


def find_route(key: str) -> AppRoute:
    return next(route for route in APP_ROUTES if route.key == key)


def default_actions() -> list[AssistantAction]:
    return [
        AssistantAction(label="Explore cooks", route="/explore", reason="default_explore"),
        AssistantAction(label="Browse recipes", route="/recipes", reason="default_recipes"),
    ]


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def build_cache_key(messages: list[ChatMessage], user: dict | None, app_context: dict | None) -> str:
    latest_messages = [{"role": item.role, "content": normalize_text(item.content)} for item in messages[-6:]]
    identity = {
        "messages": latest_messages,
        "user": sanitize_user_context(user),
        "app_context": sanitize_app_context(app_context),
    }
    return hashlib.sha256(json.dumps(identity, sort_keys=True).encode("utf-8")).hexdigest()


def get_cached(key: str) -> AssistantResponse | None:
    cached = response_cache.get(key)
    if not cached:
        return None
    cached_at, value = cached
    if time.time() - cached_at > cache_ttl_seconds:
        response_cache.pop(key, None)
        return None
    return value


def set_cached(key: str, value: AssistantResponse) -> None:
    if len(response_cache) > 500:
        oldest_key = min(response_cache.items(), key=lambda item: item[1][0])[0]
        response_cache.pop(oldest_key, None)
    response_cache[key] = (time.time(), value)


