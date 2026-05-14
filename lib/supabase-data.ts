import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { StoredUser } from "@/lib/app-state";
import { getAsyncErrorMessage, withTimeout } from "@/lib/async-guard";

export const realtimeDatabaseConfigured = supabaseConfigured;
export const supabaseDataConfigured = supabaseConfigured;

type PersistedUserRecord = StoredUser & {
  expoPushTokens?: string[];
  savedCookIds?: string[];
};

function stripUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedFields(item)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, stripUndefinedFields(entryValue)]),
  ) as T;
}

function toPersistedUserRecord(user: StoredUser): PersistedUserRecord {
  return stripUndefinedFields({
    ...user,
    cookVerification: user.cookVerification ?? null,
  });
}

export async function syncUserRecordToSupabase(user: StoredUser) {
  if (!supabaseConfigured) {
    throw new Error("Account services are not available right now.");
  }

  const payload = toPersistedUserRecord(user);

  try {
    await withTimeout(
      Promise.resolve(supabase.from("users").upsert(payload, { onConflict: "id" }).throwOnError()),
      { timeoutMessage: "Saving your account is taking too long. Please try again." },
    );

    if (user.cookVerification) {
      await withTimeout(
        supabase
          .from("cookVerificationQueue")
          .upsert(
            stripUndefinedFields({
              ...user.cookVerification,
              id: user.id,
              userId: user.id,
              email: user.email,
              name: user.name,
              phone: user.phone,
              updatedAt: user.updatedAt,
            }),
            { onConflict: "id" },
          )
          .throwOnError() as unknown as Promise<unknown>,
        { timeoutMessage: "Saving your verification details is taking too long. Please try again." },
      );
    }
  } catch (error) {
    throw new Error(getAsyncErrorMessage(error, "We could not save your account details."));
  }
}

export async function fetchUserRecordByEmail(email: string) {
  if (!supabaseConfigured) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data as StoredUser | null;
}

export async function fetchUserRecordById(id: string) {
  if (!supabaseConfigured || !id.trim()) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id.trim())
    .maybeSingle();

  if (error) {
    return null;
  }

  return data as StoredUser | null;
}
