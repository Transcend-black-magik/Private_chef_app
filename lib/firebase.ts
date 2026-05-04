import type { FirebaseApp } from "firebase/app";
import { getApp, getApps, initializeApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Persistence } from "firebase/auth";
import { getAuth, initializeAuth, onAuthStateChanged, type User } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

export const firebaseConfigured = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
].every(Boolean);

export const firebaseApp = firebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseAuth = firebaseApp
  ? getApps().length > 1
    ? getAuth(firebaseApp)
    : initializeFirebaseAuth(firebaseApp)
  : null;

let authReadyPromise: Promise<User | null> | null = null;

function initializeFirebaseAuth(app: FirebaseApp) {
  try {
    const authModule = require("@firebase/auth") as {
      getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
    };

    if (!authModule.getReactNativePersistence) {
      return getAuth(app);
    }

    return initializeAuth(app, {
      persistence: authModule.getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export async function waitForFirebaseAuthReady() {
  if (!firebaseAuth) {
    return null;
  }

  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  return authReadyPromise;
}
