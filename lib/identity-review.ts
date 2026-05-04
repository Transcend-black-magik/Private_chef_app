import type { StoredUser, VerificationProvider } from "@/lib/app-state";

export function getDocumentPlaceholder(countryName: string) {
  if (countryName === "Nigeria") {
    return "National ID, passport, or driver's license number";
  }

  if (countryName === "United States" || countryName === "Canada") {
    return "State ID, driver's license, or passport number";
  }

  if (countryName === "United Kingdom") {
    return "Passport, driver's license, or residence permit number";
  }

  return "Government ID or passport number";
}

export function getIdentityVerificationProvider(countryCode?: string | null): VerificationProvider {
  const normalized = countryCode?.trim().toUpperCase() || "";

  if (normalized === "NG") {
    return "dojah";
  }

  if (normalized === "KE" || normalized === "GH" || normalized === "ZA") {
    return "smile_id";
  }

  return "persona";
}

export function getIdentityVerificationStatusLabel(user?: Pick<StoredUser, "cookVerification"> | null) {
  const status = user?.cookVerification?.status || "not_started";

  if (status === "verified") {
    return "Verified";
  }

  if (status === "pending_review") {
    return "Under review";
  }

  if (status === "failed") {
    return "Needs retry";
  }

  return "Not started";
}

export function isIdentityVerified(user?: Pick<StoredUser, "cookVerification"> | null) {
  return user?.cookVerification?.status === "verified";
}

export function shouldRequireExplorerVerificationForOrder(
  user?: Pick<StoredUser, "role" | "cookVerification"> | null,
) {
  return (
    user?.role === "explorer" &&
    (!user.cookVerification || user.cookVerification.status === "not_started")
  );
}

export function getVerificationTrustCopy(role: "explorer" | "cook") {
  if (role === "cook") {
    return "Cooks must complete identity review before they can earn strong trust in the app.";
  }

  return "Explorers verify before the first protected order so cooks can feel safer entering a home.";
}
