export type FoodImageSource = string | number;

export type FoodVisual = {
  title: string;
  subtitle: string;
  image: FoodImageSource;
  tone: "olive" | "orange" | "cream" | "dark" | "mint";
};

export const heroFoodImages = {
  explorer:
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80",
  recipe:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
  assistant:
    "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1200&q=80",
  bookmark:
    "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=1200&q=80",
  chef:
    "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1200&q=80",
  salad:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
  pasta:
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=80",
  jollof:
    "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1200&q=80",
  platter:
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80",
  dessert:
    "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=1200&q=80",
  burger:
    "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
  pizza:
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
};

export const inspirationCards: FoodVisual[] = [
  {
    title: "Comfort bowls",
    subtitle: "Warm meals",
    image: heroFoodImages.jollof,
    tone: "orange",
  },
  {
    title: "Clean plates",
    subtitle: "Fresh focus",
    image: heroFoodImages.salad,
    tone: "mint",
  },
  {
    title: "Family trays",
    subtitle: "Shareable",
    image: heroFoodImages.platter,
    tone: "olive",
  },
  {
    title: "Sweet finish",
    subtitle: "Dessert",
    image: heroFoodImages.dessert,
    tone: "cream",
  },
];

export const foodCategories = [
  { label: "Breakfast", icon: "sunny-outline" },
  { label: "Lunch", icon: "restaurant-outline" },
  { label: "Dinner", icon: "moon-outline" },
  { label: "Meal prep", icon: "calendar-outline" },
  { label: "Healthy", icon: "leaf-outline" },
  { label: "Dessert", icon: "ice-cream-outline" },
] as const;

export function getCookImage(index = 0) {
  const images = [
    heroFoodImages.jollof,
    heroFoodImages.salad,
    heroFoodImages.pasta,
    heroFoodImages.platter,
    heroFoodImages.pizza,
    heroFoodImages.burger,
    heroFoodImages.dessert,
  ];

  return images[Math.abs(index) % images.length];
}
