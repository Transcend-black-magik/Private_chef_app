import { NativeModules, Platform } from "react-native";

import {
  createSession,
  type CookVerification,
  getUserByEmail,
  getSession,
  saveUserRecord,
  toSession,
  type AuthProvider,
  type StoredUser,
  type UserRole,
} from "@/lib/app-state";
import { fetchUserRecordById } from "@/lib/firebase-data";
import { firebaseAuth, waitForFirebaseAuthReady } from "@/lib/firebase";
import {
  getDocumentPlaceholder,
  getIdentityVerificationProvider,
} from "@/lib/identity-review";
import { getAsyncErrorMessage, withTimeout } from "@/lib/async-guard";

type AuthResult =
  | { ok: true; user: StoredUser; needsProfile: boolean }
  | { ok: false; error: string };

type EmailSignUpPayload = {
  email: string;
  password: string;
  role: UserRole;
};

type EmailSignInPayload = {
  email: string;
  password: string;
};

type ProfilePayload = {
  email: string;
  name: string;
  phoneCountryCode: string;
  phoneNationalNumber: string;
  role: UserRole;
  countryCode?: string;
  countryName?: string;
  addressLine1?: string;
  city?: string;
  region?: string;
  documentType?: string;
  documentNumber?: string;
};

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;

function loadNativeFirebaseAuth() {
  if (Platform.OS === "web") {
    return null;
  }

  const hasNativeFirebaseApp = Boolean(NativeModules?.RNFBAppModule);

  if (!hasNativeFirebaseApp) {
    return null;
  }

  try {
    const module = require("@react-native-firebase/auth");
    return (module.default ?? module) as any;
  } catch {
    return null;
  }
}

function loadGoogleSignin() {
  if (Platform.OS === "web") {
    return null;
  }

  const hasGoogleNativeModule = Boolean(NativeModules?.RNGoogleSignin);

  if (!hasGoogleNativeModule) {
    return null;
  }

  try {
    const module = require("@react-native-google-signin/google-signin");
    return module.GoogleSignin as any;
  } catch {
    return null;
  }
}

function nativeFirebaseUnavailableMessage() {
  return "Firebase native auth is not available in this build yet. Rebuild the app and reopen it.";
}

function webFirebaseUnavailableMessage() {
  return "Firebase web auth is not configured yet. Check your .env Firebase values and restart Expo.";
}

async function loadWebFirebaseAuthTools() {
  try {
    const module = await import("firebase/auth");

    return {
      createUserWithEmailAndPassword: module.createUserWithEmailAndPassword,
      signInWithEmailAndPassword: module.signInWithEmailAndPassword,
    };
  } catch {
    return null;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function emailLooksValid(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

function buildFallbackEmail(provider: Exclude<AuthProvider, "email">, role: UserRole) {
  return `${provider}.${role}@cookforme.local`;
}

function inferProviderFromCurrentUser(): AuthProvider {
  const providerId = firebaseAuth?.currentUser?.providerData?.[0]?.providerId ?? "";

  switch (providerId) {
    case "google.com":
      return "google";
    case "apple.com":
      return "apple";
    default:
      return "email";
  }
}

function createStoredUser({
  id,
  email,
  role,
  provider,
  name,
  phone,
  password,
}: {
  id?: string;
  email: string;
  role: UserRole;
  provider: AuthProvider;
  name?: string;
  phone?: string;
  password?: string;
}): StoredUser {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date().toISOString();

  return {
    id: id?.trim() || normalizedEmail,
    email: normalizedEmail,
    name: name?.trim() || "",
    phone: phone?.trim() || "",
    role,
    provider,
    profileComplete: Boolean(name?.trim() && phone?.trim()),
    password,
    createdAt: now,
    updatedAt: now,
  };
}

async function signOutFirebaseAuth(nativeAuth: ReturnType<typeof loadNativeFirebaseAuth>) {
  if (nativeAuth) {
    await nativeAuth().signOut();
    return;
  }

  if (firebaseAuth) {
    await firebaseAuth.signOut();
  }
}

async function deleteCurrentFirebaseAuthUser(nativeAuth: ReturnType<typeof loadNativeFirebaseAuth>) {
  try {
    const currentUser = nativeAuth ? nativeAuth().currentUser : firebaseAuth?.currentUser;
    await currentUser?.delete();
  } catch {
    // If cleanup fails, the surfaced save error is still the important part.
  }
}

function formatAuthError(error: unknown, fallback: string) {
  return getAsyncErrorMessage(error, fallback);
}

export async function signUpWithEmail(payload: EmailSignUpPayload): Promise<AuthResult> {
  const email = normalizeEmail(payload.email);
  const password = payload.password.trim();

  if (!emailLooksValid(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (password.length < 6) {
    return { ok: false, error: "Use at least 6 characters for your password." };
  }

  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return { ok: false, error: "That email already has an account. Try signing in." };
  }

  const nativeAuth = loadNativeFirebaseAuth();

  try {
    if (nativeAuth) {
      await withTimeout(nativeAuth().createUserWithEmailAndPassword(email, password), {
        timeoutMessage: "Creating your account is taking too long. Please try again.",
      });
    } else {
      const webAuthTools = await loadWebFirebaseAuthTools();

      if (!firebaseAuth || !webAuthTools) {
        return { ok: false, error: webFirebaseUnavailableMessage() };
      }

      await withTimeout(webAuthTools.createUserWithEmailAndPassword(firebaseAuth, email, password), {
        timeoutMessage: "Creating your account is taking too long. Please try again.",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create your account.";
    return { ok: false, error: message };
  }

  const authUserId = nativeAuth
    ? nativeAuth().currentUser?.uid
    : (firebaseAuth?.currentUser?.uid ?? "");
  const user = createStoredUser({
    id: authUserId || email,
    email,
    role: payload.role,
    provider: "email",
    password,
  });

  try {
    await withTimeout(saveUserRecord(user), {
      timeoutMessage: "Saving your new account is taking too long. Please try again.",
    });
    await createSession(toSession(user));
  } catch (error) {
    await deleteCurrentFirebaseAuthUser(nativeAuth);
    return {
      ok: false,
      error: formatAuthError(
        error,
        "Your login was created, but we could not save your account profile.",
      ),
    };
  }

  return {
    ok: true,
    user,
    needsProfile: true,
  };
}

export async function signInWithEmail(payload: EmailSignInPayload): Promise<AuthResult> {
  const email = normalizeEmail(payload.email);
  const password = payload.password.trim();

  if (!emailLooksValid(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const nativeAuth = loadNativeFirebaseAuth();

  try {
    if (nativeAuth) {
      await withTimeout(nativeAuth().signInWithEmailAndPassword(email, password), {
        timeoutMessage: "Signing you in is taking too long. Please try again.",
      });
    } else {
      const webAuthTools = await loadWebFirebaseAuthTools();

      if (!firebaseAuth || !webAuthTools) {
        return { ok: false, error: webFirebaseUnavailableMessage() };
      }

      await withTimeout(webAuthTools.signInWithEmailAndPassword(firebaseAuth, email, password), {
        timeoutMessage: "Signing you in is taking too long. Please try again.",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not sign you in.";
    return { ok: false, error: message };
  }

  const authUserId = nativeAuth
    ? nativeAuth().currentUser?.uid
    : (firebaseAuth?.currentUser?.uid ?? "");
  const existingUser =
    (authUserId ? await fetchUserRecordById(authUserId) : null) || (await getUserByEmail(email));

  if (existingUser) {
    if (existingUser.provider !== "email") {
      await signOutFirebaseAuth(nativeAuth);
      return { ok: false, error: `Use ${providerLabel(existingUser.provider)} for this account.` };
    }

    await createSession(toSession(existingUser));

    return {
      ok: true,
      user: existingUser,
      needsProfile: !existingUser.profileComplete,
    };
  }

  await signOutFirebaseAuth(nativeAuth);
  return { ok: false, error: "No account was found for this email. Create one first." };
}

export async function signInWithSocialProvider({
  provider,
  role,
  email,
  name,
}: {
  provider: Exclude<AuthProvider, "email">;
  role: UserRole;
  email?: string | null;
  name?: string | null;
}): Promise<AuthResult> {
  const nextEmail = normalizeEmail(email || buildFallbackEmail(provider, role));
  const existingUser = await getUserByEmail(nextEmail);
  const nativeAuth = loadNativeFirebaseAuth();

  if (existingUser) {
    if (existingUser.role !== role) {
      await signOutFirebaseAuth(nativeAuth);
      return { ok: false, error: `That ${providerLabel(provider)} account is linked to a ${existingUser.role} profile.` };
    }

    await createSession(toSession(existingUser));
    return {
      ok: true,
      user: existingUser,
      needsProfile: !existingUser.profileComplete,
    };
  }

  const authUserId = nativeAuth
    ? nativeAuth().currentUser?.uid
    : (firebaseAuth?.currentUser?.uid ?? "");
  const user = createStoredUser({
    id: authUserId || nextEmail,
    email: nextEmail,
    role,
    provider,
    name: name ?? "",
  });

  try {
    await withTimeout(saveUserRecord(user), {
      timeoutMessage: "Saving your social sign-in profile is taking too long. Please try again.",
    });
    await createSession(toSession(user));
  } catch (error) {
    return {
      ok: false,
      error: formatAuthError(error, "We could not save your social account profile yet."),
    };
  }

  return {
    ok: true,
    user,
    needsProfile: true,
  };
}

export async function completeUserProfile(payload: ProfilePayload) {
  await waitForFirebaseAuthReady();

  const currentUser = firebaseAuth?.currentUser ?? null;
  const fallbackEmail = normalizeEmail(payload.email || currentUser?.email || "");
  const currentSession = await getSession();
  const existingUser =
    (currentUser?.uid ? await fetchUserRecordById(currentUser.uid) : null) ||
    (currentSession?.email ? await getUserByEmail(currentSession.email) : null) ||
    (fallbackEmail ? await getUserByEmail(fallbackEmail) : null);

  const baseUser =
    existingUser ??
    (currentUser
      ? createStoredUser({
          id: currentUser.uid,
          email: fallbackEmail || currentUser.email || `${currentUser.uid}@cookforme.local`,
          role: payload.role,
          provider: inferProviderFromCurrentUser(),
          name: currentUser.displayName ?? "",
        })
      : fallbackEmail
        ? createStoredUser({
            email: fallbackEmail,
            role: payload.role,
            provider: "email",
          })
        : null);

  if (!baseUser) {
    return {
      ok: false as const,
      error: "We could not find your account details.",
    };
  }

  const normalizedPhoneCountryCode = payload.phoneCountryCode.trim();
  const normalizedPhoneNationalNumber = payload.phoneNationalNumber.trim();
  const fullPhone = `${normalizedPhoneCountryCode} ${normalizedPhoneNationalNumber}`.trim();
  const normalizedCountryCode = payload.countryCode?.trim() || "";
  const normalizedCountryName = payload.countryName?.trim() || "";
  const normalizedAddressLine1 = payload.addressLine1?.trim() || "";
  const normalizedCity = payload.city?.trim() || "";
  const normalizedRegion = payload.region?.trim() || "";
  const normalizedDocumentType = payload.documentType?.trim() || "";
  const normalizedDocumentNumber = payload.documentNumber?.trim() || "";
  const cookVerification = buildCookVerification(payload.role, {
    countryCode: normalizedCountryCode,
    countryName: normalizedCountryName,
    documentType: normalizedDocumentType,
    documentNumber: normalizedDocumentNumber,
  });

  const nextUser: StoredUser = {
    ...baseUser,
    role: payload.role,
    name: payload.name.trim(),
    phone: fullPhone,
    phoneCountryCode: normalizedPhoneCountryCode,
    phoneNationalNumber: normalizedPhoneNationalNumber,
    countryCode: normalizedCountryCode || baseUser.countryCode,
    countryName: normalizedCountryName || baseUser.countryName,
    addressLine1: normalizedAddressLine1,
    city: normalizedCity,
    region: normalizedRegion,
    cookVerification,
    profileComplete: isProfileComplete(payload.role, {
      name: payload.name.trim(),
      phoneCountryCode: normalizedPhoneCountryCode,
      phoneNationalNumber: normalizedPhoneNationalNumber,
      countryCode: normalizedCountryCode,
      countryName: normalizedCountryName,
      addressLine1: normalizedAddressLine1,
      city: normalizedCity,
      region: normalizedRegion,
      documentType: normalizedDocumentType,
      documentNumber: normalizedDocumentNumber,
    }),
    updatedAt: new Date().toISOString(),
  };

  try {
    await withTimeout(saveUserRecord(nextUser), {
      timeoutMessage: "Saving your profile details is taking too long. Please try again.",
    });
    await createSession(toSession(nextUser));
  } catch (error) {
    return {
      ok: false as const,
      error: formatAuthError(error, "We could not save your profile details to Firebase."),
    };
  }

  return {
    ok: true as const,
    user: nextUser,
  };
}

export function getPostAuthRoute(role: UserRole) {
  return role === "cook" ? "/cook-home" : "/explore";
}

export async function signInWithGoogle(role: UserRole): Promise<AuthResult> {
  const configError = getGoogleAuthConfigError();
  const nativeAuth = loadNativeFirebaseAuth();
  const googleSignin = loadGoogleSignin();

  if (!nativeAuth) {
    return {
      ok: false,
      error: nativeFirebaseUnavailableMessage(),
    };
  }

  if (!googleSignin) {
    return {
      ok: false,
      error: "Google sign-in is not available in this build yet. Rebuild the app and reopen it.",
    };
  }

  if (configError) {
    return {
      ok: false,
      error: configError,
    };
  }

  googleSignin.configure({
    webClientId: googleWebClientId,
  });

  try {
    await googleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result: any = await withTimeout(googleSignin.signIn(), {
      timeoutMessage: "Google sign-in is taking too long. Please try again.",
    });
    const idToken = result.data?.idToken;

    if (!idToken) {
      return {
        ok: false,
        error: "Google sign-in did not return an ID token.",
      };
    }

    const googleCredential = nativeAuth.GoogleAuthProvider.credential(idToken);
    const firebaseResult: any = await withTimeout(nativeAuth().signInWithCredential(googleCredential), {
      timeoutMessage: "Google sign-in is taking too long. Please try again.",
    });

    return signInWithSocialProvider({
      provider: "google",
      role,
      email: firebaseResult.user.email,
      name: firebaseResult.user.displayName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google sign-in could not be completed.";
    return {
      ok: false,
      error: message,
    };
  }
}

export async function signInExistingWithGoogle(): Promise<AuthResult> {
  const configError = getGoogleAuthConfigError();
  const nativeAuth = loadNativeFirebaseAuth();
  const googleSignin = loadGoogleSignin();

  if (!nativeAuth) {
    return {
      ok: false,
      error: nativeFirebaseUnavailableMessage(),
    };
  }

  if (!googleSignin) {
    return {
      ok: false,
      error: "Google sign-in is not available in this build yet. Rebuild the app and reopen it.",
    };
  }

  if (configError) {
    return {
      ok: false,
      error: configError,
    };
  }

  googleSignin.configure({
    webClientId: googleWebClientId,
  });

  try {
    await googleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result: any = await withTimeout(googleSignin.signIn(), {
      timeoutMessage: "Google sign-in is taking too long. Please try again.",
    });
    const idToken = result.data?.idToken;

    if (!idToken) {
      return {
        ok: false,
        error: "Google sign-in did not return an ID token.",
      };
    }

    const googleCredential = nativeAuth.GoogleAuthProvider.credential(idToken);
    const firebaseResult: any = await withTimeout(nativeAuth().signInWithCredential(googleCredential), {
      timeoutMessage: "Google sign-in is taking too long. Please try again.",
    });
    const nextEmail = firebaseResult.user.email?.trim().toLowerCase() || "";

    if (!nextEmail) {
      await signOutFirebaseAuth(nativeAuth);
      return {
        ok: false,
        error: "Google sign-in did not return an email address for this account.",
      };
    }

    const authUserId = firebaseResult.user.uid?.trim() || "";
    const existingUser =
      (authUserId ? await fetchUserRecordById(authUserId) : null) ||
      (await getUserByEmail(nextEmail));

    if (!existingUser) {
      await signOutFirebaseAuth(nativeAuth);
      return {
        ok: false,
        error: "No account was found for this Google sign-in. Create one first.",
      };
    }

    await createSession(toSession(existingUser));

    return {
      ok: true,
      user: existingUser,
      needsProfile: !existingUser.profileComplete,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google sign-in could not be completed.";
    return {
      ok: false,
      error: message,
    };
  }
}

export function getGoogleAuthConfigError() {
  if (!googleWebClientId) {
    return "Google sign-in needs a Web client ID in EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.";
  }

  if (Platform.OS === "ios" && !googleIosUrlScheme) {
    return "Google sign-in on iPhone needs EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME and refreshed Firebase iOS settings.";
  }

  return "";
}

export function providerLabel(provider: AuthProvider) {
  switch (provider) {
    case "google":
      return "Google";
    case "apple":
      return "Apple";
    default:
      return "email and password";
  }
}

function isProfileComplete(
  role: UserRole,
  details: {
    name: string;
    phoneCountryCode: string;
    phoneNationalNumber: string;
    countryCode: string;
    countryName: string;
    addressLine1: string;
    city: string;
    region: string;
    documentType: string;
    documentNumber: string;
  },
) {
  const baseReady = Boolean(
    details.name.trim() &&
      details.phoneCountryCode.trim() &&
      details.phoneNationalNumber.trim() &&
      details.addressLine1.trim() &&
      details.city.trim() &&
      details.region.trim(),
  );

  if (role !== "cook") {
    return Boolean(
      baseReady &&
        details.countryCode.trim() &&
        details.countryName.trim(),
    );
  }

  return Boolean(
    baseReady &&
      details.countryCode.trim() &&
      details.countryName.trim() &&
      details.documentType.trim() &&
      details.documentNumber.trim(),
  );
}

function buildCookVerification(
  role: UserRole,
  details: {
    countryCode: string;
    countryName: string;
    documentType: string;
    documentNumber: string;
  },
): CookVerification | null {
  const hasDocumentBundle = Boolean(
    details.countryCode && details.countryName && details.documentType && details.documentNumber,
  );

  return {
    provider: hasDocumentBundle ? getIdentityVerificationProvider(details.countryCode) : "manual",
    status: hasDocumentBundle ? "pending_review" : "not_started",
    countryCode: details.countryCode,
    countryName: details.countryName,
    documentType: details.documentType,
    documentNumber: details.documentNumber,
    submittedAt: hasDocumentBundle ? new Date().toISOString() : null,
  };
}

export function getVerificationDocumentPlaceholder(countryName: string) {
  return getDocumentPlaceholder(countryName);
}
