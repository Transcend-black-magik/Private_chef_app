import { getCurrentUserRecord, saveUserRecord } from "@/lib/app-state";
import { getCookById, type CookDirectoryRecord } from "@/lib/cook-data";

function uniqueCookIds(ids: string[]) {
  return [...new Set(ids.filter((item) => item.trim().length > 0))];
}

export async function getSavedCookIds() {
  const currentUser = await getCurrentUserRecord();
  return currentUser?.savedCookIds ?? [];
}

export async function isCookSaved(cookId: string) {
  const savedCookIds = await getSavedCookIds();
  return savedCookIds.includes(cookId);
}

export async function toggleSavedCook(cookId: string) {
  const currentUser = await getCurrentUserRecord();

  if (!currentUser) {
    throw new Error("You need to be signed in to save cooks.");
  }

  const savedCookIds = currentUser.savedCookIds ?? [];
  const nextSavedCookIds = savedCookIds.includes(cookId)
    ? savedCookIds.filter((item) => item !== cookId)
    : uniqueCookIds([...savedCookIds, cookId]);

  const nextUser = {
    ...currentUser,
    savedCookIds: nextSavedCookIds,
    updatedAt: new Date().toISOString(),
  };

  await saveUserRecord(nextUser);
  return nextSavedCookIds;
}

export async function fetchSavedCooks() {
  const savedCookIds = await getSavedCookIds();
  const cooks = await Promise.all(savedCookIds.map((cookId) => getCookById(cookId)));
  return cooks.filter((cook): cook is CookDirectoryRecord => Boolean(cook));
}
