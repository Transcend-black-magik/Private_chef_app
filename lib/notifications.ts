import {
  collection,
  doc,
  getSupabaseStore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "@/lib/supabase-store";

import { getAccountIdentifiers } from "@/lib/account-identity";
import { getCurrentUserRecord } from "@/lib/app-state";

export type AppNotificationRecord = {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  type: "booking_request" | "booking_update" | "chat_message" | "account_activity";
  title: string;
  body: string;
  bookingId: string;
  threadId: string;
  read: boolean;
  createdAt?: string;
};

function getSupabaseStoreInstance() {
  return getSupabaseStore();
}

function timestampToIsoString(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return undefined;
}

function mapNotification(id: string, data: Record<string, unknown>): AppNotificationRecord {
  return {
    id,
    recipientId: String(data.recipientId || ""),
    actorId: String(data.actorId || ""),
    actorName: String(data.actorName || ""),
    type: (data.type as AppNotificationRecord["type"]) || "booking_update",
    title: String(data.title || ""),
    body: String(data.body || ""),
    bookingId: String(data.bookingId || ""),
    threadId: String(data.threadId || ""),
    read: Boolean(data.read),
    createdAt: timestampToIsoString(data.createdAt),
  };
}

export function subscribeToNotificationsForCurrentUser(
  callback: (notifications: AppNotificationRecord[]) => void,
  onError?: (error: Error) => void,
) {
  const store = getSupabaseStoreInstance();
  if (!store) {
    callback([]);
    return () => undefined;
  }

  let unsubscribe: () => void = () => undefined;

  void getCurrentUserRecord().then((currentUser) => {
    const identifiers = getAccountIdentifiers(currentUser);

    if (!identifiers.length) {
      callback([]);
      return;
    }

    unsubscribe = onSnapshot(
      query(
        collection(store, "notifications"),
        where("recipientId", "in", identifiers),
        limit(80),
      ),
      (snapshot) =>
        callback(
          snapshot.docs
            .map((item: { id: string; data: () => unknown }) =>
              mapNotification(item.id, item.data() as Record<string, unknown>),
            )
            .sort((left: AppNotificationRecord, right: AppNotificationRecord) => (right.createdAt || "").localeCompare(left.createdAt || "")),
        ),
      (error) => onError?.(error),
    );
  });

  return () => unsubscribe();
}

export async function markNotificationRead(notificationId: string) {
  const store = getSupabaseStoreInstance();
  if (!store || !notificationId.trim()) {
    return;
  }

  await updateDoc(doc(store, "notifications", notificationId), {
    read: true,
    readAt: serverTimestamp(),
  });
}
