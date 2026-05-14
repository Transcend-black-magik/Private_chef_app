import { collection, getDocs, getSupabaseStore, limit, query, where } from "@/lib/supabase-store";

import type { StoredUser } from "@/lib/app-state";
import { getUserById } from "@/lib/app-state";

export type CookDirectoryRecord = {
  id: string;
  name: string;
  headline: string;
  specialties: string[];
  location: string;
  city: string;
  region: string;
  countryName: string;
  priceHint: string;
  yearsExperience: string;
  serviceAreaLabel: string;
  serviceRadiusMiles: string;
  note: string;
  bio: string;
  availableNow: boolean;
  verified: boolean;
  profilePercent: number;
  emergencyReady: boolean;
  responseLabel: string;
  tags: string[];
  trustBadges: string[];
  ratingAverage: number;
  ratingCount: number;
  user: StoredUser;
};

export const cuisineChips = [
  "All",
  "Jollof",
  "Soups",
  "Small chops",
  "Healthy",
  "Brunch",
  "Grills",
  "Seafood",
  "Desserts",
  "Family trays",
  "Meal prep",
  "Private dining",
  "Nutritionist",
  "High protein",
  "Paid recipes",
  "Recipe packs",
];

function normalizeText(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function splitSpecialties(value?: string | null) {
  return normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

function buildCookLocation(user: StoredUser) {
  return [normalizeText(user.city), normalizeText(user.region)].filter(Boolean).join(", ") || "Area not added";
}

function buildTrustBadges(user: StoredUser) {
  const badges = [];

  if (user.cookVerification?.status === "verified") {
    badges.push("Verified ID");
  } else if (user.cookVerification?.status === "pending_review") {
    badges.push("ID pending review");
  }

  if (normalizeText(user.emergencyContactName) && normalizeText(user.emergencyContactPhone)) {
    badges.push("Emergency contact");
  }

  if (normalizeText(user.safetyPractices)) {
    badges.push("Safety details added");
  }

  if (normalizeText(user.serviceRadiusMiles)) {
    badges.push(`${normalizeText(user.serviceRadiusMiles)} mile radius`);
  }

  return badges;
}

export function getCookProfilePercent(user: StoredUser) {
  const fields = [
    user.name,
    user.phone,
    user.addressLine1,
    user.city,
    user.region,
    user.countryName,
    user.bio,
    user.specialtiesText,
    user.yearsExperience,
    user.serviceAreaLabel,
    user.serviceRadiusMiles,
    user.nutritionServices,
    user.emergencyContactName,
    user.emergencyContactPhone,
    user.safetyPractices,
    user.cookVerification?.documentNumber,
  ];
  const completed = fields.filter((item) => normalizeText(item)).length;
  return Math.round((completed / fields.length) * 100);
}

export function mapUserToCookDirectoryRecord(user: StoredUser): CookDirectoryRecord {
  const specialties = splitSpecialties(user.specialtiesText);
  const city = normalizeText(user.city);
  const region = normalizeText(user.region);
  const countryName = normalizeText(user.countryName);
  const serviceAreaLabel = normalizeText(user.serviceAreaLabel) || buildCookLocation(user);
  const yearsExperience = normalizeText(user.yearsExperience) || "New";
  const verified = user.cookVerification?.status === "verified";
  const emergencyReady = Boolean(
    normalizeText(user.emergencyContactName) && normalizeText(user.emergencyContactPhone),
  );
  const tags = unique([
    ...specialties,
    normalizeText(user.dietaryPreferences),
    normalizeText(user.gymGoal),
    normalizeText(user.portionPreference),
    normalizeText(user.serviceAreaLabel),
    normalizeText(user.countryName),
    normalizeText(user.role === "cook" ? "Home cooking" : ""),
    normalizeText(user.specialtiesText) ? "Paid recipes" : "",
    normalizeText(user.dietaryPreferences) || normalizeText(user.gymGoal) ? "Nutritionist" : "",
    normalizeText(user.nutritionCredentials) || normalizeText(user.nutritionServices) ? "Nutrition support" : "",
    ...(user.availableMealCategories || []),
  ]).slice(0, 10);
  const trustBadges = buildTrustBadges(user);

  return {
    id: user.id,
    name: normalizeText(user.name) || "Cook profile",
    headline:
      normalizeText(user.bio).split(".")[0] ||
      "Home cook profile with verified contact and service details.",
    specialties,
    location: buildCookLocation(user),
    city,
    region,
    countryName,
    priceHint: verified ? "Bookable profile" : "Profile in review",
    yearsExperience,
    serviceAreaLabel,
    serviceRadiusMiles: normalizeText(user.serviceRadiusMiles) || "Flexible",
    note:
      normalizeText(user.safetyPractices) ||
      "Profile includes home service details, platform trust status, and direct contact information.",
    bio:
      normalizeText(user.bio) ||
      "This cook has started building a trusted profile and can add more detail as bookings grow.",
    availableNow: true,
    verified,
    profilePercent: getCookProfilePercent(user),
    emergencyReady,
    responseLabel: verified ? "Priority trust profile" : "Growing profile",
    tags,
    trustBadges,
    ratingAverage: Number(user.ratingAverage || 0),
    ratingCount: Number(user.ratingCount || 0),
    user,
  };
}

export async function fetchCookDirectory() {
  const store = getSupabaseStore();
  if (!store) {
    return [] as CookDirectoryRecord[];
  }

  try {
    const snapshot = await getDocs(
      query(
        collection(store, "users"),
        where("role", "==", "cook"),
        where("profileComplete", "==", true),
        limit(40),
      ),
    );

    return snapshot.docs
      .map((item) => item.data() as StoredUser)
      .filter((user) => user && user.role === "cook")
      .map(mapUserToCookDirectoryRecord)
      .filter((cook) => cook.verified);
  } catch {
    return [] as CookDirectoryRecord[];
  }
}

export async function getCookById(id: string) {
  const user = await getUserById(id);

  if (!user || user.role !== "cook") {
    return null;
  }

  return mapUserToCookDirectoryRecord(user);
}

export function filterCooks({
  cooks,
  searchQuery,
  selectedCuisine,
  isAvailableNow,
  isVerifiedOnly,
}: {
  cooks: CookDirectoryRecord[];
  searchQuery: string;
  selectedCuisine: string;
  isAvailableNow: boolean;
  isVerifiedOnly: boolean;
}) {
  const normalizedSearch = normalizeText(searchQuery).toLowerCase();
  const normalizedCuisine = normalizeText(selectedCuisine).toLowerCase();

  return cooks.filter((cook) => {
    const searchableText = [
      cook.name,
      cook.headline,
      cook.location,
      cook.city,
      cook.region,
      cook.countryName,
      cook.serviceAreaLabel,
      cook.note,
      cook.bio,
      cook.priceHint,
      cook.user.dietaryPreferences,
      cook.user.nutritionCredentials,
      cook.user.nutritionServices,
      cook.user.gymGoal,
      cook.user.portionPreference,
      cook.user.safetyPractices,
      cook.user.specialtiesText,
      (cook.user.availableMealCategories || []).join(" "),
      cook.tags.join(" "),
      cook.specialties.join(" "),
      cook.trustBadges.join(" "),
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
    const matchesCuisine =
      normalizedCuisine === "all" ||
      cook.tags.some((tag) => tag.toLowerCase().includes(normalizedCuisine)) ||
      cook.specialties.some((item) => item.toLowerCase().includes(normalizedCuisine)) ||
      cook.headline.toLowerCase().includes(normalizedCuisine);
    const matchesAvailability = !isAvailableNow || cook.availableNow;
    const matchesVerification = !isVerifiedOnly || cook.verified;

    return matchesSearch && matchesCuisine && matchesAvailability && matchesVerification;
  });
}

function experienceScore(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function popularityScore(cook: CookDirectoryRecord) {
  return (
    (cook.verified ? 30 : 0) +
    Math.min(cook.profilePercent, 100) +
    cook.trustBadges.length * 6 +
    cook.specialties.length * 4 +
    experienceScore(cook.yearsExperience) * 3 +
    (cook.emergencyReady ? 12 : 0)
  );
}

export type CookSortMode = "popular" | "verified" | "complete" | "nearby";

export function sortCooks(cooks: CookDirectoryRecord[], mode: CookSortMode = "popular") {
  const nextCooks = [...cooks];

  return nextCooks.sort((left, right) => {
    if (mode === "verified") {
      return Number(right.verified) - Number(left.verified) || popularityScore(right) - popularityScore(left);
    }

    if (mode === "complete") {
      return right.profilePercent - left.profilePercent || popularityScore(right) - popularityScore(left);
    }

    if (mode === "nearby") {
      return (
        left.location.localeCompare(right.location) ||
        popularityScore(right) - popularityScore(left)
      );
    }

    return popularityScore(right) - popularityScore(left);
  });
}
