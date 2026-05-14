import { NativeModules, Platform } from "react-native";

import {
  createSession,
  type CookVerification,
  getUserByEmail,
  getSession,
  registerSingleDeviceSession,
  saveUserRecord,
  toSession,
  type AuthProvider,
  type StoredUser,
  type UserRole,
} from "@/lib/app-state";
import { fetchUserRecordById } from "@/lib/supabase-data";
import { supabase, supabaseConfigured, waitForSupabaseAuthReady } from "@/lib/supabase";
import {
  getDocumentPlaceholder,
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function emailLooksValid(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

function buildFallbackEmail(provider: Exclude<AuthProvider, "email">, role: UserRole) {
  return `${provider}.${role}@privatechef.local`;
}

function createStoredUser({
  id,
  email,
  role,
  provider,
  name,
  phone,
}: {
  id?: string;
  email: string;
  role: UserRole;
  provider: AuthProvider;
  name?: string;
  phone?: string;
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
    createdAt: now,
    updatedAt: now,
  };
}

async function currentSupabaseUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

async function signOutSupabaseAuth() {
  if (supabaseConfigured) {
    await supabase.auth.signOut();
  }
}

async function deleteCurrentSupabaseAuthUser() {
  // Supabase client-side auth cannot delete auth.users. Keep this as a no-op and
  // surface the profile save error; server-side cleanup can be added later.
}

function formatAuthError(error: unknown, fallback: string) {
  return getAsyncErrorMessage(error, fallback);
}

function supabaseUnavailableMessage() {
  return "Account services are not configured yet. Please try again later.";
}

function normalizeSupabaseAuthMessage(message: string) {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes("email rate limit exceeded")) {
    return "Too many email attempts were made. Please wait a bit, then try signing in again.";
  }

  if (normalized.includes("user already registered")) {
    return "That email is already registered. Try signing in instead of creating a new account.";
  }

  return message;
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

  if (!supabaseConfigured) {
    return { ok: false, error: supabaseUnavailableMessage() };
  }

  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return { ok: false, error: "That email already has an account. Try signing in." };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { ok: false, error: normalizeSupabaseAuthMessage(error.message) };
  }

  if (!data.session) {
      return {
        ok: false,
        error:
          "Email confirmation is required before this profile can be created. Please check your email, then sign in.",
      };
  }

  const user = createStoredUser({
    id: data.user?.id || email,
    email,
    role: payload.role,
    provider: "email",
  });
  let sessionUser = user;

  try {
    await withTimeout(saveUserRecord(user), {
      timeoutMessage: "Saving your new account is taking too long. Please try again.",
    });
    sessionUser = await registerSingleDeviceSession(user);
    await createSession(toSession(sessionUser));
  } catch (error) {
    await deleteCurrentSupabaseAuthUser();
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
    user: sessionUser,
    needsProfile: true,
  };
}

export async function signInWithEmail(payload: EmailSignInPayload): Promise<AuthResult> {
  const email = normalizeEmail(payload.email);
  const password = payload.password.trim();

  if (!emailLooksValid(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (!supabaseConfigured) {
    return { ok: false, error: supabaseUnavailableMessage() };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, error: error.message };
  }

  const existingUser =
    (data.user?.id ? await fetchUserRecordById(data.user.id) : null) || (await getUserByEmail(email));

  if (existingUser) {
    if (existingUser.provider !== "email") {
      await signOutSupabaseAuth();
      return { ok: false, error: `Use ${providerLabel(existingUser.provider)} for this account.` };
    }

    try {
      const sessionUser = await registerSingleDeviceSession(existingUser);
      await createSession(toSession(sessionUser));
      return {
        ok: true,
        user: sessionUser,
        needsProfile: !existingUser.profileComplete,
      };
    } catch (sessionError) {
      await signOutSupabaseAuth();
      return {
        ok: false,
        error: formatAuthError(sessionError, "We could not start a session on this device."),
      };
    }
  }

  if (data.user) {
    const bootstrapUser = createStoredUser({
      id: data.user.id,
      email: data.user.email || email,
      role: "explorer",
      provider: "email",
    });

    try {
      await withTimeout(saveUserRecord(bootstrapUser), {
        timeoutMessage: "Restoring your account profile is taking too long. Please try again.",
      });
      const sessionUser = await registerSingleDeviceSession(bootstrapUser);
      await createSession(toSession(sessionUser));
      return {
        ok: true,
        user: sessionUser,
        needsProfile: true,
      };
    } catch (sessionError) {
      await signOutSupabaseAuth();
      return {
        ok: false,
        error: formatAuthError(
          sessionError,
          "Your auth account exists, but we could not rebuild the profile row yet.",
        ),
      };
    }
  }

  await signOutSupabaseAuth();
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

  if (existingUser) {
    if (existingUser.role !== role) {
      await signOutSupabaseAuth();
      return { ok: false, error: `That ${providerLabel(provider)} account is linked to a ${existingUser.role} profile.` };
    }

    try {
      const sessionUser = await registerSingleDeviceSession(existingUser);
      await createSession(toSession(sessionUser));
      return {
        ok: true,
        user: sessionUser,
        needsProfile: !existingUser.profileComplete,
      };
    } catch (error) {
      await signOutSupabaseAuth();
      return {
        ok: false,
        error: formatAuthError(error, "We could not start a session on this device."),
      };
    }
  }

  const authUser = await currentSupabaseUser();
  const user = createStoredUser({
    id: authUser?.id || nextEmail,
    email: nextEmail,
    role,
    provider,
    name: name ?? authUser?.user_metadata?.full_name ?? "",
  });

  try {
    await withTimeout(saveUserRecord(user), {
      timeoutMessage: "Saving your social sign-in profile is taking too long. Please try again.",
    });
    const sessionUser = await registerSingleDeviceSession(user);
    await createSession(toSession(sessionUser));
    return {
      ok: true,
      user: sessionUser,
      needsProfile: true,
    };
  } catch (error) {
    return {
      ok: false,
      error: formatAuthError(error, "We could not save your social account profile yet."),
    };
  }
}

export async function completeUserProfile(payload: ProfilePayload) {
  await waitForSupabaseAuthReady();

  const currentUser = await currentSupabaseUser();
  const fallbackEmail = normalizeEmail(payload.email || currentUser?.email || "");
  const currentSession = await getSession();
  const existingUser =
    (currentUser?.id ? await fetchUserRecordById(currentUser.id) : null) ||
    (currentSession?.email ? await getUserByEmail(currentSession.email) : null) ||
    (fallbackEmail ? await getUserByEmail(fallbackEmail) : null);

  const baseUser =
    existingUser ??
    (currentUser
      ? createStoredUser({
          id: currentUser.id,
          email: fallbackEmail || currentUser.email || `${currentUser.id}@privatechef.local`,
          role: payload.role,
          provider: inferProviderFromCurrentUser(currentUser.app_metadata?.provider),
          name: currentUser.user_metadata?.full_name ?? "",
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
    const sessionUser = await registerSingleDeviceSession(nextUser);
    await createSession(toSession(sessionUser));
  } catch (error) {
    return {
      ok: false as const,
      error: formatAuthError(error, "We could not save your profile details."),
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
  const googleResult = await signIntoSupabaseWithGoogle();

  if (!googleResult.ok) {
    return googleResult;
  }

  return signInWithSocialProvider({
    provider: "google",
    role,
    email: googleResult.email,
    name: googleResult.name,
  });
}

export async function signInExistingWithGoogle(): Promise<AuthResult> {
  const googleResult = await signIntoSupabaseWithGoogle();

  if (!googleResult.ok) {
    return googleResult;
  }

  const nextEmail = normalizeEmail(googleResult.email || "");

  if (!nextEmail) {
    await signOutSupabaseAuth();
    return {
      ok: false,
      error: "Google sign-in did not return an email address for this account.",
    };
  }

  const authUser = await currentSupabaseUser();
  const existingUser =
    (authUser?.id ? await fetchUserRecordById(authUser.id) : null) ||
    (await getUserByEmail(nextEmail));

  if (!existingUser) {
    await signOutSupabaseAuth();
    return {
      ok: false,
      error: "No account was found for this Google sign-in. Create one first.",
    };
  }

  try {
    const sessionUser = await registerSingleDeviceSession(existingUser);
    await createSession(toSession(sessionUser));
    return {
      ok: true,
      user: sessionUser,
      needsProfile: !existingUser.profileComplete,
    };
  } catch (error) {
    await signOutSupabaseAuth();
    return {
      ok: false,
      error: formatAuthError(error, "We could not start a session on this device."),
    };
  }
}

async function signIntoSupabaseWithGoogle(): Promise<
  | { ok: true; email: string; name: string }
  | { ok: false; error: string }
> {
  const configError = getGoogleAuthConfigError();
  const googleSignin = loadGoogleSignin();

  if (!supabaseConfigured) {
    return { ok: false, error: supabaseUnavailableMessage() };
  }

  if (!googleSignin) {
    return {
      ok: false,
      error: "Google sign-in is not available in this build yet. Rebuild the app and reopen it.",
    };
  }

  if (configError) {
    return { ok: false, error: configError };
  }

  googleSignin.configure({
    webClientId: googleWebClientId,
    iosClientId: googleIosUrlScheme,
  });

  try {
    await googleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result: any = await withTimeout(googleSignin.signIn(), {
      timeoutMessage: "Google sign-in is taking too long. Please try again.",
    });
    const idToken = result.data?.idToken || result.idToken;

    if (!idToken) {
      return {
        ok: false,
        error: "Google sign-in did not return an ID token.",
      };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) {
      return { ok: false, error: formatAuthError(error, "Google sign-in could not be completed.") };
    }

    return {
      ok: true,
      email: data.user?.email || result.data?.user?.email || "",
      name:
        data.user?.user_metadata?.full_name ||
        data.user?.user_metadata?.name ||
        result.data?.user?.name ||
        "",
    };
  } catch (error) {
    const message = formatAuthError(error, "Google sign-in could not be completed.");
    return { ok: false, error: message };
  }
}

export function getGoogleAuthConfigError() {
  if (!googleWebClientId) {
    return "Google sign-in is not available right now. Use email sign-in for this session.";
  }

  if (Platform.OS === "ios" && !googleIosUrlScheme) {
    return "Google sign-in is not available on this device right now. Use email sign-in for this session.";
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

function inferProviderFromCurrentUser(provider?: unknown): AuthProvider {
  if (provider === "google") {
    return "google";
  }

  if (provider === "apple") {
    return "apple";
  }

  return "email";
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
      details.countryName.trim(),
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
  if (role !== "cook") {
    return null;
  }

  const readyForPlatformTrust = Boolean(details.countryCode && details.countryName);
  const now = new Date().toISOString();

  return {
    provider: "manual",
    status: readyForPlatformTrust ? "verified" : "not_started",
    countryCode: details.countryCode,
    countryName: details.countryName,
    documentType: details.documentType || "Platform trust check",
    documentNumber: details.documentNumber || (readyForPlatformTrust ? "AUTO-VERIFIED" : ""),
    submittedAt: readyForPlatformTrust ? now : null,
    verifiedAt: readyForPlatformTrust ? now : null,
    referenceId: readyForPlatformTrust ? `platform-auto-${Date.now()}` : undefined,
    matchScore: readyForPlatformTrust ? 1 : undefined,
  };
}

export function getVerificationDocumentPlaceholder(countryName: string) {
  return getDocumentPlaceholder(countryName);
}
