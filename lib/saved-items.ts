import AsyncStorage from "@react-native-async-storage/async-storage";

const SAVED_MEAL_IDS_KEY = "cook-for-me:saved-meal-ids";
const SAVED_RECIPE_IDS_KEY = "cook-for-me:saved-recipe-ids";

function uniqueIds(ids: string[]) {
  return [...new Set(ids.map((item) => item.trim()).filter(Boolean))];
}

async function getSavedIds(storageKey: string) {
  const raw = await AsyncStorage.getItem(storageKey);

  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? uniqueIds(parsed.filter((item): item is string => typeof item === "string")) : [];
  } catch {
    return [] as string[];
  }
}

async function saveIds(storageKey: string, ids: string[]) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(uniqueIds(ids)));
}

async function toggleSavedId(storageKey: string, id: string) {
  const current = await getSavedIds(storageKey);
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  await saveIds(storageKey, next);
  return next;
}

export async function getSavedMealIds() {
  return getSavedIds(SAVED_MEAL_IDS_KEY);
}

export async function isMealSaved(mealId: string) {
  const ids = await getSavedMealIds();
  return ids.includes(mealId);
}

export async function toggleSavedMeal(mealId: string) {
  return toggleSavedId(SAVED_MEAL_IDS_KEY, mealId);
}

export async function getSavedRecipeIds() {
  return getSavedIds(SAVED_RECIPE_IDS_KEY);
}

export async function isRecipeSaved(recipeId: string) {
  const ids = await getSavedRecipeIds();
  return ids.includes(recipeId);
}

export async function toggleSavedRecipe(recipeId: string) {
  return toggleSavedId(SAVED_RECIPE_IDS_KEY, recipeId);
}
