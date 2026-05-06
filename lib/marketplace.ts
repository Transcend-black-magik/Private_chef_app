import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getAccountIdentifiers,
  matchesAccountIdentifier,
  toSafeFieldKey,
  uniqueStrings,
} from "@/lib/account-identity";
import {
  getCurrentUserRecord,
  getUserById,
  type StoredUser,
} from "@/lib/app-state";
import { getAsyncErrorMessage, withTimeout } from "@/lib/async-guard";
import { getCookById, type CookDirectoryRecord } from "@/lib/cook-data";
import { firebaseApp } from "@/lib/firebase";
import type { MealItem } from "@/lib/meal-data";

export const EXPLORER_FEE_RATE = 0.1;
export const COOK_FEE_RATE = 0.1;
export const COMMISSION_RATE = EXPLORER_FEE_RATE + COOK_FEE_RATE;

export type BookingStatus =
  | "draft"
  | "pending_payment"
  | "pending_cook"
  | "awaiting_explorer"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed"
  | "funds_released";

export type ServiceKind = "cook_only" | "shop_only" | "shop_and_cook";
export type OfferSide = "explorer" | "cook";
export type FundsReleaseStatus = "unpaid" | "held" | "released";

export type BookingRecord = {
  id: string;
  explorerId: string;
  explorerName: string;
  cookId: string;
  cookName: string;
  dishSummary: string;
  serviceDateLabel: string;
  guestCount: string;
  areaLabel: string;
  serviceMode: "explorer_home" | "cook_home";
  serviceKind: ServiceKind;
  needsMarketTrip: boolean;
  wantedInMeal: string;
  avoidInMeal: string;
  kitchenGuidance: string;
  fitnessGoal: string;
  portionGuidance: string;
  homeAccessNotes: string;
  ingredientBudgetAmount: number;
  notes: string;
  status: BookingStatus;
  subtotalAmount: number;
  explorerFeeAmount: number;
  cookFeeAmount: number;
  platformFeeAmount: number;
  totalAmount: number;
  payoutAmount: number;
  commissionRate: number;
  currencyCode: string;
  explorerCountryCode: string;
  latestOfferAmount: number;
  latestOfferBy: OfferSide;
  latestOfferNote: string;
  negotiationOpen: boolean;
  cancellationReason: string;
  fundsReleaseStatus: FundsReleaseStatus;
  trustReleaseConfirmed: boolean;
  instantMatch: boolean;
  deliveryMode: "cook_delivery" | "dispatch" | "home_service";
  threadId: string;
  requestGroupKey: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ChatThreadRecord = {
  id: string;
  bookingId: string;
  explorerId: string;
  explorerName: string;
  cookId: string;
  cookName: string;
  participantIds: string[];
  bookingStatus: BookingStatus;
  lastMessageText: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  createdAt?: string;
  updatedAt?: string;
  messageCount: number;
  unreadCountBy: Record<string, number>;
  lastReadAtBy: Record<string, string>;
  isBlocked: boolean;
  archivedBy: Record<string, boolean>;
  hiddenBy: Record<string, boolean>;
};

export type ChatMessageRecord = {
  id: string;
  threadId: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  senderRole: StoredUser["role"];
  body: string;
  createdAt?: string;
};

let cachedThreadsForCurrentUser: ChatThreadRecord[] = [];
const THREAD_CACHE_KEY_PREFIX = "cook-for-me:chat-threads:";
const MESSAGE_CACHE_KEY_PREFIX = "cook-for-me:chat-messages:";

function getFirestoreInstance() {
  return firebaseApp ? getFirestore(firebaseApp) : null;
}

async function createNotification(params: {
  recipientId: string;
  actorId: string;
  actorName: string;
  type: "booking_request" | "booking_update" | "chat_message";
  title: string;
  body: string;
  bookingId?: string;
  threadId?: string;
}) {
  const firestore = getFirestoreInstance();
  if (!firestore || !params.recipientId.trim()) {
    return;
  }

  try {
    await addDoc(collection(firestore, "notifications"), {
      recipientId: params.recipientId,
      actorId: params.actorId,
      actorName: params.actorName,
      type: params.type,
      title: params.title,
      body: params.body,
      bookingId: params.bookingId || "",
      threadId: params.threadId || "",
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Notifications should not block core booking/chat flows.
  }
}

function normalizeAmount(value: string | number) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function timestampToIsoString(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    return new Date((value as { seconds: number }).seconds * 1000).toISOString();
  }

  return undefined;
}

function isoNow() {
  return new Date().toISOString();
}

function currentIdentifiers(user: Pick<StoredUser, "id" | "email"> | null | undefined) {
  return getAccountIdentifiers(user);
}

function getMatchingParticipantIds(
  participantIds: string[],
  user: Pick<StoredUser, "id" | "email">,
) {
  const identifiers = currentIdentifiers(user);
  const matches = participantIds.filter((participantId) =>
    identifiers.some((identifier) => participantId.toLowerCase() === identifier.toLowerCase()),
  );
  return uniqueStrings(matches.length ? matches : identifiers);
}

function pickThreadIdentifier(participantIds: string[], user: Pick<StoredUser, "id" | "email">) {
  return getMatchingParticipantIds(participantIds, user)[0] ?? user.id;
}

function getOtherParticipantIds(participantIds: string[], user: Pick<StoredUser, "id" | "email">) {
  return uniqueStrings(
    participantIds.filter((participantId) => !matchesAccountIdentifier(participantId, user)),
  );
}

function buildUnreadMap(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return {} as Record<string, number>;
  }

  return Object.entries(raw as Record<string, unknown>).reduce<Record<string, number>>(
    (accumulator, [key, value]) => {
      accumulator[key] = typeof value === "number" ? value : 0;
      return accumulator;
    },
    {},
  );
}

function buildLastReadMap(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return {} as Record<string, string>;
  }

  return Object.entries(raw as Record<string, unknown>).reduce<Record<string, string>>(
    (accumulator, [key, value]) => {
      const nextValue = timestampToIsoString(value);
      if (nextValue) {
        accumulator[key] = nextValue;
      }
      return accumulator;
    },
    {},
  );
}

async function getCurrentUserIdentifiers() {
  const currentUser = await getCurrentUserRecord();
  return {
    currentUser,
    identifiers: currentUser ? currentIdentifiers(currentUser) : [],
  };
}

function bookingIsBlocked(status: BookingStatus) {
  return (
    status === "cancelled" ||
    status === "declined" ||
    status === "completed" ||
    status === "funds_released"
  );
}

export function isBookingThreadBlocked(booking: Pick<BookingRecord, "status">) {
  return bookingIsBlocked(booking.status);
}

export function isBookingThreadOpenWindow(
  booking: Pick<BookingRecord, "serviceDateLabel" | "status">,
  now = new Date(),
) {
  if (bookingIsBlocked(booking.status)) {
    return false;
  }

  const serviceTime = Date.parse(booking.serviceDateLabel);
  if (!Number.isFinite(serviceTime)) {
    return false;
  }

  const minutesFromService = (serviceTime - now.getTime()) / 60000;
  return minutesFromService <= 30 && minutesFromService >= -30;
}

function buildMoneySummary(subtotalAmount: number, ingredientBudgetAmount: number) {
  const explorerFeeAmount = roundMoney(subtotalAmount * EXPLORER_FEE_RATE);
  const cookFeeAmount = roundMoney(subtotalAmount * COOK_FEE_RATE);
  const platformFeeAmount = roundMoney(explorerFeeAmount + cookFeeAmount);
  const totalAmount = roundMoney(subtotalAmount + ingredientBudgetAmount + explorerFeeAmount);
  const payoutAmount = roundMoney(subtotalAmount + ingredientBudgetAmount - cookFeeAmount);

  return {
    explorerFeeAmount,
    cookFeeAmount,
    platformFeeAmount,
    totalAmount,
    payoutAmount,
  };
}

export function serviceKindLabel(serviceKind: ServiceKind) {
  switch (serviceKind) {
    case "shop_only":
      return "Shop only";
    case "shop_and_cook":
      return "Shop and cook";
    default:
      return "Cook only";
  }
}

function mapBookingRecord(id: string, data: Record<string, unknown>): BookingRecord {
  const subtotalAmount = Number(data.subtotalAmount || 0);
  const ingredientBudgetAmount = Number(data.ingredientBudgetAmount || 0);
  const moneySummary = buildMoneySummary(subtotalAmount, ingredientBudgetAmount);

  return {
    id,
    explorerId: String(data.explorerId || ""),
    explorerName: String(data.explorerName || ""),
    cookId: String(data.cookId || ""),
    cookName: String(data.cookName || ""),
    dishSummary: String(data.dishSummary || ""),
    serviceDateLabel: String(data.serviceDateLabel || ""),
    guestCount: String(data.guestCount || ""),
    areaLabel: String(data.areaLabel || ""),
    serviceMode: (data.serviceMode as "explorer_home" | "cook_home") || "explorer_home",
    serviceKind: (data.serviceKind as ServiceKind) || "cook_only",
    needsMarketTrip: Boolean(data.needsMarketTrip),
    wantedInMeal: String(data.wantedInMeal || ""),
    avoidInMeal: String(data.avoidInMeal || ""),
    kitchenGuidance: String(data.kitchenGuidance || ""),
    fitnessGoal: String(data.fitnessGoal || ""),
    portionGuidance: String(data.portionGuidance || ""),
    homeAccessNotes: String(data.homeAccessNotes || ""),
    ingredientBudgetAmount,
    notes: String(data.notes || ""),
    status: (data.status as BookingStatus) || "draft",
    subtotalAmount,
    explorerFeeAmount: Number(data.explorerFeeAmount ?? moneySummary.explorerFeeAmount),
    cookFeeAmount: Number(data.cookFeeAmount ?? moneySummary.cookFeeAmount),
    platformFeeAmount: Number(data.platformFeeAmount ?? moneySummary.platformFeeAmount),
    totalAmount: Number(data.totalAmount ?? moneySummary.totalAmount),
    payoutAmount: Number(data.payoutAmount ?? moneySummary.payoutAmount),
    commissionRate: Number(data.commissionRate || COMMISSION_RATE),
    currencyCode: String(data.currencyCode || "USD"),
    explorerCountryCode: String(data.explorerCountryCode || "US"),
    latestOfferAmount: Number(data.latestOfferAmount ?? subtotalAmount),
    latestOfferBy: (data.latestOfferBy as OfferSide) || "explorer",
    latestOfferNote: String(data.latestOfferNote || ""),
    negotiationOpen: Boolean(data.negotiationOpen),
    cancellationReason: String(data.cancellationReason || ""),
    fundsReleaseStatus: (data.fundsReleaseStatus as FundsReleaseStatus) || "unpaid",
    trustReleaseConfirmed: Boolean(data.trustReleaseConfirmed),
    instantMatch: Boolean(data.instantMatch),
    deliveryMode:
      data.deliveryMode === "dispatch" || data.deliveryMode === "home_service"
        ? data.deliveryMode
        : "cook_delivery",
    threadId: String(data.threadId || ""),
    requestGroupKey: String(data.requestGroupKey || ""),
    createdAt: timestampToIsoString(data.createdAt),
    updatedAt: timestampToIsoString(data.updatedAt),
  };
}

function mapThreadRecord(id: string, data: Record<string, unknown>): ChatThreadRecord {
  return {
    id,
    bookingId: String(data.bookingId || ""),
    explorerId: String(data.explorerId || ""),
    explorerName: String(data.explorerName || ""),
    cookId: String(data.cookId || ""),
    cookName: String(data.cookName || ""),
    participantIds: Array.isArray(data.participantIds)
      ? data.participantIds.map((item) => String(item))
      : [],
    bookingStatus: (data.bookingStatus as BookingStatus) || "draft",
    lastMessageText: String(data.lastMessageText || ""),
    lastMessageSenderId:
      typeof data.lastMessageSenderId === "string" ? data.lastMessageSenderId : undefined,
    lastMessageAt: timestampToIsoString(data.lastMessageAt),
    createdAt: timestampToIsoString(data.createdAt),
    updatedAt: timestampToIsoString(data.updatedAt),
    messageCount: Number(data.messageCount || 0),
    unreadCountBy: buildUnreadMap(data.unreadCountBy),
    lastReadAtBy: buildLastReadMap(data.lastReadAtBy),
    isBlocked: Boolean(data.isBlocked),
    archivedBy:
      data.archivedBy && typeof data.archivedBy === "object"
        ? Object.fromEntries(
            Object.entries(data.archivedBy as Record<string, unknown>).map(([key, value]) => [key, Boolean(value)]),
          )
        : {},
    hiddenBy:
      data.hiddenBy && typeof data.hiddenBy === "object"
        ? Object.fromEntries(
            Object.entries(data.hiddenBy as Record<string, unknown>).map(([key, value]) => [key, Boolean(value)]),
          )
        : {},
  };
}

function mapMessageRecord(id: string, data: Record<string, unknown>): ChatMessageRecord {
  return {
    id,
    threadId: String(data.threadId || ""),
    bookingId: String(data.bookingId || ""),
    senderId: String(data.senderId || ""),
    senderName: String(data.senderName || ""),
    senderRole: (data.senderRole as StoredUser["role"]) || "explorer",
    body: String(data.body || ""),
    createdAt: timestampToIsoString(data.createdAt),
  };
}

function sortThreads(records: ChatThreadRecord[]) {
  return records.sort((left, right) => (right.lastMessageAt || "").localeCompare(left.lastMessageAt || ""));
}

function buildThreadCacheKey(user: Pick<StoredUser, "id" | "email">) {
  return `${THREAD_CACHE_KEY_PREFIX}${getAccountIdentifiers(user).join("__")}`;
}

async function persistThreadCache(
  user: Pick<StoredUser, "id" | "email"> | null | undefined,
  records: ChatThreadRecord[],
) {
  if (!user) {
    return;
  }

  try {
    await AsyncStorage.setItem(buildThreadCacheKey(user), JSON.stringify(records));
  } catch {
    // Local chat cache should not block live thread updates.
  }
}

async function readThreadCache(user: Pick<StoredUser, "id" | "email"> | null | undefined) {
  if (!user) {
    return [] as ChatThreadRecord[];
  }

  try {
    const raw = await AsyncStorage.getItem(buildThreadCacheKey(user));

    if (!raw) {
      return [] as ChatThreadRecord[];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map((item, index) =>
            item && typeof item === "object"
              ? mapThreadRecord(String((item as { id?: unknown }).id || `cached-${index}`), item as Record<string, unknown>)
              : null,
          )
          .filter((item): item is ChatThreadRecord => Boolean(item))
      : [];
  } catch {
    return [] as ChatThreadRecord[];
  }
}

async function persistMessageCache(threadId: string, messages: ChatMessageRecord[]) {
  if (!threadId.trim()) {
    return;
  }

  try {
    await AsyncStorage.setItem(`${MESSAGE_CACHE_KEY_PREFIX}${threadId}`, JSON.stringify(messages));
  } catch {
    // Message cache should not block live chat usage.
  }
}

async function readMessageCache(threadId: string) {
  if (!threadId.trim()) {
    return [] as ChatMessageRecord[];
  }

  try {
    const raw = await AsyncStorage.getItem(`${MESSAGE_CACHE_KEY_PREFIX}${threadId}`);

    if (!raw) {
      return [] as ChatMessageRecord[];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map((item, index) =>
            item && typeof item === "object"
              ? mapMessageRecord(String((item as { id?: unknown }).id || `cached-message-${index}`), item as Record<string, unknown>)
              : null,
          )
          .filter((item): item is ChatMessageRecord => Boolean(item))
      : [];
  } catch {
    return [] as ChatMessageRecord[];
  }
}

function cacheThreads(
  records: ChatThreadRecord[],
  currentUser?: Pick<StoredUser, "id" | "email"> | null,
) {
  cachedThreadsForCurrentUser = records;
  void persistThreadCache(currentUser, records);
  return records;
}

export function getCachedThreadsForCurrentUser() {
  return cachedThreadsForCurrentUser;
}

function normalizeVisibleThreads(
  records: ChatThreadRecord[],
  currentUser: Pick<StoredUser, "id" | "email">,
) {
  return cacheThreads(
    sortThreads(
      records.filter((thread) => {
        const visibility = threadVisibilityState(thread, currentUser);
        return !visibility.hidden && !visibility.archived;
      }),
    ),
    currentUser,
  );
}

function buildThreadQueries(
  firestore: NonNullable<ReturnType<typeof getFirestoreInstance>>,
  identifiers: string[],
) {
  const queryIdentifiers = identifiers.slice(0, 10);

  return [
    query(
      collection(firestore, "chatThreads"),
      where("participantIds", "array-contains-any", queryIdentifiers),
      limit(50),
    ),
    query(collection(firestore, "chatThreads"), where("explorerId", "in", queryIdentifiers), limit(50)),
    query(collection(firestore, "chatThreads"), where("cookId", "in", queryIdentifiers), limit(50)),
  ];
}

function updateCachedThreadAfterMessage(params: {
  thread: ChatThreadRecord;
  senderIdentifier: string;
  body: string;
  bookingStatus?: BookingStatus;
  isBlocked?: boolean;
}) {
  const now = isoNow();
  const nextThread: ChatThreadRecord = {
    ...params.thread,
    bookingStatus: params.bookingStatus || params.thread.bookingStatus,
    lastMessageText: params.body,
    lastMessageSenderId: params.senderIdentifier,
    lastMessageAt: now,
    updatedAt: now,
    messageCount: params.thread.messageCount + 1,
    isBlocked:
      typeof params.isBlocked === "boolean" ? params.isBlocked : params.thread.isBlocked,
  };

  cacheThreads(
    sortThreads([
      nextThread,
      ...cachedThreadsForCurrentUser.filter((item) => item.id !== params.thread.id),
    ]),
    params.thread.explorerId === params.senderIdentifier || params.thread.cookId === params.senderIdentifier
      ? {
          id: params.senderIdentifier,
          email: params.senderIdentifier.includes("@") ? params.senderIdentifier : "",
        }
      : null,
  );
}

async function postThreadMessage(params: {
  threadId: string;
  bookingId: string;
  sender: StoredUser;
  body: string;
  bookingStatus?: BookingStatus;
  isBlocked?: boolean;
}) {
  const firestore = getFirestoreInstance();

  if (!firestore) {
    return;
  }

  const threadSnapshot = await withTimeout(getDoc(doc(firestore, "chatThreads", params.threadId)), {
    timeoutMessage: "Loading this conversation is taking too long. Please try again.",
  });
  if (!threadSnapshot.exists()) {
    return;
  }

  const thread = mapThreadRecord(threadSnapshot.id, threadSnapshot.data() as Record<string, unknown>);
  const senderIdentifier = pickThreadIdentifier(thread.participantIds, params.sender);
  const senderIdentifiers = getMatchingParticipantIds(thread.participantIds, params.sender);
  const recipientIdentifiers = getOtherParticipantIds(thread.participantIds, params.sender);
  const updatePayload: Record<string, unknown> = {
    lastMessageText: params.body,
    lastMessageSenderId: senderIdentifier,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    messageCount: increment(1),
  };

  senderIdentifiers.forEach((identifier) => {
    updatePayload[`unreadCountBy.${toSafeFieldKey(identifier)}`] = 0;
    updatePayload[`lastReadAtBy.${toSafeFieldKey(identifier)}`] = isoNow();
  });

  if (params.bookingStatus) {
    updatePayload.bookingStatus = params.bookingStatus;
  }

  if (typeof params.isBlocked === "boolean") {
    updatePayload.isBlocked = params.isBlocked;
  }

  recipientIdentifiers.forEach((identifier) => {
    updatePayload[`unreadCountBy.${toSafeFieldKey(identifier)}`] = increment(1);
  });

  await withTimeout(
    addDoc(collection(firestore, "chatThreads", params.threadId, "messages"), {
      threadId: params.threadId,
      bookingId: params.bookingId,
      senderId: senderIdentifier,
      senderName: params.sender.name,
      senderRole: params.sender.role,
      body: params.body,
      createdAt: serverTimestamp(),
    }),
    { timeoutMessage: "Sending your message is taking too long. Please try again." },
  );

  await withTimeout(updateDoc(doc(firestore, "chatThreads", params.threadId), updatePayload), {
    timeoutMessage: "Updating this conversation is taking too long. Please try again.",
  });

  updateCachedThreadAfterMessage({
    thread,
    senderIdentifier,
    body: params.body,
    bookingStatus: params.bookingStatus,
    isBlocked: params.isBlocked,
  });

  const recipientId = recipientIdentifiers[0];
  if (recipientId) {
    await createNotification({
      recipientId,
      actorId: senderIdentifier,
      actorName: params.sender.name,
      type: "chat_message",
      title: "New message",
      body: params.body,
      bookingId: params.bookingId,
      threadId: params.threadId,
    });
  }
}

export function getThreadUnreadCount(
  thread: ChatThreadRecord,
  currentUser: Pick<StoredUser, "id" | "email">,
) {
  const matchingIdentifiers = getMatchingParticipantIds(thread.participantIds, currentUser);

  return matchingIdentifiers.reduce((highest, identifier) => {
    const nextCount = thread.unreadCountBy[toSafeFieldKey(identifier)] ?? 0;
    return Math.max(highest, nextCount);
  }, 0);
}

function threadVisibilityState(thread: ChatThreadRecord, currentUser: Pick<StoredUser, "id" | "email">) {
  const identifiers = getMatchingParticipantIds(thread.participantIds, currentUser);
  const archived = identifiers.some((identifier) => thread.archivedBy[toSafeFieldKey(identifier)]);
  const hidden = identifiers.some((identifier) => thread.hiddenBy[toSafeFieldKey(identifier)]);
  return { archived, hidden };
}

export function getThreadPartnerReadAt(
  thread: ChatThreadRecord,
  currentUser: Pick<StoredUser, "id" | "email">,
) {
  const partnerIdentifier = getOtherParticipantIds(thread.participantIds, currentUser)[0];
  return partnerIdentifier ? thread.lastReadAtBy[toSafeFieldKey(partnerIdentifier)] ?? "" : "";
}

export async function createBookingRequest(input: {
  cook: CookDirectoryRecord;
  dishSummary: string;
  serviceDateLabel: string;
  guestCount: string;
  areaLabel: string;
  serviceMode: "explorer_home" | "cook_home";
  serviceKind?: ServiceKind;
  wantedInMeal?: string;
  avoidInMeal?: string;
  kitchenGuidance?: string;
  fitnessGoal?: string;
  portionGuidance?: string;
  homeAccessNotes?: string;
  notes: string;
  subtotalInput: string;
  ingredientBudgetInput?: string;
}) {
  const firestore = getFirestoreInstance();
  const explorer = await getCurrentUserRecord();

  if (!firestore || !explorer) {
    throw new Error("You need to be signed in before creating a booking request.");
  }

  const subtotalAmount = normalizeAmount(input.subtotalInput);
  const ingredientBudgetAmount = normalizeAmount(input.ingredientBudgetInput || 0);
  const serviceKind = input.serviceKind ?? "cook_only";

  if (!input.dishSummary.trim() || !input.serviceDateLabel.trim() || !input.guestCount.trim()) {
    throw new Error("Add the dish, date, and guest count before sending this request.");
  }

  if (!subtotalAmount) {
    throw new Error("Add an estimated cook amount before sending this request.");
  }

  const nowIso = isoNow();
  const bookingRef = doc(collection(firestore, "bookingRequests"));
  const threadRef = doc(collection(firestore, "chatThreads"));
  const explorerParticipantId = explorer.id;
  const cookParticipantId = input.cook.id;
  const moneySummary = buildMoneySummary(subtotalAmount, ingredientBudgetAmount);
  const requestGroupKey = `${explorerParticipantId}:${cookParticipantId}`;

  try {
    await withTimeout(
      setDoc(bookingRef, {
        explorerId: explorerParticipantId,
        explorerName: explorer.name,
        cookId: cookParticipantId,
        cookName: input.cook.name,
        dishSummary: input.dishSummary.trim(),
        serviceDateLabel: input.serviceDateLabel.trim(),
        guestCount: input.guestCount.trim(),
        areaLabel: input.areaLabel.trim(),
        serviceMode: input.serviceMode,
        serviceKind,
        needsMarketTrip: serviceKind !== "cook_only",
        wantedInMeal: input.wantedInMeal?.trim() || "",
        avoidInMeal: input.avoidInMeal?.trim() || "",
        kitchenGuidance: input.kitchenGuidance?.trim() || "",
        fitnessGoal: input.fitnessGoal?.trim() || "",
        portionGuidance: input.portionGuidance?.trim() || "",
        homeAccessNotes: input.homeAccessNotes?.trim() || "",
        ingredientBudgetAmount,
        notes: input.notes.trim(),
        status: "pending_payment",
        subtotalAmount,
        explorerFeeAmount: moneySummary.explorerFeeAmount,
        cookFeeAmount: moneySummary.cookFeeAmount,
        platformFeeAmount: moneySummary.platformFeeAmount,
        totalAmount: moneySummary.totalAmount,
        payoutAmount: moneySummary.payoutAmount,
        commissionRate: COMMISSION_RATE,
        currencyCode:
          explorer.countryCode === "NG"
            ? "NGN"
            : explorer.countryCode === "GB"
              ? "GBP"
              : explorer.countryCode === "CA"
                ? "CAD"
                : "USD",
        explorerCountryCode: explorer.countryCode || "US",
        latestOfferAmount: subtotalAmount,
        latestOfferBy: "explorer",
        latestOfferNote: "Initial offer created by explorer.",
        negotiationOpen: true,
        cancellationReason: "",
        fundsReleaseStatus: "unpaid",
        trustReleaseConfirmed: false,
        instantMatch: false,
        deliveryMode: input.serviceMode === "explorer_home" ? "home_service" : "cook_delivery",
        threadId: threadRef.id,
        requestGroupKey,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      { timeoutMessage: "Creating this booking request is taking too long. Please try again." },
    );

    await withTimeout(
      setDoc(threadRef, {
        bookingId: bookingRef.id,
        explorerId: explorerParticipantId,
        explorerName: explorer.name,
        cookId: cookParticipantId,
        cookName: input.cook.name,
        participantIds: [explorerParticipantId, cookParticipantId],
        bookingStatus: "pending_payment",
        lastMessageText: `New ${serviceKindLabel(serviceKind).toLowerCase()} request created.`,
        lastMessageSenderId: explorerParticipantId,
        lastMessageAt: serverTimestamp(),
        messageCount: 1,
        unreadCountBy: {
          [toSafeFieldKey(explorerParticipantId)]: 0,
          [toSafeFieldKey(cookParticipantId)]: 1,
        },
        lastReadAtBy: {
          [toSafeFieldKey(explorerParticipantId)]: nowIso,
        },
        isBlocked: false,
        archivedBy: {},
        hiddenBy: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      { timeoutMessage: "Opening the booking chat is taking too long. Please try again." },
    );

    await withTimeout(
      addDoc(collection(firestore, "chatThreads", threadRef.id, "messages"), {
        threadId: threadRef.id,
        bookingId: bookingRef.id,
        senderId: explorerParticipantId,
        senderName: explorer.name,
        senderRole: explorer.role,
        body: `Request created for ${serviceKindLabel(serviceKind)}. Offer: ${subtotalAmount}${ingredientBudgetAmount ? ` with ingredient budget ${ingredientBudgetAmount}` : ""}.`,
        createdAt: serverTimestamp(),
      }),
      { timeoutMessage: "Finishing this booking request is taking too long. Please try again." },
    );
  } catch (error) {
    throw new Error(
      getAsyncErrorMessage(error, "We could not create this booking request right now."),
    );
  }

  await createNotification({
    recipientId: cookParticipantId,
    actorId: explorerParticipantId,
    actorName: explorer.name,
    type: "booking_request",
    title: "New booking request",
    body: `${explorer.name} sent a ${serviceKindLabel(serviceKind).toLowerCase()} request.`,
    bookingId: bookingRef.id,
    threadId: threadRef.id,
  });

  cacheThreads(
    sortThreads([
      {
        id: threadRef.id,
        bookingId: bookingRef.id,
        explorerId: explorerParticipantId,
        explorerName: explorer.name,
        cookId: cookParticipantId,
        cookName: input.cook.name,
        participantIds: [explorerParticipantId, cookParticipantId],
        bookingStatus: "pending_payment",
        lastMessageText: `New ${serviceKindLabel(serviceKind).toLowerCase()} request created.`,
        lastMessageSenderId: explorerParticipantId,
        lastMessageAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        messageCount: 1,
        unreadCountBy: {
          [toSafeFieldKey(explorerParticipantId)]: 0,
          [toSafeFieldKey(cookParticipantId)]: 1,
        },
        lastReadAtBy: {
          [toSafeFieldKey(explorerParticipantId)]: nowIso,
        },
        isBlocked: false,
        archivedBy: {},
        hiddenBy: {},
      },
      ...cachedThreadsForCurrentUser.filter((thread) => thread.id !== threadRef.id),
    ]),
  );

  return { bookingId: bookingRef.id, threadId: threadRef.id };
}

export async function createInstantMealBookingRequest(input: {
  cook: CookDirectoryRecord;
  meal: MealItem;
  deliveryMode?: BookingRecord["deliveryMode"];
}) {
  const explorer = await getCurrentUserRecord();
  if (!explorer) {
    throw new Error("You need to be signed in before creating an instant match.");
  }

  const priceMatch = input.meal.priceHint.match(/\d+/g);
  const subtotal = priceMatch?.[1] || priceMatch?.[0] || "35";
  const serviceDate = new Date(Date.now() + 15 * 60000);
  const serviceDateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(serviceDate);

  const result = await createBookingRequest({
    cook: input.cook,
    dishSummary: input.meal.title,
    serviceDateLabel,
    guestCount: "1",
    areaLabel: input.cook.serviceAreaLabel || explorer.city || input.cook.location,
    serviceMode: input.deliveryMode === "home_service" ? "explorer_home" : "cook_home",
    serviceKind: "cook_only",
    wantedInMeal: input.meal.ingredients.join(", "),
    avoidInMeal: explorer.dislikedIngredients || "",
    kitchenGuidance: "Instant meal match. Payment confirms this booking automatically.",
    fitnessGoal: explorer.gymGoal || "",
    portionGuidance: explorer.portionPreference || "",
    homeAccessNotes: explorer.addressLine1 || "",
    notes: `Instant match for ${input.meal.category}.`,
    subtotalInput: subtotal,
  });

  const firestore = getFirestoreInstance();
  if (firestore) {
    await updateDoc(doc(firestore, "bookingRequests", result.bookingId), {
      instantMatch: true,
      deliveryMode: input.deliveryMode || "cook_delivery",
      latestOfferNote: "Instant match. Payment confirms this booking automatically.",
      updatedAt: serverTimestamp(),
    });
  }

  return result;
}

async function getBookingsForIdentifiers(field: "explorerId" | "cookId", identifiers: string[]) {
  const firestore = getFirestoreInstance();
  if (!firestore || !identifiers.length) {
    return [] as BookingRecord[];
  }

  try {
    const snapshot = await withTimeout(
      getDocs(
        query(collection(firestore, "bookingRequests"), where(field, "in", identifiers), limit(50)),
      ),
      { timeoutMessage: "Loading bookings is taking too long. Please try again." },
    );

    return snapshot.docs.map((item) => mapBookingRecord(item.id, item.data() as Record<string, unknown>));
  } catch {
    return [] as BookingRecord[];
  }
}

export async function fetchBookingsForCurrentUser() {
  const { currentUser, identifiers } = await getCurrentUserIdentifiers();
  if (!currentUser || !identifiers.length) {
    return [] as BookingRecord[];
  }

  return getBookingsForIdentifiers(currentUser.role === "cook" ? "cookId" : "explorerId", identifiers);
}

export function subscribeToBookingsForCurrentUser(
  callback: (bookings: BookingRecord[]) => void,
  onError?: (error: Error) => void,
) {
  const firestore = getFirestoreInstance();
  if (!firestore) {
    callback([]);
    return () => undefined;
  }

  let unsubscribe: () => void = () => undefined;

  void getCurrentUserIdentifiers().then(({ currentUser, identifiers }) => {
    if (!currentUser || !identifiers.length) {
      callback([]);
      return;
    }

    unsubscribe = onSnapshot(
      query(
        collection(firestore, "bookingRequests"),
        where(currentUser.role === "cook" ? "cookId" : "explorerId", "in", identifiers),
        limit(50),
      ),
      (snapshot) => {
        callback(snapshot.docs.map((item) => mapBookingRecord(item.id, item.data() as Record<string, unknown>)));
      },
      (error) => onError?.(error),
    );
  });

  return () => unsubscribe();
}

export async function fetchThreadsForCurrentUser() {
  const firestore = getFirestoreInstance();
  const { currentUser, identifiers } = await getCurrentUserIdentifiers();
  if (!firestore || !currentUser || !identifiers.length) {
    return [] as ChatThreadRecord[];
  }

  try {
    const snapshots = await withTimeout(
      Promise.all(buildThreadQueries(firestore, identifiers).map((threadQuery) => getDocs(threadQuery))),
      { timeoutMessage: "Loading chats is taking too long. Please try again." },
    );

    const mergedThreads = new Map<string, ChatThreadRecord>();
    snapshots.forEach((snapshot) => {
      snapshot.docs.forEach((item) => {
        mergedThreads.set(item.id, mapThreadRecord(item.id, item.data() as Record<string, unknown>));
      });
    });

    return normalizeVisibleThreads([...mergedThreads.values()], currentUser);
  } catch {
    const cached = await readThreadCache(currentUser);
    return cached.length ? normalizeVisibleThreads(cached, currentUser) : ([] as ChatThreadRecord[]);
  }
}

export function subscribeToThreadsForCurrentUser(
  callback: (threads: ChatThreadRecord[]) => void,
  onError?: (error: Error) => void,
) {
  const firestore = getFirestoreInstance();
  const cachedThreads = getCachedThreadsForCurrentUser();
  if (cachedThreads.length) {
    callback(cachedThreads);
  }

  if (!firestore) {
    callback([]);
    return () => undefined;
  }

  let unsubscribe: () => void = () => undefined;

  void getCurrentUserIdentifiers().then(({ currentUser, identifiers }) => {
    if (!currentUser || !identifiers.length) {
      callback([]);
      return;
    }

    void readThreadCache(currentUser).then((cached) => {
      if (cached.length && !cachedThreadsForCurrentUser.length) {
        callback(normalizeVisibleThreads(cached, currentUser));
      }
    });

    const snapshotsBySource = new Map<number, ChatThreadRecord[]>();
    const unsubscribers = buildThreadQueries(firestore, identifiers).map((threadQuery, index) =>
      onSnapshot(
        threadQuery,
        (snapshot) => {
          snapshotsBySource.set(
            index,
            snapshot.docs.map((item) => mapThreadRecord(item.id, item.data() as Record<string, unknown>)),
          );

          const mergedThreads = new Map<string, ChatThreadRecord>();
          snapshotsBySource.forEach((records) => {
            records.forEach((thread) => {
              mergedThreads.set(thread.id, thread);
            });
          });

          callback(normalizeVisibleThreads([...mergedThreads.values()], currentUser));
        },
        (error) => onError?.(error),
      ),
    );

    unsubscribe = () => {
      unsubscribers.forEach((stop) => stop());
    };
  });

  return () => unsubscribe();
}

export async function fetchMessagesForThread(threadId: string) {
  const firestore = getFirestoreInstance();
  if (!firestore || !threadId.trim()) {
    return [] as ChatMessageRecord[];
  }

  try {
    const snapshot = await getDocs(
      query(collection(firestore, "chatThreads", threadId, "messages"), orderBy("createdAt", "asc"), limit(200)),
    );
    const messages = snapshot.docs.map((item) => mapMessageRecord(item.id, item.data() as Record<string, unknown>));
    await persistMessageCache(threadId, messages);
    return messages;
  } catch {
    return readMessageCache(threadId);
  }
}

export function subscribeToMessagesForThread(
  threadId: string,
  callback: (messages: ChatMessageRecord[]) => void,
  onError?: (error: Error) => void,
) {
  const firestore = getFirestoreInstance();
  if (!firestore || !threadId.trim()) {
    callback([]);
    return () => undefined;
  }

  void readMessageCache(threadId).then((cached) => {
    if (cached.length) {
      callback(cached);
    }
  });

  return onSnapshot(
    query(collection(firestore, "chatThreads", threadId, "messages"), orderBy("createdAt", "asc"), limit(200)),
    (snapshot) => {
      const messages = snapshot.docs.map((item) => mapMessageRecord(item.id, item.data() as Record<string, unknown>));
      void persistMessageCache(threadId, messages);
      callback(messages);
    },
    (error) => onError?.(error),
  );
}

function buildThreadReadUpdate(thread: ChatThreadRecord, currentUser: Pick<StoredUser, "id" | "email">) {
  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  const shareReadReceipts = (currentUser as Pick<StoredUser, "shareReadReceipts">).shareReadReceipts !== false;

  getMatchingParticipantIds(thread.participantIds, currentUser).forEach((identifier) => {
    updatePayload[`unreadCountBy.${toSafeFieldKey(identifier)}`] = 0;
    if (shareReadReceipts) {
      updatePayload[`lastReadAtBy.${toSafeFieldKey(identifier)}`] = isoNow();
    }
  });

  return updatePayload;
}

export async function markThreadAsRead(threadId: string) {
  const firestore = getFirestoreInstance();
  const currentUser = await getCurrentUserRecord();
  if (!firestore || !currentUser || !threadId.trim()) {
    return;
  }

  const snapshot = await withTimeout(getDoc(doc(firestore, "chatThreads", threadId)), {
    timeoutMessage: "Loading this chat is taking too long. Please try again.",
  });
  if (!snapshot.exists()) {
    return;
  }

  const thread = mapThreadRecord(snapshot.id, snapshot.data() as Record<string, unknown>);
  if (getThreadUnreadCount(thread, currentUser) === 0) {
    return;
  }

  await withTimeout(
    updateDoc(doc(firestore, "chatThreads", threadId), buildThreadReadUpdate(thread, currentUser)),
    { timeoutMessage: "Marking messages as read is taking too long. Please try again." },
  );
}

export async function sendMessageToThread(threadId: string, body: string) {
  const firestore = getFirestoreInstance();
  const currentUser = await getCurrentUserRecord();
  if (!firestore || !currentUser) {
    throw new Error("You need to be signed in to send a message.");
  }

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("Type a message before sending.");
  }

  const threadSnapshot = await withTimeout(getDoc(doc(firestore, "chatThreads", threadId)), {
    timeoutMessage: "Loading this chat is taking too long. Please try again.",
  });
  if (!threadSnapshot.exists()) {
    throw new Error("That chat thread could not be found.");
  }

  const thread = mapThreadRecord(threadSnapshot.id, threadSnapshot.data() as Record<string, unknown>);
  if (thread.isBlocked || bookingIsBlocked(thread.bookingStatus)) {
    throw new Error("This chat is closed because the request is no longer active.");
  }

  await postThreadMessage({
    threadId,
    bookingId: thread.bookingId,
    sender: currentUser,
    body: trimmedBody,
  });
}

export async function fetchThreadById(threadId: string) {
  const firestore = getFirestoreInstance();
  if (!firestore || !threadId.trim()) {
    return null;
  }

  const snapshot = await withTimeout(getDoc(doc(firestore, "chatThreads", threadId)), {
    timeoutMessage: "Loading this conversation is taking too long. Please try again.",
  });
  return snapshot.exists() ? mapThreadRecord(snapshot.id, snapshot.data() as Record<string, unknown>) : null;
}

export function subscribeToThreadById(
  threadId: string,
  callback: (thread: ChatThreadRecord | null) => void,
  onError?: (error: Error) => void,
) {
  const firestore = getFirestoreInstance();
  if (!firestore || !threadId.trim()) {
    callback(null);
    return () => undefined;
  }

  return onSnapshot(
    doc(firestore, "chatThreads", threadId),
    (snapshot) => callback(snapshot.exists() ? mapThreadRecord(snapshot.id, snapshot.data() as Record<string, unknown>) : null),
    (error) => onError?.(error),
  );
}

export async function fetchCookForBookingRequest(cookId: string) {
  return getCookById(cookId);
}

export async function fetchThreadPartner(thread: ChatThreadRecord, currentUserId: string) {
  const partnerId = thread.explorerId === currentUserId ? thread.cookId : thread.explorerId;
  return getUserById(partnerId);
}

async function getBookingOrThrow(bookingId: string) {
  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error("Firestore is not available.");
  }

  const snapshot = await withTimeout(getDoc(doc(firestore, "bookingRequests", bookingId)), {
    timeoutMessage: "Loading this booking is taking too long. Please try again.",
  });
  if (!snapshot.exists()) {
    throw new Error("Booking request could not be found.");
  }

  return { firestore, booking: mapBookingRecord(snapshot.id, snapshot.data() as Record<string, unknown>) };
}

export async function confirmBookingPaymentDummy(bookingId: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser) {
    throw new Error("You need to be signed in before completing payment.");
  }

  const { firestore, booking } = await getBookingOrThrow(bookingId);
  if (!matchesAccountIdentifier(booking.explorerId, currentUser)) {
    throw new Error("Only the explorer who created this request can complete payment.");
  }

  await setDoc(
    doc(firestore, "payments", bookingId),
    {
      bookingId: booking.id,
      explorerId: booking.explorerId,
      cookId: booking.cookId,
      amount: booking.totalAmount,
      subtotalAmount: booking.subtotalAmount,
      ingredientBudgetAmount: booking.ingredientBudgetAmount,
      explorerFeeAmount: booking.explorerFeeAmount,
      cookFeeAmount: booking.cookFeeAmount,
      platformFeeAmount: booking.platformFeeAmount,
      payoutAmount: booking.payoutAmount,
      currencyCode: booking.currencyCode,
      status: "held_dummy",
      provider: "dummy",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const nextStatus: BookingStatus = booking.instantMatch ? "accepted" : "pending_cook";

  await updateDoc(doc(firestore, "bookingRequests", bookingId), {
    status: nextStatus,
    fundsReleaseStatus: "held",
    updatedAt: serverTimestamp(),
  });

  await postThreadMessage({
    threadId: booking.threadId,
    bookingId: booking.id,
    sender: currentUser,
    body: booking.instantMatch
      ? "Test Paystack payment completed. This instant match is confirmed and ready for service."
      : "Dummy payment completed. Funds are now held in-app until trust/release is confirmed.",
    bookingStatus: nextStatus,
  });

  await createNotification({
    recipientId: booking.cookId,
    actorId: currentUser.id,
    actorName: currentUser.name,
    type: "booking_update",
    title: booking.instantMatch ? "Instant booking confirmed" : "Funds held",
    body: booking.instantMatch
      ? "The explorer paid for an instant match. You can cancel, message, or use service directions."
      : "The explorer completed the hold step and your request is ready for review.",
    bookingId: booking.id,
    threadId: booking.threadId,
  });

  return booking;
}

async function getExplorerOwnedBooking(bookingId: string, currentUser: StoredUser) {
  const { firestore, booking } = await getBookingOrThrow(bookingId);
  if (!matchesAccountIdentifier(booking.explorerId, currentUser)) {
    throw new Error("Only the explorer who created this booking can change it.");
  }

  return { firestore, booking };
}

async function getCookOwnedBooking(bookingId: string, currentUser: StoredUser) {
  const { firestore, booking } = await getBookingOrThrow(bookingId);
  if (!matchesAccountIdentifier(booking.cookId, currentUser)) {
    throw new Error("Only the cook on this booking can change it.");
  }

  return { firestore, booking };
}

export async function cancelBookingAsExplorer(bookingId: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser) {
    throw new Error("You need to be signed in before changing this booking.");
  }

  const { firestore, booking } = await getExplorerOwnedBooking(bookingId, currentUser);
  await updateDoc(doc(firestore, "bookingRequests", bookingId), {
    status: "cancelled",
    cancellationReason: "Cancelled by explorer",
    updatedAt: serverTimestamp(),
  });

  await postThreadMessage({
    threadId: booking.threadId,
    bookingId: booking.id,
    sender: currentUser,
    body: "This booking was cancelled by the explorer.",
    bookingStatus: "cancelled",
    isBlocked: true,
  });

  await createNotification({
    recipientId: booking.cookId,
    actorId: currentUser.id,
    actorName: currentUser.name,
    type: "booking_update",
    title: "Booking cancelled",
    body: "The explorer cancelled this booking.",
    bookingId: booking.id,
    threadId: booking.threadId,
  });
}

export async function deleteArchivedBookingForCurrentUser(bookingId: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser) {
    throw new Error("You need to be signed in before deleting this booking.");
  }

  const { firestore, booking } = await getBookingOrThrow(bookingId);
  const canDelete =
    (matchesAccountIdentifier(booking.explorerId, currentUser) ||
      matchesAccountIdentifier(booking.cookId, currentUser)) &&
    (booking.status === "cancelled" || booking.status === "declined");

  if (!canDelete) {
    throw new Error("Only archived cancelled or declined bookings can be deleted.");
  }

  await deleteDoc(doc(firestore, "bookingRequests", bookingId));
}

export async function rescheduleBookingAsExplorer(bookingId: string, nextServiceDateLabel: string, note: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser) {
    throw new Error("You need to be signed in before changing this booking.");
  }

  const trimmedDate = nextServiceDateLabel.trim();
  if (!trimmedDate) {
    throw new Error("Add the new date or time before requesting a reschedule.");
  }

  const { firestore, booking } = await getExplorerOwnedBooking(bookingId, currentUser);
  await updateDoc(doc(firestore, "bookingRequests", bookingId), {
    serviceDateLabel: trimmedDate,
    notes: [booking.notes, note.trim()].filter(Boolean).join("\n\n"),
    status: "pending_cook",
    updatedAt: serverTimestamp(),
  });

  await postThreadMessage({
    threadId: booking.threadId,
    bookingId: booking.id,
    sender: currentUser,
    body: note.trim()
      ? `The explorer requested a new service time: ${trimmedDate}. Note: ${note.trim()}`
      : `The explorer requested a new service time: ${trimmedDate}.`,
    bookingStatus: "pending_cook",
  });

  await createNotification({
    recipientId: booking.cookId,
    actorId: currentUser.id,
    actorName: currentUser.name,
    type: "booking_update",
    title: "Reschedule request",
    body: `${currentUser.name} requested a new service time for this booking.`,
    bookingId: booking.id,
    threadId: booking.threadId,
  });
}

export async function counterBookingOfferAsExplorer(bookingId: string, amount: string, note: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser) {
    throw new Error("You need to be signed in before changing this booking.");
  }

  const nextAmount = normalizeAmount(amount);
  if (!nextAmount) {
    throw new Error("Add a valid offer amount.");
  }

  const { firestore, booking } = await getExplorerOwnedBooking(bookingId, currentUser);
  const moneySummary = buildMoneySummary(nextAmount, booking.ingredientBudgetAmount);
  const trimmedNote = note.trim();
  const nextStatus = booking.fundsReleaseStatus === "held" ? "pending_cook" : "pending_payment";

  await updateDoc(doc(firestore, "bookingRequests", bookingId), {
    subtotalAmount: nextAmount,
    explorerFeeAmount: moneySummary.explorerFeeAmount,
    cookFeeAmount: moneySummary.cookFeeAmount,
    platformFeeAmount: moneySummary.platformFeeAmount,
    totalAmount: moneySummary.totalAmount,
    payoutAmount: moneySummary.payoutAmount,
    latestOfferAmount: nextAmount,
    latestOfferBy: "explorer",
    latestOfferNote: trimmedNote,
    negotiationOpen: true,
    status: nextStatus,
    updatedAt: serverTimestamp(),
  });

  await postThreadMessage({
    threadId: booking.threadId,
    bookingId: booking.id,
    sender: currentUser,
    body: trimmedNote
      ? `Explorer proposed a new amount: ${nextAmount}. Note: ${trimmedNote}`
      : `Explorer proposed a new amount: ${nextAmount}.`,
    bookingStatus: nextStatus,
  });
}

export async function releaseBookingFundsAsExplorer(bookingId: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser) {
    throw new Error("You need to be signed in before releasing funds.");
  }

  const { firestore, booking } = await getExplorerOwnedBooking(bookingId, currentUser);

  await updateDoc(doc(firestore, "bookingRequests", bookingId), {
    status: "funds_released",
    fundsReleaseStatus: "released",
    trustReleaseConfirmed: true,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(firestore, "payments", bookingId), {
    status: "released_dummy",
    updatedAt: serverTimestamp(),
  });

  await postThreadMessage({
    threadId: booking.threadId,
    bookingId: booking.id,
    sender: currentUser,
    body: `Explorer marked trust/release. Dummy payout of ${booking.payoutAmount} is now released to the cook.`,
    bookingStatus: "funds_released",
    isBlocked: true,
  });

  await createNotification({
    recipientId: booking.cookId,
    actorId: currentUser.id,
    actorName: currentUser.name,
    type: "booking_update",
    title: "Funds released",
    body: "The explorer confirmed trust/release for this service.",
    bookingId: booking.id,
    threadId: booking.threadId,
  });
}

export async function completeBookingAsCook(bookingId: string, note: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser) {
    throw new Error("You need to be signed in before updating this booking.");
  }

  const { firestore, booking } = await getCookOwnedBooking(bookingId, currentUser);
  await updateDoc(doc(firestore, "bookingRequests", bookingId), {
    status: "completed",
    updatedAt: serverTimestamp(),
  });

  await postThreadMessage({
    threadId: booking.threadId,
    bookingId: booking.id,
    sender: currentUser,
    body: note.trim()
      ? `Cook marked the service as done. Note: ${note.trim()}`
      : "Cook marked the service as done and is waiting for trust/release.",
    bookingStatus: "completed",
    isBlocked: true,
  });

  await createNotification({
    recipientId: booking.explorerId,
    actorId: currentUser.id,
    actorName: currentUser.name,
    type: "booking_update",
    title: "Booking marked complete",
    body: `${currentUser.name} marked this booking as completed.`,
    bookingId: booking.id,
    threadId: booking.threadId,
  });
}

export async function acceptBookingAsCook(bookingId: string, note: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser) {
    throw new Error("You need to be signed in before changing this request.");
  }

  const { firestore, booking } = await getCookOwnedBooking(bookingId, currentUser);
  await updateDoc(doc(firestore, "bookingRequests", bookingId), {
    status: "accepted",
    negotiationOpen: false,
    updatedAt: serverTimestamp(),
  });

  await postThreadMessage({
    threadId: booking.threadId,
    bookingId: booking.id,
    sender: currentUser,
    body: note.trim()
      ? `Cook accepted this request. Note: ${note.trim()}`
      : "Cook accepted this request.",
    bookingStatus: "accepted",
  });

  await createNotification({
    recipientId: booking.explorerId,
    actorId: currentUser.id,
    actorName: currentUser.name,
    type: "booking_update",
    title: "Request accepted",
    body: `${currentUser.name} accepted your booking request.`,
    bookingId: booking.id,
    threadId: booking.threadId,
  });
}

export async function declineBookingAsCook(bookingId: string, reason: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser) {
    throw new Error("You need to be signed in before changing this request.");
  }

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new Error("Add a reason before declining this request.");
  }

  const { firestore, booking } = await getCookOwnedBooking(bookingId, currentUser);
  await updateDoc(doc(firestore, "bookingRequests", bookingId), {
    status: "declined",
    cancellationReason: trimmedReason,
    negotiationOpen: false,
    updatedAt: serverTimestamp(),
  });

  await postThreadMessage({
    threadId: booking.threadId,
    bookingId: booking.id,
    sender: currentUser,
    body: `Cook declined this request. Reason: ${trimmedReason}`,
    bookingStatus: "declined",
    isBlocked: true,
  });

  await createNotification({
    recipientId: booking.explorerId,
    actorId: currentUser.id,
    actorName: currentUser.name,
    type: "booking_update",
    title: "Request declined",
    body: `${currentUser.name} declined your booking request.`,
    bookingId: booking.id,
    threadId: booking.threadId,
  });
}

export async function counterBookingOfferAsCook(bookingId: string, amount: string, note: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser) {
    throw new Error("You need to be signed in before changing this request.");
  }

  const nextAmount = normalizeAmount(amount);
  if (!nextAmount) {
    throw new Error("Add a valid counter amount.");
  }

  const { firestore, booking } = await getCookOwnedBooking(bookingId, currentUser);
  const moneySummary = buildMoneySummary(nextAmount, booking.ingredientBudgetAmount);
  const trimmedNote = note.trim();

  await updateDoc(doc(firestore, "bookingRequests", bookingId), {
    subtotalAmount: nextAmount,
    explorerFeeAmount: moneySummary.explorerFeeAmount,
    cookFeeAmount: moneySummary.cookFeeAmount,
    platformFeeAmount: moneySummary.platformFeeAmount,
    totalAmount: moneySummary.totalAmount,
    payoutAmount: moneySummary.payoutAmount,
    latestOfferAmount: nextAmount,
    latestOfferBy: "cook",
    latestOfferNote: trimmedNote,
    negotiationOpen: true,
    status: "awaiting_explorer",
    updatedAt: serverTimestamp(),
  });

  await postThreadMessage({
    threadId: booking.threadId,
    bookingId: booking.id,
    sender: currentUser,
    body: trimmedNote
      ? `Cook proposed a new amount: ${nextAmount}. Note: ${trimmedNote}`
      : `Cook proposed a new amount: ${nextAmount}.`,
    bookingStatus: "awaiting_explorer",
  });

  await createNotification({
    recipientId: booking.explorerId,
    actorId: currentUser.id,
    actorName: currentUser.name,
    type: "booking_update",
    title: "Counter offer",
    body: `${currentUser.name} sent a new price for this request.`,
    bookingId: booking.id,
    threadId: booking.threadId,
  });
}

export async function acceptCounterOfferAsExplorer(bookingId: string) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser) {
    throw new Error("You need to be signed in before accepting this offer.");
  }

  const { firestore, booking } = await getExplorerOwnedBooking(bookingId, currentUser);
  const nextStatus = booking.fundsReleaseStatus === "held" ? "pending_cook" : "pending_payment";
  await updateDoc(doc(firestore, "bookingRequests", bookingId), {
    negotiationOpen: false,
    status: nextStatus,
    updatedAt: serverTimestamp(),
  });

  await postThreadMessage({
    threadId: booking.threadId,
    bookingId: booking.id,
    sender: currentUser,
    body: `Explorer accepted the updated offer of ${booking.latestOfferAmount}.`,
    bookingStatus: nextStatus,
  });

  await createNotification({
    recipientId: booking.cookId,
    actorId: currentUser.id,
    actorName: currentUser.name,
    type: "booking_update",
    title: "Counter offer accepted",
    body: `${currentUser.name} accepted the updated price for this booking.`,
    bookingId: booking.id,
    threadId: booking.threadId,
  });
}

export async function archiveThreadForCurrentUser(threadId: string) {
  const firestore = getFirestoreInstance();
  const currentUser = await getCurrentUserRecord();
  if (!firestore || !currentUser || !threadId.trim()) {
    throw new Error("You need to be signed in before archiving a thread.");
  }

  const threadSnapshot = await getDoc(doc(firestore, "chatThreads", threadId));
  if (!threadSnapshot.exists()) {
    throw new Error("That chat thread could not be found.");
  }

  const thread = mapThreadRecord(threadSnapshot.id, threadSnapshot.data() as Record<string, unknown>);
  const identifiers = getMatchingParticipantIds(thread.participantIds, currentUser);
  const updatePayload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  identifiers.forEach((identifier) => {
    updatePayload[`archivedBy.${toSafeFieldKey(identifier)}`] = true;
  });
  await updateDoc(doc(firestore, "chatThreads", threadId), updatePayload);
}

export async function deleteThreadForCurrentUser(threadId: string) {
  const firestore = getFirestoreInstance();
  const currentUser = await getCurrentUserRecord();
  if (!firestore || !currentUser || !threadId.trim()) {
    throw new Error("You need to be signed in before hiding a thread.");
  }

  const threadSnapshot = await getDoc(doc(firestore, "chatThreads", threadId));
  if (!threadSnapshot.exists()) {
    throw new Error("That chat thread could not be found.");
  }

  const thread = mapThreadRecord(threadSnapshot.id, threadSnapshot.data() as Record<string, unknown>);
  const identifiers = getMatchingParticipantIds(thread.participantIds, currentUser);
  const updatePayload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  identifiers.forEach((identifier) => {
    updatePayload[`hiddenBy.${toSafeFieldKey(identifier)}`] = true;
  });
  await updateDoc(doc(firestore, "chatThreads", threadId), updatePayload);
}
