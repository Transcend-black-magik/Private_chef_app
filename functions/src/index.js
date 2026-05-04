const { onCall, HttpsError } = require("firebase-functions/v2/https");

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
