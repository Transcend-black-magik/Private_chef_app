import AsyncStorage from "@react-native-async-storage/async-storage";

const HIDDEN_ARCHIVED_BOOKINGS_KEY = "cook-for-me:hidden-archived-bookings";

export async function getHiddenArchivedBookingIds() {
  try {
    const value = await AsyncStorage.getItem(HIDDEN_ARCHIVED_BOOKINGS_KEY);
    const parsed = value ? JSON.parse(value) : [];

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export async function hideArchivedBookingIds(ids: string[]) {
  const nextIds = ids.filter((id) => id.trim().length > 0);

  if (!nextIds.length) {
    return getHiddenArchivedBookingIds();
  }

  const currentIds = await getHiddenArchivedBookingIds();
  const mergedIds = Array.from(new Set([...currentIds, ...nextIds]));
  await AsyncStorage.setItem(HIDDEN_ARCHIVED_BOOKINGS_KEY, JSON.stringify(mergedIds));

  return mergedIds;
}
