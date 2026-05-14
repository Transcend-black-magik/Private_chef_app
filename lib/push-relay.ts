import { supabase, supabaseConfigured } from "@/lib/supabase";

const pushRelayEndpoint = process.env.EXPO_PUBLIC_PUSH_RELAY_ENDPOINT;

export type RelayPushPayload = {
  notificationId?: string;
  recipientId: string;
  title: string;
  body: string;
  type: "booking_request" | "booking_update" | "chat_message" | "account_activity";
  bookingId?: string;
  threadId?: string;
};

export async function sendPushNotificationViaRelay(payload: RelayPushPayload) {
  if (!pushRelayEndpoint?.trim() || !supabaseConfigured) {
    return;
  }

  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      return;
    }

    await fetch(pushRelayEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Push relay failures should never block app flows.
  }
}
