import { heroFoodImages, type FoodImageSource } from "@/lib/food-visuals";

export type RecipeRecord = {
  id: string;
  title: string;
  author: string;
  image: FoodImageSource;
  rating: string;
  time: string;
  level: string;
  calories: string;
  description: string;
  ingredients: { name: string; amount: string; icon: string }[];
};

export const recipeRecommendations: RecipeRecord[] = [
  {
    id: "creamy-pasta",
    title: "Creamy Pasta",
    author: "David Charles",
    image: heroFoodImages.pasta,
    rating: "4.6",
    time: "20 mins",
    level: "Easy",
    calories: "510 cal",
    description:
      "A soft, creamy pasta with herbs, parmesan, and a calm weeknight feel. Good when you want comfort without a heavy plan.",
    ingredients: [
      { name: "Pasta", amount: "180 g", icon: "restaurant-outline" },
      { name: "Cream", amount: "80 ml", icon: "water-outline" },
      { name: "Parmesan", amount: "35 g", icon: "cube-outline" },
    ],
  },
  {
    id: "macarons",
    title: "Macarons",
    author: "Rachel William",
    image: heroFoodImages.dessert,
    rating: "4.5",
    time: "10 mins",
    level: "Medium",
    calories: "512 cal",
    description:
      "Chocolate is the best kind of dessert. These delicate little cookies are simply heavenly filled with chocolate ganache.",
    ingredients: [
      { name: "Granulated sugar", amount: "160 g", icon: "cafe-outline" },
      { name: "Ground almond", amount: "160 g", icon: "leaf-outline" },
      { name: "Dark chocolate", amount: "110 g", icon: "square-outline" },
    ],
  },
  {
    id: "chicken-salad",
    title: "Chicken Salad",
    author: "Samantha Lee",
    image: heroFoodImages.salad,
    rating: "4.9",
    time: "30 mins",
    level: "Healthy",
    calories: "280 kcal",
    description:
      "A fresh grilled chicken salad with crisp vegetables, olive oil, and a clean protein-forward finish.",
    ingredients: [
      { name: "Chicken", amount: "160 g", icon: "flame-outline" },
      { name: "Tomatoes", amount: "90 g", icon: "nutrition-outline" },
      { name: "Greens", amount: "120 g", icon: "leaf-outline" },
    ],
  },
];

export function getRecipeById(id?: string) {
  return recipeRecommendations.find((recipe) => recipe.id === id) ?? recipeRecommendations[0];
}
