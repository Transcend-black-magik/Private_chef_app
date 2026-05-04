import type { StoredUser, UserSession } from "@/lib/app-state";

type AccountLike = Pick<StoredUser, "id" | "email"> | Pick<UserSession, "id" | "email">;

export function normalizeEmail(email?: string | null) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function getAccountIdentifiers(account: AccountLike | null | undefined) {
  if (!account) {
    return [] as string[];
  }

  const values = [account.id?.trim(), normalizeEmail(account.email)].filter(Boolean) as string[];
  return [...new Set(values)];
}

export function matchesAccountIdentifier(
  identifier: string | null | undefined,
  account: AccountLike | null | undefined,
) {
  if (!identifier || !account) {
    return false;
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();

  return getAccountIdentifiers(account).some(
    (value) => value.trim().toLowerCase() === normalizedIdentifier,
  );
}

export function toSafeFieldKey(identifier: string) {
  return identifier.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function uniqueStrings(values: (string | null | undefined)[]) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}
