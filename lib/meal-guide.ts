export type MealSignal = {
  spiceLevel: "mild" | "balanced" | "hot";
  mealMood: "comforting" | "fresh" | "indulgent" | "focused";
  mealTemperature: "warm" | "cold" | "either";
  gymGoal: "none" | "lean_bulk" | "cutting" | "recovery";
  appetite: "light" | "steady" | "hungry";
};

export type MealSuggestion = {
  title: string;
  body: string;
  searchQuery: string;
  accent: "warm" | "fresh" | "focused";
};

const comfortSuggestions: MealSuggestion[] = [
  {
    title: "Comfort bowls and slow soups",
    body: "Go for something rich, warm, and familiar with enough depth to settle the day.",
    searchQuery: "soups comfort bowls home cooking",
    accent: "warm",
  },
  {
    title: "Tray-style family cooking",
    body: "Perfect when you want one cook to handle volume, comfort, and leftovers well.",
    searchQuery: "family trays jollof soups",
    accent: "warm",
  },
];

const freshSuggestions: MealSuggestion[] = [
  {
    title: "Fresh grilled plates",
    body: "Lighter proteins, brighter sides, and cleaner seasoning keep things easy on the body.",
    searchQuery: "healthy grills fresh meal prep",
    accent: "fresh",
  },
  {
    title: "Cold and crisp meal prep",
    body: "A cooler, cleaner direction works well when you want energy without heaviness.",
    searchQuery: "meal prep healthy salads protein",
    accent: "fresh",
  },
];

const focusedSuggestions: MealSuggestion[] = [
  {
    title: "Gym-ready plates",
    body: "Ask for measured portions, cleaner oils, and stronger protein balance.",
    searchQuery: "healthy protein meal prep gym",
    accent: "focused",
  },
  {
    title: "Recovery meals",
    body: "Build around protein, calm spice, and enough carbs to feel refueled, not flat.",
    searchQuery: "recovery meals protein rice soups",
    accent: "focused",
  },
];

export function buildMealSuggestions(signal: MealSignal) {
  const suggestions: MealSuggestion[] = [];

  if (signal.gymGoal !== "none") {
    suggestions.push(...focusedSuggestions);
  }

  if (signal.mealMood === "comforting" || signal.mealTemperature === "warm") {
    suggestions.push(...comfortSuggestions);
  }

  if (signal.mealMood === "fresh" || signal.mealTemperature === "cold") {
    suggestions.push(...freshSuggestions);
  }

  if (!suggestions.length) {
    suggestions.push(
      {
        title: "Balanced home-cooked dinner",
        body: "A safe middle ground with clean flavor, enough comfort, and no guesswork.",
        searchQuery: "balanced home cooking dinner",
        accent: "warm",
      },
      {
        title: "Flexible private cook",
        body: "Best when you want someone who can adapt the meal live around your taste.",
        searchQuery: "private dining flexible cook",
        accent: "focused",
      },
    );
  }

  return suggestions.slice(0, 4);
}
