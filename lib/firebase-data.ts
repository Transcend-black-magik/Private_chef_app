import { firebaseApp } from "@/lib/firebase";
import type { StoredUser } from "@/lib/app-state";
import { getAsyncErrorMessage, withTimeout } from "@/lib/async-guard";

const databaseUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
let firestoreInstancePromise: Promise<any> | null = null;

type PersistedUserRecord = {
  id: string;
  email: string;
  name: string;
  phone: string;
  phoneCountryCode?: string;
  phoneNationalNumber?: string;
  photoUrl?: string;
  savedCookIds?: string[];
  recommendationConsent?: boolean;
  behaviorInsightsConsent?: boolean;
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
  role: StoredUser["role"];
  provider: StoredUser["provider"];
  profileComplete: boolean;
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
  safetyPractices?: string;
  cookVerification?: StoredUser["cookVerification"];
  createdAt: string;
  updatedAt: string;
};

function stripUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedFields(item)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .map(([key, entryValue]) => [key, stripUndefinedFields(entryValue)]);

  return Object.fromEntries(entries) as T;
}

export const realtimeDatabaseConfigured = Boolean(firebaseApp && databaseUrl);
export const firestoreConfigured = Boolean(firebaseApp);

async function getFirebaseFirestore() {
  if (!firebaseApp) {
    return null;
  }

  if (!firestoreInstancePromise) {
    firestoreInstancePromise = (async () => {
      const firestoreModule = await import("firebase/firestore");

      try {
        return firestoreModule.initializeFirestore(firebaseApp, {
          experimentalAutoDetectLongPolling: true,
        });
      } catch {
        return firestoreModule.getFirestore(firebaseApp);
      }
    })();
  }

  return firestoreInstancePromise;
}

function toPersistedUserRecord(user: StoredUser): PersistedUserRecord {
  return stripUndefinedFields({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    phoneCountryCode: user.phoneCountryCode,
    phoneNationalNumber: user.phoneNationalNumber,
    photoUrl: user.photoUrl,
    savedCookIds: user.savedCookIds,
    recommendationConsent: user.recommendationConsent,
    behaviorInsightsConsent: user.behaviorInsightsConsent,
    tasteProfile: user.tasteProfile,
    spicePreference: user.spicePreference,
    mealTemperaturePreference: user.mealTemperaturePreference,
    gymGoal: user.gymGoal,
    portionPreference: user.portionPreference,
    dislikedIngredients: user.dislikedIngredients,
    wantedIngredients: user.wantedIngredients,
    stripeConnectedAccountId: user.stripeConnectedAccountId,
    stripeOnboardingComplete: user.stripeOnboardingComplete,
    activeSessionId: user.activeSessionId,
    activeSessionIssuedAt: user.activeSessionIssuedAt,
    role: user.role,
    provider: user.provider,
    profileComplete: user.profileComplete,
    countryCode: user.countryCode,
    countryName: user.countryName,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    city: user.city,
    region: user.region,
    emergencyContactName: user.emergencyContactName,
    emergencyContactPhone: user.emergencyContactPhone,
    householdNotes: user.householdNotes,
    dietaryPreferences: user.dietaryPreferences,
    bio: user.bio,
    specialtiesText: user.specialtiesText,
    yearsExperience: user.yearsExperience,
    serviceRadiusMiles: user.serviceRadiusMiles,
    serviceAreaLabel: user.serviceAreaLabel,
    safetyPractices: user.safetyPractices,
    cookVerification: user.cookVerification ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}

function realtimeUserKey(id: string) {
  return id.replace(/[.#$/[\]]/g, "_");
}

export async function syncUserRecordToFirebase(user: StoredUser) {
  if (!firebaseApp) {
    throw new Error("Firebase is not configured for this app.");
  }

  const payload = toPersistedUserRecord(user);

  try {
    const firestoreModule = await import("firebase/firestore");
    const firestore = await getFirebaseFirestore();

    if (!firestore) {
      throw new Error("Firestore is not available.");
    }

    await withTimeout(
      firestoreModule.setDoc(
      firestoreModule.doc(firestore, "users", user.id),
      payload,
      { merge: true },
      ),
      { timeoutMessage: "Saving your account is taking too long. Please try again." },
    );

    if (user.cookVerification) {
      await withTimeout(
        firestoreModule.setDoc(
        firestoreModule.doc(firestore, "cookVerificationQueue", user.id),
        stripUndefinedFields({
          ...user.cookVerification,
          userId: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          updatedAt: user.updatedAt,
        }),
        { merge: true },
        ),
        { timeoutMessage: "Saving your verification details is taking too long. Please try again." },
      );
    }
  } catch (error) {
    throw new Error(getAsyncErrorMessage(error, "We could not save your account details to Firestore."));
  }

  if (!databaseUrl) {
    return;
  }

  try {
    const realtimeModule = await import("firebase/database");
    const database = realtimeModule.getDatabase(firebaseApp, databaseUrl);

    await withTimeout(
      realtimeModule.set(
      realtimeModule.ref(database, `users/${realtimeUserKey(user.id)}`),
      payload,
      ),
      { timeoutMessage: "Syncing your account is taking too long. Please try again." },
    );

    if (user.cookVerification) {
      await withTimeout(
        realtimeModule.set(
        realtimeModule.ref(database, `cookVerificationQueue/${realtimeUserKey(user.id)}`),
        stripUndefinedFields({
          ...user.cookVerification,
          userId: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          updatedAt: user.updatedAt,
        }),
        ),
        { timeoutMessage: "Syncing your verification details is taking too long. Please try again." },
      );
    }
  } catch {
    // Realtime sync is optional until the database URL is added.
  }
}

export async function fetchUserRecordByEmail(email: string) {
  if (!firebaseApp) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  try {
    const firestoreModule = await import("firebase/firestore");
    const firestore = await getFirebaseFirestore();

    if (!firestore) {
      return null;
    }
    const snapshot = await withTimeout(
      firestoreModule.getDocs(
        firestoreModule.query(
          firestoreModule.collection(firestore, "users"),
          firestoreModule.where("email", "==", normalizedEmail),
          firestoreModule.limit(1),
        ),
      ),
      { timeoutMessage: "Loading your account is taking too long. Please try again." },
    );

    const firstDoc = snapshot.docs[0];

    if (!firstDoc) {
      return null;
    }

    return firstDoc.data() as StoredUser;
  } catch {
    return null;
  }
}

export async function fetchUserRecordById(id: string) {
  if (!firebaseApp || !id.trim()) {
    return null;
  }

  try {
    const firestoreModule = await import("firebase/firestore");
    const firestore = await getFirebaseFirestore();

    if (!firestore) {
      return null;
    }
    const snapshot = await withTimeout(
      firestoreModule.getDoc(firestoreModule.doc(firestore, "users", id.trim())),
      { timeoutMessage: "Loading this account is taking too long. Please try again." },
    );

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as StoredUser;
  } catch {
    return null;
  }
}
