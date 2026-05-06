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
  mealItemId?: string;
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
    mealItemId: "spicy-ramen-noodle",
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
    mealItemId: "berry-cream-cake",
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
    mealItemId: "green-gym-bowl",
    description:
      "A fresh grilled chicken salad with crisp vegetables, olive oil, and a clean protein-forward finish.",
    ingredients: [
      { name: "Chicken", amount: "160 g", icon: "flame-outline" },
      { name: "Tomatoes", amount: "90 g", icon: "nutrition-outline" },
      { name: "Greens", amount: "120 g", icon: "leaf-outline" },
    ],
  },
  {
    id: "jollof-rice-bowl",
    title: "Jollof Rice Bowl",
    author: "Cook for Me Kitchen",
    image: heroFoodImages.jollof,
    rating: "4.8",
    time: "45 mins",
    level: "Medium",
    calories: "620 kcal",
    mealItemId: "jollof-lunch-box",
    description:
      "A smoky tomato rice bowl with warm spice, soft vegetables, and a weeknight-friendly finish.",
    ingredients: [
      { name: "Rice", amount: "220 g", icon: "restaurant-outline" },
      { name: "Tomato base", amount: "180 ml", icon: "nutrition-outline" },
      { name: "Stock", amount: "300 ml", icon: "water-outline" },
    ],
  },
  {
    id: "classic-pizza",
    title: "Classic Pizza",
    author: "Cook for Me Kitchen",
    image: heroFoodImages.pizza,
    rating: "4.7",
    time: "35 mins",
    level: "Easy",
    calories: "740 kcal",
    mealItemId: "italian-hot-pizza",
    description:
      "A crisp-edged pizza with bright tomato sauce, melted cheese, and a simple home oven method.",
    ingredients: [
      { name: "Pizza dough", amount: "1 ball", icon: "ellipse-outline" },
      { name: "Tomato sauce", amount: "90 ml", icon: "nutrition-outline" },
      { name: "Mozzarella", amount: "120 g", icon: "cube-outline" },
    ],
  },
  {
    id: "smash-burger",
    title: "Smash Burger",
    author: "Cook for Me Kitchen",
    image: heroFoodImages.burger,
    rating: "4.6",
    time: "25 mins",
    level: "Easy",
    calories: "680 kcal",
    mealItemId: "suya-chicken-wrap",
    description:
      "A fast skillet burger with crisp edges, melty cheese, and a balanced sauce for a diner-style bite.",
    ingredients: [
      { name: "Ground beef", amount: "180 g", icon: "flame-outline" },
      { name: "Cheese", amount: "2 slices", icon: "albums-outline" },
      { name: "Buns", amount: "2", icon: "restaurant-outline" },
    ],
  },
  {
    id: "seared-steak",
    title: "Seared Steak",
    author: "Cook for Me Kitchen",
    image: heroFoodImages.platter,
    rating: "4.9",
    time: "30 mins",
    level: "Chef tips",
    calories: "590 kcal",
    mealItemId: "salmon-veg-plate",
    description:
      "A simple steak plate focused on heat control, resting, and a glossy pan finish.",
    ingredients: [
      { name: "Steak", amount: "240 g", icon: "flame-outline" },
      { name: "Butter", amount: "25 g", icon: "cube-outline" },
      { name: "Herbs", amount: "1 bunch", icon: "leaf-outline" },
    ],
  },
];

export function getRecipeById(id?: string) {
  return recipeRecommendations.find((recipe) => recipe.id === id) ?? recipeRecommendations[0];
}
