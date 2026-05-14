import { getCurrentUserRecord } from "@/lib/app-state";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export type RatingTargetType = "cook" | "recipe" | "meal";

export type RatingRecord = {
  id: string;
  targetType: RatingTargetType;
  targetId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  body: string;
  bookingId: string;
  createdAt?: string;
  updatedAt?: string;
};

function createRatingId(targetType: RatingTargetType, targetId: string, reviewerId: string) {
  return `${targetType}-${targetId}-${reviewerId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function mapRatingRecord(raw: Record<string, unknown>): RatingRecord {
  return {
    id: String(raw.id || ""),
    targetType: (raw.targetType as RatingTargetType) || "cook",
    targetId: String(raw.targetId || ""),
    reviewerId: String(raw.reviewerId || ""),
    reviewerName: String(raw.reviewerName || "Private Chef user"),
    rating: Number(raw.rating || 0),
    body: String(raw.body || ""),
    bookingId: String(raw.bookingId || ""),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };
}

export async function fetchRatingsForTarget(targetType: RatingTargetType, targetId: string) {
  if (!supabaseConfigured || !targetId.trim()) {
    return [] as RatingRecord[];
  }

  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("targetType", targetType)
    .eq("targetId", targetId.trim())
    .order("createdAt", { ascending: false })
    .limit(25);

  if (error) {
    return [] as RatingRecord[];
  }

  return (data || []).map((item) => mapRatingRecord(item as Record<string, unknown>));
}

export async function submitCookRating(params: {
  cookId: string;
  rating: number;
  body?: string;
  bookingId?: string;
}) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser) {
    throw new Error("Sign in before leaving a rating.");
  }

  const cookId = params.cookId.trim();
  const rating = Math.max(1, Math.min(5, Math.round(params.rating * 10) / 10));

  if (!supabaseConfigured || !cookId) {
    throw new Error("Ratings are not available right now.");
  }

  if (currentUser.id === cookId) {
    throw new Error("You cannot rate your own cook profile.");
  }

  const now = new Date().toISOString();
  const id = createRatingId("cook", cookId, currentUser.id);
  const existingRatings = await fetchRatingsForTarget("cook", cookId);
  const existing = existingRatings.find((item) => item.reviewerId === currentUser.id);

  await supabase
    .from("ratings")
    .upsert(
      {
        id,
        targetType: "cook",
        targetId: cookId,
        reviewerId: currentUser.id,
        reviewerName: currentUser.name || "Private Chef user",
        rating,
        body: params.body?.trim() || "",
        bookingId: params.bookingId?.trim() || "",
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      },
      { onConflict: "targetType,targetId,reviewerId" },
    )
    .throwOnError();

  const { data, error } = await supabase.rpc("recalculate_cook_rating", { p_cook_id: cookId });
  if (error) {
    throw error;
  }

  const aggregate = Array.isArray(data) ? data[0] : null;
  const ratingAverage = Number(aggregate?.ratingAverage || aggregate?.ratingaverage || rating);
  const ratingCount = Number(aggregate?.ratingCount || aggregate?.ratingcount || existingRatings.length + (existing ? 0 : 1));

  return { ratingAverage, ratingCount };
}
