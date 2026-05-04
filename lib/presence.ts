import {
  getDatabase,
  off,
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  set,
} from "firebase/database";

import { toSafeFieldKey, uniqueStrings } from "@/lib/account-identity";
import type { UserSession, StoredUser } from "@/lib/app-state";
import { firebaseApp } from "@/lib/firebase";

type PresenceAccount = Pick<UserSession, "id" | "email" | "role" | "name"> &
  Partial<Pick<StoredUser, "photoUrl">>;

export type PresenceState = {
  isOnline: boolean;
  lastChangedAt?: number | null;
  name?: string;
  role?: "explorer" | "cook";
};

const databaseUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;

function getPresenceDatabase() {
  if (!firebaseApp || !databaseUrl) {
    return null;
  }

  return getDatabase(firebaseApp, databaseUrl);
}

function presenceRef(identifier: string) {
  const database = getPresenceDatabase();

  if (!database) {
    return null;
  }

  return ref(database, `presence/${toSafeFieldKey(identifier)}`);
}

export function startPresenceTracking(account: PresenceAccount | null | undefined) {
  const database = getPresenceDatabase();

  if (!database || !account) {
    return () => undefined;
  }

  const identifiers = account.id?.trim() ? [account.id.trim()] : [];

  if (!identifiers.length) {
    return () => undefined;
  }

  const connectedRef = ref(database, ".info/connected");
  const cleanupCallbacks: Array<() => void> = [];

  const unsubscribe = onValue(connectedRef, (snapshot) => {
    if (snapshot.val() !== true) {
      return;
    }

    identifiers.forEach((identifier) => {
      const nextPresenceRef = presenceRef(identifier);

      if (!nextPresenceRef) {
        return;
      }

      void onDisconnect(nextPresenceRef).set({
        isOnline: false,
        lastChangedAt: serverTimestamp(),
        name: account.name,
        role: account.role,
      });

      void set(nextPresenceRef, {
        isOnline: true,
        lastChangedAt: serverTimestamp(),
        name: account.name,
        role: account.role,
      });

      cleanupCallbacks.push(() => {
        void set(nextPresenceRef, {
          isOnline: false,
          lastChangedAt: serverTimestamp(),
          name: account.name,
          role: account.role,
        });
      });
    });
  });

  return () => {
    off(connectedRef);
    unsubscribe();
    cleanupCallbacks.forEach((callback) => callback());
  };
}

export function subscribeToPresence(
  identifiers: string[],
  callback: (presence: Record<string, PresenceState>) => void,
) {
  const database = getPresenceDatabase();

  if (!database) {
    callback({});
    return () => undefined;
  }

  const uniqueIdentifiers = uniqueStrings(identifiers);
  const state: Record<string, PresenceState> = {};
  const unsubscribeCallbacks = uniqueIdentifiers.map((identifier) => {
    const nextPresenceRef = presenceRef(identifier);

    if (!nextPresenceRef) {
      return () => undefined;
    }

    return onValue(nextPresenceRef, (snapshot) => {
      const nextValue = snapshot.val() as PresenceState | null;

      if (nextValue) {
        state[identifier] = nextValue;
      } else {
        delete state[identifier];
      }

      callback({ ...state });
    });
  });

  callback({ ...state });

  return () => {
    unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
  };
}
