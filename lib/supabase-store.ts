import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase, supabaseConfigured } from "@/lib/supabase";

type WhereOperator = "==" | "in" | "array-contains-any";
type QueryFilter = { field: string; operator: WhereOperator; value: unknown };

type CollectionRef = {
  kind: "collection";
  table: string;
  parentId?: string;
};

type DocRef = {
  kind: "doc";
  table: string;
  id: string;
  parentId?: string;
};

type QueryRef = CollectionRef & {
  filters: QueryFilter[];
  order?: { field: string; direction: "asc" | "desc" };
  maxRows?: number;
};

export function getSupabaseStore() {
  return supabaseConfigured ? supabase : null;
}

export function collection(_store: unknown, table: string, parentId?: string, childTable?: string): CollectionRef {
  if (table === "chatThreads" && childTable === "messages" && parentId) {
    return { kind: "collection", table: "chatMessages", parentId };
  }

  return { kind: "collection", table };
}

export function doc(storeOrCollection: unknown, tableOrId?: string, maybeId?: string): DocRef {
  if (typeof maybeId === "string") {
    return { kind: "doc", table: tableOrId || "", id: maybeId };
  }

  const collectionRef = storeOrCollection as CollectionRef;
  return {
    kind: "doc",
    table: collectionRef.table,
    id: tableOrId || createId(),
    parentId: collectionRef.parentId,
  };
}

export function query(ref: CollectionRef, ...constraints: Array<(queryRef: QueryRef) => QueryRef>): QueryRef {
  return constraints.reduce<QueryRef>(
    (current, constraint) => constraint(current),
    { ...ref, filters: [] },
  );
}

export function where(field: string, operator: WhereOperator, value: unknown) {
  return (queryRef: QueryRef): QueryRef => ({
    ...queryRef,
    filters: [...queryRef.filters, { field, operator, value }],
  });
}

export function limit(maxRows: number) {
  return (queryRef: QueryRef): QueryRef => ({ ...queryRef, maxRows });
}

export function orderBy(field: string, direction: "asc" | "desc" = "asc") {
  return (queryRef: QueryRef): QueryRef => ({ ...queryRef, order: { field, direction } });
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export function increment(amount: number) {
  return { __increment: amount };
}

export async function addDoc(ref: CollectionRef, data: Record<string, unknown>) {
  const id = createId();
  const payload = normalizeWritePayload({ ...data, id }, ref);
  await supabase.from(ref.table).insert(payload).throwOnError();
  return doc(ref, id);
}

export async function setDoc(ref: DocRef, data: Record<string, unknown>, options?: { merge?: boolean }) {
  const payload = normalizeWritePayload({ ...data, id: ref.id }, ref);

  if (options?.merge) {
    await supabase.from(ref.table).upsert(payload, { onConflict: "id" }).throwOnError();
    return;
  }

  await supabase.from(ref.table).upsert(payload, { onConflict: "id" }).throwOnError();
}

export async function updateDoc(ref: DocRef, data: Record<string, unknown>) {
  const existing = await getDoc(ref);
  const current = existing.exists() ? existing.data() : {};
  const payload = normalizeWritePayload(applyUpdatePayload(current, data), ref);
  await supabase.from(ref.table).upsert({ ...payload, id: ref.id }, { onConflict: "id" }).throwOnError();
}

export async function deleteDoc(ref: DocRef) {
  await supabase.from(ref.table).delete().eq("id", ref.id).throwOnError();
}

export async function getDoc(ref: DocRef) {
  const { data, error } = await supabase.from(ref.table).select("*").eq("id", ref.id).maybeSingle();

  if (error) {
    throw error;
  }

  return {
    id: ref.id,
    exists: () => Boolean(data),
    data: () => denormalizeRecord((data || {}) as Record<string, unknown>),
  };
}

export async function getDocs(ref: CollectionRef | QueryRef) {
  const queryRef = "filters" in ref ? ref : { ...ref, filters: [] };
  const { data, error } = await buildSelectQuery(queryRef).throwOnError();

  if (error) {
    throw error;
  }

  return {
    docs: (data || []).map((item: Record<string, unknown>) => ({
      id: String(item.id || ""),
      data: () => denormalizeRecord(item),
    })),
  };
}

export function onSnapshot(
  ref: DocRef | CollectionRef | QueryRef,
  callback: (snapshot: any) => void,
  onError?: (error: Error) => void,
) {
  let channel: RealtimeChannel | null = null;
  let closed = false;

  const emit = () => {
    if (closed) {
      return;
    }

    const load = ref.kind === "doc" ? getDoc(ref) : getDocs(ref);
    void load.then(callback).catch((error) => onError?.(error));
  };

  emit();

  if (supabaseConfigured) {
    const table = ref.table;
    const filter = ref.kind === "doc" ? `id=eq.${ref.id}` : undefined;
    channel = supabase
      .channel(`${table}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        emit,
      )
      .subscribe();
  }

  return () => {
    closed = true;
    if (channel) {
      void supabase.removeChannel(channel);
    }
  };
}

function buildSelectQuery(ref: QueryRef) {
  let builder = supabase.from(ref.table).select("*");

  if (ref.parentId) {
    builder = builder.eq("threadId", ref.parentId);
  }

  for (const filter of ref.filters) {
    if (filter.operator === "==") {
      builder = builder.eq(filter.field, filter.value);
    } else if (filter.operator === "in") {
      builder = builder.in(filter.field, filter.value as string[]);
    } else if (filter.operator === "array-contains-any") {
      builder = builder.overlaps(filter.field, filter.value as string[]);
    }
  }

  if (ref.order) {
    builder = builder.order(ref.order.field, { ascending: ref.order.direction === "asc" });
  }

  if (ref.maxRows) {
    builder = builder.limit(ref.maxRows);
  }

  return builder;
}

function normalizeWritePayload(data: Record<string, unknown>, ref: CollectionRef | DocRef) {
  const payload = stripUndefinedFields(expandDottedKeys(data));

  if ("parentId" in ref && ref.parentId && ref.table === "chatMessages") {
    payload.threadId = ref.parentId;
  }

  return payload;
}

function applyUpdatePayload(current: Record<string, unknown>, data: Record<string, unknown>) {
  const next = { ...current };

  for (const [key, value] of Object.entries(data)) {
    if (isIncrement(value)) {
      next[key] = Number(next[key] || 0) + value.__increment;
      continue;
    }

    setDottedValue(next, key, value);
  }

  return next;
}

function expandDottedKeys(data: Record<string, unknown>) {
  const next: Record<string, unknown> = {};

  Object.entries(data).forEach(([key, value]) => {
    setDottedValue(next, key, value);
  });

  return next;
}

function setDottedValue(target: Record<string, unknown>, key: string, value: unknown) {
  const parts = key.split(".");
  let cursor = target;

  parts.slice(0, -1).forEach((part) => {
    const existing = cursor[part];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  });

  cursor[parts[parts.length - 1]] = value;
}

function isIncrement(value: unknown): value is { __increment: number } {
  return Boolean(value && typeof value === "object" && "__increment" in value);
}

function denormalizeRecord(data: Record<string, unknown>) {
  return data;
}

function stripUndefinedFields(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
