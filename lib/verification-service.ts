import { getCurrentUserRecord, saveUserRecord, type CookVerification, type StoredUser } from "@/lib/app-state";
import { getAsyncErrorMessage } from "@/lib/async-guard";

export function canStartIdentityVerification(user?: Pick<StoredUser, "role" | "cookVerification"> | null) {
  return user?.role === "cook" && user.cookVerification?.status !== "verified";
}

export async function submitCookIdentityVerification(input: {
  documentImageBase64: string;
  selfieImageBase64: string;
}) {
  const currentUser = await getCurrentUserRecord();

  if (!currentUser) {
    throw new Error("Sign in first before verifying your profile.");
  }

  if (currentUser.role !== "cook") {
    throw new Error("Only cook accounts can use this verification flow.");
  }

  if (currentUser.cookVerification?.status === "verified") {
    throw new Error("This cook account is already verified.");
  }

  if (!input.documentImageBase64.trim() || !input.selfieImageBase64.trim()) {
    throw new Error("Add both a document image and a selfie before verifying.");
  }

  const now = new Date().toISOString();

  const nextVerification: CookVerification = {
    provider: "manual",
    status: "verified",
    countryCode: currentUser.countryCode || "",
    countryName: currentUser.countryName || "",
    documentType: currentUser.cookVerification?.documentType || "Platform trust check",
    documentNumber: currentUser.cookVerification?.documentNumber || "AUTO-VERIFIED",
    submittedAt: now,
    referenceId: `platform-auto-${currentUser.id}`,
    verifiedAt: now,
    matchScore: 1,
  };

  const nextUser: StoredUser = {
    ...currentUser,
    cookVerification: nextVerification,
    updatedAt: new Date().toISOString(),
  };

  await saveUserRecord(nextUser);

  return nextUser;
}

export async function getCookVerificationState() {
  const currentUser = await getCurrentUserRecord();
  return currentUser?.cookVerification ?? null;
}

export function getVerificationActionCopy(user?: Pick<StoredUser, "cookVerification"> | null) {
  const status = user?.cookVerification?.status || "not_started";

  if (status === "verified") {
    return {
      title: "Verification complete",
      body: "Your profile is platform verified. Explorers can now see the stronger trust signal on your cook profile.",
      locked: true,
    };
  }

  if (status === "pending_review") {
    return {
      title: "Verification submitted",
      body: "Your profile trust check is under review. You do not need to submit it again right now.",
      locked: true,
    };
  }

  if (status === "failed") {
    return {
      title: "Verification needs another try",
      body: user?.cookVerification?.failureReason || "The last submission did not pass review. You can submit clearer images again.",
      locked: false,
    };
  }

  return {
    title: "Verify cook profile",
    body: "Submit your profile check to unlock the trusted cook badge. Government ID verification can be added later with a compliant verification provider.",
    locked: false,
  };
}

export function formatVerificationError(error: unknown) {
  return getAsyncErrorMessage(error, "We could not complete profile verification right now.");
}
