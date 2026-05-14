import { toSafeFieldKey, uniqueStrings } from "@/lib/account-identity";
import type { UserSession, StoredUser } from "@/lib/app-state";
import { supabase, supabaseConfigured } from "@/lib/supabase";

type PresenceAccount = Pick<UserSession, "id" | "email" | "role" | "name"> &
  Partial<Pick<StoredUser, "photoUrl">>;

export type PresenceState = {
  isOnline: boolean;
  lastChangedAt?: number | null;
  name?: string;
  role?: "explorer" | "cook";
};

const localPresenceState: Record<string, PresenceState> = {};

export function startPresenceTracking(account: PresenceAccount | null | undefined) {
  if (!supabaseConfigured || !account?.id?.trim()) {
    return () => undefined;
  }

  const identifier = toSafeFieldKey(account.id.trim());
  const channel = supabase.channel(`presence:${identifier}`, {
    config: { presence: { key: identifier } },
  });

  const state: PresenceState = {
    isOnline: true,
    lastChangedAt: Date.now(),
    name: account.name,
    role: account.role,
  };

  localPresenceState[identifier] = state;

  void channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track(state);
    }
  });

  return () => {
    localPresenceState[identifier] = {
      ...state,
      isOnline: false,
      lastChangedAt: Date.now(),
    };
    void channel.untrack();
    void supabase.removeChannel(channel);
  };
}

export function subscribeToPresence(
  identifiers: string[],
  callback: (presence: Record<string, PresenceState>) => void,
) {
  if (!supabaseConfigured) {
    callback({});
    return () => undefined;
  }

  const uniqueIdentifiers = uniqueStrings(identifiers).map(toSafeFieldKey);
  const channel = supabase.channel(`presence-watch:${uniqueIdentifiers.join(":")}`);

  const emit = () => {
    const presenceState = channel.presenceState<PresenceState>();
    const nextPresence = uniqueIdentifiers.reduce<Record<string, PresenceState>>((accumulator, identifier) => {
      const remoteState = presenceState[identifier]?.[0];
      const localState = localPresenceState[identifier];

      if (remoteState || localState) {
        accumulator[identifier] = remoteState || localState;
      }

      return accumulator;
    }, {});

    callback(nextPresence);
  };

  channel.on("presence", { event: "sync" }, emit).subscribe();
  emit();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function isAnyAccountIdentifierOnline(identifiers: string[]) {
  const uniqueIdentifiers = uniqueStrings(identifiers).map(toSafeFieldKey);
  return uniqueIdentifiers.some((identifier) => localPresenceState[identifier]?.isOnline);
}
