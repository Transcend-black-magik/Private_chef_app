import type { StoredUser } from "@/lib/app-state";

function clean(value?: string) {
  return typeof value === "string" ? value.trim() : "";
}

export type ExplorerContext = {
  locality: string;
  city: string;
  region: string;
  cityLabel: string;
  nearbyLabel: string;
  regionLabel: string;
  countryLabel: string;
  daypart: "morning" | "afternoon" | "evening";
  daypartGreeting: string;
  foodMoment: string;
  comfortLine: string;
  safetyLine: string;
};

export function getExplorerContext(user?: StoredUser | null): ExplorerContext {
  const locality = clean(user?.serviceAreaLabel) || clean(user?.addressLine2);
  const city = clean(user?.city);
  const region = clean(user?.region);
  const countryLabel = clean(user?.countryName) || "your country";
  const cityLabel = locality || city || region || countryLabel || "your area";
  const nearbyLabel =
    [locality, city, region].filter(Boolean).join(", ") ||
    city ||
    region ||
    countryLabel ||
    "your area";
  const regionLabel = region || countryLabel || "your area";

  const hour = new Date().getHours();
  const daypart: ExplorerContext["daypart"] =
    hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  if (daypart === "morning") {
    return {
      city,
      region,
      locality,
      cityLabel,
      nearbyLabel,
      regionLabel,
      countryLabel,
      daypart,
      daypartGreeting: `Good morning in ${cityLabel}.`,
      foodMoment: "Plan meals before the day gets busy.",
      comfortLine: `Discover cooks around ${cityLabel} who can help with prep, lunch, or tonight's dinner.`,
      safetyLine: "Every booking stays inside the app, with verified profiles and protected messaging.",
    };
  }

  if (daypart === "afternoon") {
    return {
      city,
      region,
      locality,
      cityLabel,
      nearbyLabel,
      regionLabel,
      countryLabel,
      daypart,
      daypartGreeting: `Good afternoon in ${cityLabel}.`,
      foodMoment: "This is a good time to line up dinner or a quiet handoff later.",
      comfortLine: `Find cooks around ${cityLabel} who can step into your evening smoothly.`,
      safetyLine: "Stay protected with in-app booking, trust details, and no need to move the conversation outside.",
    };
  }

  return {
      city,
      region,
      locality,
      cityLabel,
      nearbyLabel,
      regionLabel,
      countryLabel,
      daypart,
    daypartGreeting: `Good evening in ${cityLabel}.`,
    foodMoment: "Tonight is about comfort, timing, and choosing someone you can trust quickly.",
    comfortLine: `See who feels right for homes around ${cityLabel} tonight.`,
    safetyLine: "Your home details, chat, and booking steps stay protected with us from start to finish.",
  };
}
