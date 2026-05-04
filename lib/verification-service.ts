import { getFunctions, httpsCallable } from "firebase/functions";

import { getCurrentUserRecord, saveUserRecord, type CookVerification, type StoredUser } from "@/lib/app-state";
import { firebaseApp } from "@/lib/firebase";
import { getAsyncErrorMessage, withTimeout } from "@/lib/async-guard";

type SubmitIdentityVerificationPayload = {
  documentImageBase64: string;
  selfieImageBase64: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  countryName: string;
  documentType: string;
  documentNumber: string;
};

type VerificationCallableResponse = {
  ok: boolean;
  status: "pending_review" | "verified" | "failed";
  provider: CookVerification["provider"];
  referenceId?: string;
  message?: string;
  matchScore?: number;
};

function normalizeBase64(value: string) {
  return value.replace(/^data:image\/[a-zA-Z+]+;base64,/, "").trim();
}

function splitName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" ") || firstName,
  };
}

export function canStartIdentityVerification(user?: Pick<StoredUser, "role" | "cookVerification"> | null) {
  return user?.role === "cook" && user.cookVerification?.status !== "verified";
}

export async function submitCookIdentityVerification(input: {
  documentImageBase64: string;
  selfieImageBase64: string;
}) {
  const currentUser = await getCurrentUserRecord();

  if (!currentUser) {
    throw new Error("Sign in first before starting identity verification.");
  }

  if (currentUser.role !== "cook") {
    throw new Error("Only cook accounts can start this identity verification flow.");
  }

  if (currentUser.cookVerification?.status === "verified") {
    throw new Error("This cook account is already verified.");
  }

  if (!firebaseApp) {
    throw new Error("Firebase is not configured for verification right now.");
  }

  const { firstName, lastName } = splitName(currentUser.name);
  const payload: SubmitIdentityVerificationPayload = {
    documentImageBase64: normalizeBase64(input.documentImageBase64),
    selfieImageBase64: normalizeBase64(input.selfieImageBase64),
    firstName,
    lastName,
    countryCode: currentUser.countryCode || "",
    countryName: currentUser.countryName || "",
    documentType:
      currentUser.cookVerification?.documentType || "Government ID",
    documentNumber:
      currentUser.cookVerification?.documentNumber || "",
  };

  if (!payload.documentImageBase64 || !payload.selfieImageBase64) {
    throw new Error("Add both a document image and a selfie before verifying.");
  }

  const callable = httpsCallable<SubmitIdentityVerificationPayload, VerificationCallableResponse>(
    getFunctions(firebaseApp),
    "submitIdentityVerification",
  );

  const response = await withTimeout(callable(payload), {
    timeoutMessage: "Identity verification is taking too long. Please try again.",
  });

  const data = response.data;

  if (!data.ok) {
    throw new Error(data.message || "Identity verification could not be completed.");
  }

  const nextVerification: CookVerification = {
    provider: data.provider,
    status: data.status,
    countryCode: payload.countryCode,
    countryName: payload.countryName,
    documentType: payload.documentType,
    documentNumber: payload.documentNumber,
    submittedAt: new Date().toISOString(),
    referenceId: data.referenceId,
    verifiedAt: data.status === "verified" ? new Date().toISOString() : null,
    failureReason: data.status === "failed" ? data.message || "Verification failed." : undefined,
    matchScore: typeof data.matchScore === "number" ? data.matchScore : undefined,
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
      body: "Your identity has been verified. Explorers can now see the stronger trust signal on your cook profile.",
      locked: true,
    };
  }

  if (status === "pending_review") {
    return {
      title: "Verification submitted",
      body: "Your identity is under review. You do not need to submit it again right now.",
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
    title: "Verify your identity",
    body: "Submit your ID and selfie to strengthen trust before explorers book you into their homes.",
    locked: false,
  };
}

export function formatVerificationError(error: unknown) {
  return getAsyncErrorMessage(error, "We could not complete identity verification right now.");
}
