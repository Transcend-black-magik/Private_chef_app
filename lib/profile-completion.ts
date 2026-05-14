import type { StoredUser, UserRole } from "@/lib/app-state";

export type ProfileRequirement = {
  key: string;
  label: string;
  complete: boolean;
};

function hasText(value?: string | null) {
  return Boolean(value && value.trim());
}

function countComplete(requirements: ProfileRequirement[]) {
  return requirements.filter((item) => item.complete).length;
}

export function getExplorerProfileRequirements(user: StoredUser): ProfileRequirement[] {
  return [
    { key: "name", label: "Full name", complete: hasText(user.name) },
    { key: "phone", label: "Phone number", complete: hasText(user.phone) },
    { key: "addressLine1", label: "Street address", complete: hasText(user.addressLine1) },
    { key: "city", label: "City", complete: hasText(user.city) },
    { key: "region", label: "State or region", complete: hasText(user.region) },
    {
      key: "emergencyContactName",
      label: "Emergency contact name",
      complete: hasText(user.emergencyContactName),
    },
    {
      key: "emergencyContactPhone",
      label: "Emergency contact phone",
      complete: hasText(user.emergencyContactPhone),
    },
    {
      key: "householdNotes",
      label: "Home notes",
      complete: hasText(user.householdNotes),
    },
    {
      key: "dietaryPreferences",
      label: "Dietary preferences",
      complete: hasText(user.dietaryPreferences),
    },
  ];
}

export function getCookProfileRequirements(user: StoredUser): ProfileRequirement[] {
  return [
    { key: "name", label: "Full name", complete: hasText(user.name) },
    { key: "phone", label: "Phone number", complete: hasText(user.phone) },
    { key: "addressLine1", label: "Street address", complete: hasText(user.addressLine1) },
    { key: "city", label: "City", complete: hasText(user.city) },
    { key: "region", label: "State or region", complete: hasText(user.region) },
    {
      key: "countryName",
      label: "Country",
      complete: hasText(user.countryName),
    },
    {
      key: "platformTrust",
      label: "Platform trust",
      complete: hasText(user.cookVerification?.documentNumber),
    },
    { key: "bio", label: "Bio", complete: hasText(user.bio) },
    {
      key: "specialtiesText",
      label: "Signature dishes",
      complete: hasText(user.specialtiesText),
    },
    {
      key: "yearsExperience",
      label: "Years of experience",
      complete: hasText(user.yearsExperience),
    },
    {
      key: "serviceAreaLabel",
      label: "Service area",
      complete: hasText(user.serviceAreaLabel),
    },
    {
      key: "serviceRadiusMiles",
      label: "Travel radius",
      complete: hasText(user.serviceRadiusMiles),
    },
    {
      key: "emergencyContactName",
      label: "Emergency contact name",
      complete: hasText(user.emergencyContactName),
    },
    {
      key: "emergencyContactPhone",
      label: "Emergency contact phone",
      complete: hasText(user.emergencyContactPhone),
    },
    {
      key: "safetyPractices",
      label: "Kitchen and safety practices",
      complete: hasText(user.safetyPractices),
    },
    {
      key: "nutritionServices",
      label: "Nutrition support",
      complete: hasText(user.nutritionServices),
    },
  ];
}

export function getProfileRequirements(user: StoredUser) {
  return user.role === "cook"
    ? getCookProfileRequirements(user)
    : getExplorerProfileRequirements(user);
}

export function getProfileCompletion(user: StoredUser) {
  const requirements = getProfileRequirements(user);
  const completed = countComplete(requirements);
  const total = requirements.length;
  const percent = total === 0 ? 100 : Math.round((completed / total) * 100);

  return {
    role: user.role,
    requirements,
    completed,
    total,
    percent,
    isComplete: percent >= 100,
  };
}

export function getProfileCompletionCopy(role: UserRole) {
  if (role === "cook") {
    return {
      title: "Build a trusted cook profile",
      subtitle:
        "Add the details explorers look for before inviting someone into their home.",
      cta: "Complete cook profile",
    };
  }

  return {
    title: "Complete your safety profile",
    subtitle:
      "Share the key details we use to make bookings safer and smoother inside your home.",
    cta: "Complete explorer profile",
  };
}
