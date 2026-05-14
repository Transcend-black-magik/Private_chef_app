const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        return;
      }

      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = valueParts.join("=").replace(/^"|"$/g, "");
      }
    });
}

const seedNames = [
  "Amaka Okoro",
  "Esther Howard",
  "Bardia Abidi",
  "Ava Zarei",
  "Ronald Mensah",
  "Kathryn Bello",
  "Jacob Reed",
  "Chef Tola",
  "Nia Carter",
  "Omar Hassan",
];

const seedCities = [
  ["New York", "NY", "United States", "US"],
  ["Los Angeles", "CA", "United States", "US"],
  ["Atlanta", "GA", "United States", "US"],
  ["Houston", "TX", "United States", "US"],
  ["London", "England", "United Kingdom", "GB"],
  ["Lagos", "Lagos", "Nigeria", "NG"],
  ["Toronto", "ON", "Canada", "CA"],
  ["Accra", "Greater Accra", "Ghana", "GH"],
];

const seedSpecialties = [
  ["Breakfast", "Brunch", "Pancakes", "Egg bowls"],
  ["Lunch", "Jollof", "Wraps", "Family trays"],
  ["Dinner", "Ramen", "Pasta", "Private dining"],
  ["Meal prep", "High protein", "Weekly bowls", "Clean sauces"],
  ["Healthy", "Salads", "Gym bowls", "Lean protein"],
  ["Dessert", "Cakes", "Cookies", "Sweet boxes"],
];

function buildSeedCookUsers(count = 100) {
  return Array.from({ length: count }, (_, index) => {
    const specialtySet = seedSpecialties[index % seedSpecialties.length];
    const citySet = seedCities[index % seedCities.length];
    const categories = specialtySet.filter((item) =>
      ["Breakfast", "Lunch", "Dinner", "Meal prep", "Healthy", "Dessert"].includes(item),
    );
    const name = `${seedNames[index % seedNames.length]} ${index + 1}`;

    return {
      id: `seed-cook-${index + 1}`,
      name,
      phone: `+1555000${String(index + 1).padStart(4, "0")}`,
      email: `seed.cook.${index + 1}@privatechef.local`,
      role: "cook",
      provider: "email",
      profileComplete: true,
      photoUrl: "",
      city: citySet[0],
      region: citySet[1],
      countryName: citySet[2],
      countryCode: citySet[3],
      bio: `${name} cooks polished ${specialtySet[0].toLowerCase()} meals with calm service, fast replies, and clean handoff notes.`,
      specialtiesText: specialtySet.join(", "),
      yearsExperience: String(2 + (index % 12)),
      serviceAreaLabel: `${citySet[0]} ${6 + (index % 18)} mi`,
      serviceRadiusMiles: String(6 + (index % 18)),
      safetyPractices: "Fresh prep surfaces, labelled ingredients, arrival confirmation, and clean handoff.",
      emergencyContactName: "Operations contact",
      emergencyContactPhone: "+15550101010",
      availableMealCategories: categories.length ? categories : ["Dinner"],
      cookVerification: {
        provider: "manual",
        status: "verified",
        countryCode: citySet[3],
        countryName: citySet[2],
        documentType: "Seed profile",
        documentNumber: `SEED-${index + 1}`,
        submittedAt: new Date(2026, 0, 1).toISOString(),
        verifiedAt: new Date(2026, 0, 2).toISOString(),
      },
      createdAt: new Date(2026, 0, 1).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

async function main() {
  loadDotEnv();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const cooks = buildSeedCookUsers(100);
  const { error } = await supabase.from("users").upsert(cooks, { onConflict: "id" });

  if (error) {
    throw error;
  }

  console.log(`Seeded ${cooks.length} cook profiles into Supabase users.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
