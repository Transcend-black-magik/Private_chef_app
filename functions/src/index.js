const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");

exports.marketplaceProviderPlaceholder = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }

  return {
    provider: "paystack",
    mode: "dummy",
    message:
      "Dummy payment flow is active. The next live provider target is Paystack for the Nigeria-first launch path.",
  };
});

exports.submitIdentityVerification = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }

  const {
    documentImageBase64,
    selfieImageBase64,
    firstName,
    lastName,
    countryCode,
    countryName,
    documentType,
    documentNumber,
  } = request.data || {};

  if (!documentImageBase64 || !selfieImageBase64) {
    throw new HttpsError("invalid-argument", "Both document image and selfie are required.");
  }

  const appId = process.env.DOJAH_APP_ID || "";
  const secretKey = process.env.DOJAH_SECRET_KEY || "";
  const baseUrl = process.env.DOJAH_BASE_URL || "https://sandbox.dojah.io";

  if (!appId || !secretKey) {
    throw new HttpsError(
      "failed-precondition",
      "Dojah verification is not configured yet. Add DOJAH_APP_ID and DOJAH_SECRET_KEY to Functions secrets or environment.",
    );
  }

  const response = await fetch(`${baseUrl}/api/v1/kyc/photoid/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      AppId: appId,
      Authorization: secretKey,
    },
    body: JSON.stringify({
      selfie_image: selfieImageBase64,
      photoid_image: documentImageBase64,
      first_name: firstName || "",
      last_name: lastName || "",
      country_code: countryCode || "",
      country_name: countryName || "",
      document_type: documentType || "",
      document_number: documentNumber || "",
    }),
  });

  if (!response.ok) {
    const rawText = await response.text();
    logger.error("Dojah verification failed", { status: response.status, rawText });
    throw new HttpsError("internal", "The verification provider could not process this request right now.");
  }

  const payload = await response.json();
  const selfie = payload?.entity?.selfie || {};
  const confidenceValue = Number(selfie.confidence_value || 0);
  const match = Boolean(selfie.match) || confidenceValue >= 90;
  const providerMessage = match
    ? "Identity verification completed successfully."
    : "The selfie did not match the document clearly enough. Try again with clearer images.";

  return {
    ok: true,
    status: match ? "verified" : "failed",
    provider: "dojah",
    referenceId: payload?.entity?.reference_id || payload?.reference_id || "",
    matchScore: confidenceValue,
    message: providerMessage,
  };
});
