import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDoc, collection, getFirestore, serverTimestamp } from "firebase/firestore";

import { fetchUserRecordByEmail, fetchUserRecordById, syncUserRecordToFirebase } from "@/lib/firebase-data";
import { firebaseApp, firebaseAuth, waitForFirebaseAuthReady } from "@/lib/firebase";

export type UserRole = "explorer" | "cook";
export type AuthProvider = "email" | "google" | "apple";
export type VerificationProvider = "manual" | "persona" | "dojah" | "smile_id";
export type CookVerificationStatus = "not_started" | "pending_review" | "verified" | "failed";

export type CookVerification = {
  provider: VerificationProvider;
  status: CookVerificationStatus;
  countryCode: string;
  countryName: string;
  documentType: string;
  documentNumber: string;
  submittedAt: string | null;
  referenceId?: string;
  verifiedAt?: string | null;
  failureReason?: string;
  matchScore?: number;
};

export type UserSession = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  provider: AuthProvider;
  profileComplete: boolean;
};

export type ActiveDeviceSession = {
  id: string;
  issuedAt: string;
  label: string;
};

export type StoredUser = UserSession & {
  password?: string;
  phoneCountryCode?: string;
  phoneNationalNumber?: string;
  photoUrl?: string;
  savedCookIds?: string[];
  recommendationConsent?: boolean;
  behaviorInsightsConsent?: boolean;
  shareReadReceipts?: boolean;
  tasteProfile?: string[];
  spicePreference?: string;
  mealTemperaturePreference?: string;
  gymGoal?: string;
  portionPreference?: string;
  dislikedIngredients?: string;
  wantedIngredients?: string;
  stripeConnectedAccountId?: string;
  stripeOnboardingComplete?: boolean;
  activeSessionId?: string;
  activeSessionIssuedAt?: string;
  activeSessions?: ActiveDeviceSession[];
  countryCode?: string;
  countryName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  householdNotes?: string;
  dietaryPreferences?: string;
  bio?: string;
  specialtiesText?: string;
  yearsExperience?: string;
  serviceRadiusMiles?: string;
  serviceAreaLabel?: string;
  availableMealCategories?: string[];
  safetyPractices?: string;
  cookVerification?: CookVerification | null;
  createdAt: string;
  updatedAt: string;
};

const ONBOARDING_KEY = "cook-for-me:onboarding-seen";
const ACTIVE_SESSION_KEY = "cook-for-me:active-session-id";
export const MAX_ACTIVE_DEVICE_SESSIONS = 3;
export const DEVICE_LIMIT_MESSAGE =
  "This account is already signed in on 3 devices. Log out on one previous device before signing in here. If you no longer have that device, reset your password or use the account recovery sign-out link when it is available, then try again.";

async function createAccountActivityNotification(params: {
  recipientId: string;
  title: string;
  body: string;
}) {
  const firestore = firebaseApp ? getFirestore(firebaseApp) : null;

  if (!firestore || !params.recipientId.trim()) {
    return;
  }

  try {
    await addDoc(collection(firestore, "notifications"), {
      recipientId: params.recipientId,
      actorId: params.recipientId,
      actorName: "Cook for Me",
      type: "account_activity",
      title: params.title,
      body: params.body,
      bookingId: "",
      threadId: "",
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Account activity alerts should not block session updates.
  }
}

export async function markOnboardingSeen() {
  await AsyncStorage.setItem(ONBOARDING_KEY, "true");
}

export async function createSession(_session: UserSession) {
  return;
}

function createSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function registerSingleDeviceSession(user: StoredUser) {
  const issuedAt = new Date().toISOString();
  const existingSessions = sanitizeActiveDeviceSessions(user.activeSessions, user);
  const localSessionId = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
  const localSessionStillAllowed = Boolean(
    localSessionId && existingSessions.some((session) => session.id === localSessionId),
  );
  const activeSessionId = localSessionStillAllowed ? localSessionId! : createSessionId();

  if (!localSessionStillAllowed && existingSessions.length >= MAX_ACTIVE_DEVICE_SESSIONS) {
    await createAccountActivityNotification({
      recipientId: user.id,
      title: "New device sign-in blocked",
      body: "A new device tried to sign in, but this account already has 3 active devices.",
    });
    throw new Error(DEVICE_LIMIT_MESSAGE);
  }

  await AsyncStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);

  const activeSessions = localSessionStillAllowed
    ? existingSessions.map((session) =>
        session.id === activeSessionId ? { ...session, issuedAt } : session,
      )
    : [
        ...existingSessions,
        {
          id: activeSessionId,
          issuedAt,
          label: "Signed-in device",
        },
      ];

  const nextUser: StoredUser = {
    ...user,
    activeSessionId,
    activeSessionIssuedAt: issuedAt,
    activeSessions,
    updatedAt: issuedAt,
  };

  await saveUserRecord(nextUser);

  if (!localSessionStillAllowed) {
    await createAccountActivityNotification({
      recipientId: nextUser.id,
      title: "New device signed in",
      body:
        existingSessions.length > 0
          ? "A new device signed in to your account. Review your active devices if this was not you."
          : "Your account is now active on this device.",
    });
  }

  return nextUser;
}

export async function getLocalActiveSessionId() {
  return AsyncStorage.getItem(ACTIVE_SESSION_KEY);
}

export async function clearSession() {
  const localSessionId = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);

  if (localSessionId) {
    const currentUser = await getCurrentUserRecord();

    if (currentUser?.activeSessions?.length) {
      try {
        await saveUserRecord({
          ...currentUser,
          activeSessionId: currentUser.activeSessionId === localSessionId ? undefined : currentUser.activeSessionId,
          activeSessionIssuedAt:
            currentUser.activeSessionId === localSessionId ? undefined : currentUser.activeSessionIssuedAt,
          activeSessions: currentUser.activeSessions.filter((session) => session.id !== localSessionId),
          updatedAt: new Date().toISOString(),
        });
        await createAccountActivityNotification({
          recipientId: currentUser.id,
          title: "Device signed out",
          body: "One of your signed-in devices logged out of your account.",
        });
      } catch {
        // Local sign-out should still complete if the remote session cleanup cannot be saved.
      }
    }
  }

  await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);

  if (!firebaseAuth) {
    return;
  }

  await firebaseAuth.signOut();
}

export async function getSession() {
  await waitForFirebaseAuthReady();
  const currentUser = firebaseAuth?.currentUser;

  if (!currentUser?.email) {
    return null;
  }

  const storedUser =
    (await fetchUserRecordById(currentUser.uid)) ??
    (await fetchUserRecordByEmail(currentUser.email));

  if (!storedUser) {
    return null;
  }

  if (storedUser.id !== currentUser.uid) {
    const alignedUser: StoredUser = {
      ...storedUser,
      id: currentUser.uid,
      updatedAt: new Date().toISOString(),
    };

    await syncUserRecordToFirebase(alignedUser);
    return toSession(alignedUser);
  }

  return toSession(storedUser);
}

export async function getUserByEmail(email: string) {
  const user = await fetchUserRecordByEmail(email);
  return user ? sanitizeStoredUser(user) : null;
}

export async function getUserById(id: string) {
  const user = await fetchUserRecordById(id);
  return user ? sanitizeStoredUser(user) : null;
}

export async function getUserByIdentifier(identifier: string) {
  const trimmedIdentifier = identifier.trim();

  if (!trimmedIdentifier) {
    return null;
  }

  const byId = await getUserById(trimmedIdentifier);

  if (byId) {
    return byId;
  }

  if (trimmedIdentifier.includes("@")) {
    return getUserByEmail(trimmedIdentifier);
  }

  return null;
}

export async function getCurrentUserRecord() {
  await waitForFirebaseAuthReady();
  const currentUser = firebaseAuth?.currentUser;

  if (!currentUser) {
    return null;
  }

  const storedUser =
    (await getUserById(currentUser.uid)) ??
    (currentUser.email ? await getUserByEmail(currentUser.email) : null);

  if (!storedUser) {
    return null;
  }

  if (storedUser.id !== currentUser.uid) {
    const alignedUser: StoredUser = {
      ...storedUser,
      id: currentUser.uid,
      updatedAt: new Date().toISOString(),
    };

    await syncUserRecordToFirebase(alignedUser);
    return alignedUser;
  }

  return storedUser;
}

export async function listUsers() {
  return [] as StoredUser[];
}

export async function saveUserRecord(user: StoredUser) {
  const sanitizedUser = sanitizeStoredUser(user);

  if (!sanitizedUser) {
    return;
  }

  await syncUserRecordToFirebase(sanitizedUser);
}

export async function getLaunchState() {
  const hasSeenOnboarding = (await AsyncStorage.getItem(ONBOARDING_KEY)) === "true";
  const session = await getSession();

  return {
    hasSeenOnboarding,
    lastUser: session,
    session,
  };
}

export function toSession(user: StoredUser): UserSession {
  return {
    id: user.id,
    name: user.name,
    phone: typeof user.phone === "string" ? user.phone : "",
    email: normalizeStoredEmail(user.email),
    role: user.role,
    provider: user.provider,
    profileComplete: user.profileComplete,
  };
}

function normalizeStoredEmail(email?: string | null) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function sanitizeStoredUser(raw: unknown): StoredUser | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const nextUser = raw as Partial<StoredUser>;
  const email = normalizeStoredEmail(nextUser.email);

  if (!email) {
    return null;
  }

  const role: UserRole = nextUser.role === "cook" ? "cook" : "explorer";
  const provider: AuthProvider =
    nextUser.provider === "google" || nextUser.provider === "apple" ? nextUser.provider : "email";

  return {
    id: typeof nextUser.id === "string" && nextUser.id.trim() ? nextUser.id : email,
    name: typeof nextUser.name === "string" ? nextUser.name : "",
    phone: typeof nextUser.phone === "string" ? nextUser.phone : "",
    email,
    role,
    provider,
    profileComplete: Boolean(nextUser.profileComplete),
    password: typeof nextUser.password === "string" ? nextUser.password : undefined,
    phoneCountryCode:
      typeof nextUser.phoneCountryCode === "string" ? nextUser.phoneCountryCode : undefined,
    phoneNationalNumber:
      typeof nextUser.phoneNationalNumber === "string" ? nextUser.phoneNationalNumber : undefined,
    photoUrl: typeof nextUser.photoUrl === "string" ? nextUser.photoUrl : undefined,
    savedCookIds: Array.isArray(nextUser.savedCookIds)
      ? nextUser.savedCookIds.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : undefined,
    recommendationConsent:
      typeof nextUser.recommendationConsent === "boolean"
        ? nextUser.recommendationConsent
        : undefined,
    behaviorInsightsConsent:
      typeof nextUser.behaviorInsightsConsent === "boolean"
        ? nextUser.behaviorInsightsConsent
        : undefined,
    shareReadReceipts:
      typeof nextUser.shareReadReceipts === "boolean" ? nextUser.shareReadReceipts : true,
    tasteProfile: Array.isArray(nextUser.tasteProfile)
      ? nextUser.tasteProfile.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : undefined,
    spicePreference:
      typeof nextUser.spicePreference === "string" ? nextUser.spicePreference : undefined,
    mealTemperaturePreference:
      typeof nextUser.mealTemperaturePreference === "string"
        ? nextUser.mealTemperaturePreference
        : undefined,
    gymGoal: typeof nextUser.gymGoal === "string" ? nextUser.gymGoal : undefined,
    portionPreference:
      typeof nextUser.portionPreference === "string" ? nextUser.portionPreference : undefined,
    dislikedIngredients:
      typeof nextUser.dislikedIngredients === "string" ? nextUser.dislikedIngredients : undefined,
    wantedIngredients:
      typeof nextUser.wantedIngredients === "string" ? nextUser.wantedIngredients : undefined,
    stripeConnectedAccountId:
      typeof nextUser.stripeConnectedAccountId === "string"
        ? nextUser.stripeConnectedAccountId
        : undefined,
    stripeOnboardingComplete:
      typeof nextUser.stripeOnboardingComplete === "boolean"
        ? nextUser.stripeOnboardingComplete
        : undefined,
    activeSessionId:
      typeof nextUser.activeSessionId === "string" ? nextUser.activeSessionId : undefined,
    activeSessionIssuedAt:
      typeof nextUser.activeSessionIssuedAt === "string" ? nextUser.activeSessionIssuedAt : undefined,
    activeSessions: sanitizeActiveDeviceSessions(nextUser.activeSessions, nextUser),
    countryCode: typeof nextUser.countryCode === "string" ? nextUser.countryCode : undefined,
    countryName: typeof nextUser.countryName === "string" ? nextUser.countryName : undefined,
    addressLine1: typeof nextUser.addressLine1 === "string" ? nextUser.addressLine1 : undefined,
    addressLine2: typeof nextUser.addressLine2 === "string" ? nextUser.addressLine2 : undefined,
    city: typeof nextUser.city === "string" ? nextUser.city : undefined,
    region: typeof nextUser.region === "string" ? nextUser.region : undefined,
    emergencyContactName:
      typeof nextUser.emergencyContactName === "string" ? nextUser.emergencyContactName : undefined,
    emergencyContactPhone:
      typeof nextUser.emergencyContactPhone === "string" ? nextUser.emergencyContactPhone : undefined,
    householdNotes:
      typeof nextUser.householdNotes === "string" ? nextUser.householdNotes : undefined,
    dietaryPreferences:
      typeof nextUser.dietaryPreferences === "string" ? nextUser.dietaryPreferences : undefined,
    bio: typeof nextUser.bio === "string" ? nextUser.bio : undefined,
    specialtiesText:
      typeof nextUser.specialtiesText === "string" ? nextUser.specialtiesText : undefined,
    yearsExperience:
      typeof nextUser.yearsExperience === "string" ? nextUser.yearsExperience : undefined,
    serviceRadiusMiles:
      typeof nextUser.serviceRadiusMiles === "string" ? nextUser.serviceRadiusMiles : undefined,
    serviceAreaLabel:
      typeof nextUser.serviceAreaLabel === "string" ? nextUser.serviceAreaLabel : undefined,
    availableMealCategories: Array.isArray(nextUser.availableMealCategories)
      ? nextUser.availableMealCategories.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : undefined,
    safetyPractices:
      typeof nextUser.safetyPractices === "string" ? nextUser.safetyPractices : undefined,
    cookVerification: sanitizeCookVerification(nextUser.cookVerification),
    createdAt:
      typeof nextUser.createdAt === "string" && nextUser.createdAt
        ? nextUser.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof nextUser.updatedAt === "string" && nextUser.updatedAt
        ? nextUser.updatedAt
        : new Date().toISOString(),
  };
}

function sanitizeActiveDeviceSessions(raw: unknown, user?: Partial<StoredUser>): ActiveDeviceSession[] {
  const sessions = Array.isArray(raw)
    ? raw
        .map((item): ActiveDeviceSession | null => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const nextSession = item as Partial<ActiveDeviceSession>;
          const id = typeof nextSession.id === "string" ? nextSession.id.trim() : "";

          if (!id) {
            return null;
          }

          return {
            id,
            issuedAt:
              typeof nextSession.issuedAt === "string" && nextSession.issuedAt
                ? nextSession.issuedAt
                : new Date().toISOString(),
            label:
              typeof nextSession.label === "string" && nextSession.label.trim()
                ? nextSession.label.trim()
                : "Signed-in device",
          };
        })
        .filter((item): item is ActiveDeviceSession => Boolean(item))
    : [];

  if (!Array.isArray(raw) && !sessions.length && typeof user?.activeSessionId === "string" && user.activeSessionId.trim()) {
    sessions.push({
      id: user.activeSessionId.trim(),
      issuedAt:
        typeof user.activeSessionIssuedAt === "string" && user.activeSessionIssuedAt
          ? user.activeSessionIssuedAt
          : new Date().toISOString(),
      label: "Signed-in device",
    });
  }

  return sessions.slice(0, MAX_ACTIVE_DEVICE_SESSIONS);
}

function sanitizeCookVerification(raw: unknown): CookVerification | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const nextVerification = raw as Partial<CookVerification>;

  return {
    provider:
      nextVerification.provider === "persona" ||
      nextVerification.provider === "dojah" ||
      nextVerification.provider === "smile_id"
        ? nextVerification.provider
        : "manual",
    status:
      nextVerification.status === "verified" ||
      nextVerification.status === "pending_review" ||
      nextVerification.status === "failed"
        ? nextVerification.status
        : "not_started",
    countryCode: typeof nextVerification.countryCode === "string" ? nextVerification.countryCode : "",
    countryName: typeof nextVerification.countryName === "string" ? nextVerification.countryName : "",
    documentType:
      typeof nextVerification.documentType === "string" ? nextVerification.documentType : "",
    documentNumber:
      typeof nextVerification.documentNumber === "string" ? nextVerification.documentNumber : "",
    submittedAt:
      typeof nextVerification.submittedAt === "string" ? nextVerification.submittedAt : null,
    referenceId:
      typeof nextVerification.referenceId === "string" ? nextVerification.referenceId : undefined,
    verifiedAt:
      typeof nextVerification.verifiedAt === "string" ? nextVerification.verifiedAt : null,
    failureReason:
      typeof nextVerification.failureReason === "string" ? nextVerification.failureReason : undefined,
    matchScore:
      typeof nextVerification.matchScore === "number" ? nextVerification.matchScore : undefined,
  };
}
