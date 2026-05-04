import * as Location from "expo-location";

const COUNTRY_DIAL_CODES: Record<string, string> = {
  AU: "+61",
  CA: "+1",
  GB: "+44",
  GH: "+233",
  IE: "+353",
  KE: "+254",
  NG: "+234",
  US: "+1",
  ZA: "+27",
};

export type DetectedLocationProfile = {
  countryCode: string;
  countryName: string;
  dialCode: string;
  locality: string;
  city: string;
  region: string;
};

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() || "";
}

export function getDialCode(countryCode?: string | null) {
  const normalized = typeof countryCode === "string" ? countryCode.trim().toUpperCase() : "";
  return COUNTRY_DIAL_CODES[normalized] ?? "+1";
}

export async function detectLocationProfile() {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (!permission.granted) {
    return null;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const places = await Location.reverseGeocodeAsync(position.coords);
  const firstPlace = places[0];

  if (!firstPlace) {
    return null;
  }

  const countryCode = firstPlace.isoCountryCode?.toUpperCase() || "US";
  const countryName = firstPlace.country || "United States";
  const locality = firstText(
    (firstPlace as { district?: string }).district,
    (firstPlace as { subregion?: string }).subregion,
    (firstPlace as { city?: string }).city,
    (firstPlace as { name?: string }).name,
    (firstPlace as { street?: string }).street,
  );
  const city = firstText(
    (firstPlace as { city?: string }).city,
    (firstPlace as { district?: string }).district,
    (firstPlace as { subregion?: string }).subregion,
    (firstPlace as { name?: string }).name,
  );
  const region = firstText(
    (firstPlace as { region?: string }).region,
    (firstPlace as { subregion?: string }).subregion,
    (firstPlace as { city?: string }).city,
  );

  return {
    countryCode,
    countryName,
    dialCode: getDialCode(countryCode),
    locality,
    city,
    region,
  } satisfies DetectedLocationProfile;
}
