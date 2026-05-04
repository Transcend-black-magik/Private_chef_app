import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";

import AuthProcessingScreen from "@/components/AuthProcessingScreen";
import { getCurrentUserRecord, saveUserRecord, type StoredUser } from "@/lib/app-state";
import { detectLocationProfile, getDialCode } from "@/lib/location-phone";
import { globalServiceAreas, mealCategories } from "@/lib/meal-data";
import { getProfileCompletion } from "@/lib/profile-completion";
import { uploadUserProfilePhoto } from "@/lib/storage";
import { getTheme, theme } from "@/theme/theme";

type FormState = {
  name: string;
  phoneCountryCode: string;
  phoneNationalNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  dietaryPreferences: string;
  householdNotes: string;
  bio: string;
  specialtiesText: string;
  yearsExperience: string;
  serviceAreaLabel: string;
  serviceRadiusMiles: string;
  availableMealCategories: string[];
  safetyPractices: string;
};

function createFormState(user: StoredUser): FormState {
  return {
    name: user.name || "",
    phoneCountryCode: user.phoneCountryCode || "",
    phoneNationalNumber: user.phoneNationalNumber || "",
    addressLine1: user.addressLine1 || "",
    addressLine2: user.addressLine2 || "",
    city: user.city || "",
    region: user.region || "",
    emergencyContactName: user.emergencyContactName || "",
    emergencyContactPhone: user.emergencyContactPhone || "",
    dietaryPreferences: user.dietaryPreferences || "",
    householdNotes: user.householdNotes || "",
    bio: user.bio || "",
    specialtiesText: user.specialtiesText || "",
    yearsExperience: user.yearsExperience || "",
    serviceAreaLabel: user.serviceAreaLabel || "",
    serviceRadiusMiles: user.serviceRadiusMiles || "",
    availableMealCategories: user.availableMealCategories || [],
    safetyPractices: user.safetyPractices || "",
  };
}

function normalizeSignatureDishes(value: string) {
  return value
    .split(/,|\n|;|\s+and\s+/i)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

export default function CompleteProfileScreen() {
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);

  const [user, setUser] = useState<StoredUser | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");
  const [isDetectingLocation, setIsDetectingLocation] = useState(true);
  const [serviceAreaSearch, setServiceAreaSearch] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const nextUser = await getCurrentUserRecord();

      if (!nextUser) {
        router.replace("/signin");
        return;
      }

      setUser(nextUser);
      setForm(createFormState(nextUser));
      setPhotoUrl(nextUser.photoUrl || "");
    }

    void loadUser();
  }, []);

  useEffect(() => {
    async function detectLocation() {
      try {
        const detected = await detectLocationProfile();

        if (!detected) {
          return;
        }

        setForm((current) =>
          current
            ? {
                ...current,
                phoneCountryCode:
                  current.phoneCountryCode || detected.dialCode || getDialCode(detected.countryCode),
                city: current.city || detected.locality || detected.city,
                region: current.region || detected.region,
              }
            : current,
        );
      } finally {
        setIsDetectingLocation(false);
      }
    }

    void detectLocation();
  }, []);

  const completion = useMemo(() => (user ? getProfileCompletion(user) : null), [user]);

  if (!user || !form || !completion) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  const currentUser = user;
  const currentForm = form;
  const isCook = user.role === "cook";

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  const serviceAreaMatches = globalServiceAreas
    .filter((area) => {
      const search = serviceAreaSearch.trim().toLowerCase();
      return !search || area.toLowerCase().includes(search);
    })
    .slice(0, 8);

  function toggleMealCategory(category: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const exists = current.availableMealCategories.includes(category);
      return {
        ...current,
        availableMealCategories: exists
          ? current.availableMealCategories.filter((item) => item !== category)
          : [...current.availableMealCategories, category],
      };
    });
  }

  async function handlePickPhoto() {
    setError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError("Photo access was denied. Allow photo access to upload a profile image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      setPhotoBase64(result.assets[0]?.base64 || "");
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError("");

    const fullPhone = `${currentForm.phoneCountryCode.trim()} ${currentForm.phoneNationalNumber.trim()}`.trim();
    const emergencyPhone = `${currentForm.phoneCountryCode.trim()} ${currentForm.emergencyContactPhone.trim()}`.trim();
    let nextPhotoUrl = photoUrl || currentUser.photoUrl || "";

    try {
      if (photoBase64) {
        nextPhotoUrl = await uploadUserProfilePhoto(currentUser.id, photoBase64);
        setPhotoUrl(nextPhotoUrl);
        setPhotoUri("");
        setPhotoBase64("");
      }
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "We could not upload your photo.");
      setIsSaving(false);
      return;
    }

    const nextUser: StoredUser = {
      ...currentUser,
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      provider: currentUser.provider,
      profileComplete: currentUser.profileComplete,
      createdAt: currentUser.createdAt,
      name: currentForm.name.trim(),
      photoUrl: nextPhotoUrl || undefined,
      phone: fullPhone,
      phoneCountryCode: currentForm.phoneCountryCode.trim(),
      phoneNationalNumber: currentForm.phoneNationalNumber.trim(),
      addressLine1: currentForm.addressLine1.trim(),
      addressLine2: currentForm.addressLine2.trim() || undefined,
      city: currentForm.city.trim(),
      region: currentForm.region.trim(),
      emergencyContactName: currentForm.emergencyContactName.trim(),
      emergencyContactPhone: emergencyPhone || undefined,
      dietaryPreferences: currentForm.dietaryPreferences.trim(),
      householdNotes: currentForm.householdNotes.trim(),
      bio: isCook ? currentForm.bio.trim() : undefined,
      specialtiesText: isCook ? currentForm.specialtiesText.trim() : undefined,
      yearsExperience: isCook ? currentForm.yearsExperience.trim() : undefined,
      serviceAreaLabel: isCook ? currentForm.serviceAreaLabel.trim() : undefined,
      serviceRadiusMiles: isCook ? currentForm.serviceRadiusMiles.trim() : undefined,
      availableMealCategories: isCook ? currentForm.availableMealCategories : undefined,
      safetyPractices: isCook ? currentForm.safetyPractices.trim() : undefined,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveUserRecord(nextUser);
      setUser(nextUser);
      setShowSuccess(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We could not save your profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
      >
        <View style={styles.heroGlow} />

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>{isCook ? "Profile trust" : "Profile safety"}</Text>
          <Text style={styles.title}>
            {isCook ? "Build the kind of cook profile explorers trust." : "Finish the details that make home bookings safer."}
          </Text>
          <Text style={styles.subtitle}>
            {isCook
              ? "Your cook profile is stronger when explorers can see your experience, service area, and safety standards."
              : "These details help us show clearer profile information before anyone books into your home."}
          </Text>
        </View>

        <View style={styles.photoCard}>
          <View style={styles.photoHalo} />
          <View style={styles.photoPreview}>
            {photoUri || photoUrl ? (
              <Image source={photoUri || photoUrl} style={styles.photoImage} contentFit="cover" />
            ) : (
              <Text style={styles.photoFallback}>{currentUser.name.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.photoCopy}>
            <Text style={styles.photoTitle}>Profile photo</Text>
            <Text style={styles.photoSubtitle}>
              A clear profile photo helps both sides feel safer before the first booking.
            </Text>
          </View>
          <Pressable style={styles.photoButton} onPress={() => void handlePickPhoto()}>
            <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
            <Text style={styles.photoButtonText}>{photoUri || photoUrl ? "Change" : "Upload"}</Text>
          </Pressable>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressTitle}>Profile completion</Text>
            <Text style={styles.progressPercent}>{completion.percent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completion.percent}%` }]} />
          </View>
          <Text style={styles.progressCopy}>
            {completion.completed} of {completion.total} trust details added
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionIcon}>
              <Ionicons name="person-outline" size={18} color={activeTheme.primaryDark} />
            </View>
            <Text style={styles.sectionTitle}>Core details</Text>
          </View>
          <TextInput
            value={form.name}
            onChangeText={(value) => updateField("name", value)}
            placeholder="Full name"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.input}
          />
          <View style={styles.phoneRow}>
            <View style={styles.codeInput}>
              <Text style={styles.codeInputText}>{form.phoneCountryCode || "+1"}</Text>
            </View>
            <TextInput
              value={form.phoneNationalNumber}
              onChangeText={(value) => updateField("phoneNationalNumber", value)}
              placeholder="Phone number"
              placeholderTextColor={activeTheme.textMuted}
              keyboardType="phone-pad"
              style={[styles.input, styles.phoneInput]}
            />
          </View>
          <Text style={styles.helperText}>
            {isDetectingLocation
              ? "Detecting your country and dialing code..."
              : "Phone number uses your detected country code."}
          </Text>
          <TextInput
            value={form.addressLine1}
            onChangeText={(value) => updateField("addressLine1", value)}
            placeholder="Street address"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.input}
          />
          <TextInput
            value={form.addressLine2}
            onChangeText={(value) => updateField("addressLine2", value)}
            placeholder="Apartment, suite, or gate note"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.input}
          />
          <TextInput
            value={form.city}
            onChangeText={(value) => updateField("city", value)}
            placeholder="City"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.input}
          />
          <TextInput
            value={form.region}
            onChangeText={(value) => updateField("region", value)}
            placeholder="State or region"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.formCard}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionIcon}>
              <Ionicons name="shield-checkmark-outline" size={18} color={activeTheme.primaryDark} />
            </View>
            <Text style={styles.sectionTitle}>Safety details</Text>
          </View>
          <TextInput
            value={form.emergencyContactName}
            onChangeText={(value) => updateField("emergencyContactName", value)}
            placeholder="Emergency contact name"
            placeholderTextColor={activeTheme.textMuted}
            style={styles.input}
          />
          <View style={styles.phoneRow}>
            <View style={styles.codeInput}>
              <Text style={styles.codeInputText}>{form.phoneCountryCode || "+1"}</Text>
            </View>
            <TextInput
              value={form.emergencyContactPhone}
              onChangeText={(value) => updateField("emergencyContactPhone", value)}
              placeholder="Emergency contact phone"
              placeholderTextColor={activeTheme.textMuted}
              keyboardType="phone-pad"
              style={[styles.input, styles.phoneInput]}
            />
          </View>
          {isCook ? (
            <TextInput
              value={form.safetyPractices}
              onChangeText={(value) => updateField("safetyPractices", value)}
              placeholder="Tell explorers about hygiene, cleanup, allergens, and kitchen safety."
              placeholderTextColor={activeTheme.textMuted}
              multiline
              style={[styles.input, styles.textArea]}
            />
          ) : (
            <>
              <TextInput
                value={form.dietaryPreferences}
                onChangeText={(value) => updateField("dietaryPreferences", value)}
                placeholder="Dietary preferences, allergies, or household food notes"
                placeholderTextColor={activeTheme.textMuted}
                multiline
                style={[styles.input, styles.textArea]}
              />
              <TextInput
                value={form.householdNotes}
                onChangeText={(value) => updateField("householdNotes", value)}
                placeholder="Anything a cook should know before arriving at your home"
                placeholderTextColor={activeTheme.textMuted}
                multiline
                style={[styles.input, styles.textArea]}
              />
            </>
          )}
        </View>

        {isCook ? (
          <View style={styles.formCard}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIcon}>
                <Ionicons name="restaurant-outline" size={18} color={activeTheme.primaryDark} />
              </View>
              <Text style={styles.sectionTitle}>Cook identity and service fit</Text>
            </View>
            <Text style={styles.helperText}>
              ID review status: {user.cookVerification?.status?.replace(/_/g, " ") || "not started"}
            </Text>
            <TextInput
              value={form.bio}
              onChangeText={(value) => updateField("bio", value)}
              placeholder="Short bio: what kind of cooking you are known for"
              placeholderTextColor={activeTheme.textMuted}
              multiline
              style={[styles.input, styles.textArea]}
            />
            <TextInput
              value={form.specialtiesText}
              onChangeText={(value) => updateField("specialtiesText", normalizeSignatureDishes(value))}
              placeholder="Signature dishes. Type one or many."
              placeholderTextColor={activeTheme.textMuted}
              style={styles.input}
            />
            {form.specialtiesText ? (
              <View style={styles.chipRow}>
                {form.specialtiesText.split(",").map((item) => (
                  <View key={item.trim()} style={styles.softChip}>
                    <Text style={styles.softChipText}>{item.trim()}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <TextInput
              value={form.yearsExperience}
              onChangeText={(value) => updateField("yearsExperience", value)}
              placeholder="Years of experience"
              placeholderTextColor={activeTheme.textMuted}
              keyboardType="number-pad"
              style={styles.input}
            />
            <View style={styles.serviceAreaPicker}>
              <TextInput
                value={serviceAreaSearch}
                onChangeText={setServiceAreaSearch}
                placeholder={form.serviceAreaLabel || "Search main service area"}
                placeholderTextColor={activeTheme.textMuted}
                style={styles.searchInput}
              />
              <View style={styles.serviceAreaResults}>
                {serviceAreaMatches.map((area) => (
                  <Pressable
                    key={area}
                    style={[
                      styles.serviceAreaOption,
                      form.serviceAreaLabel === area && styles.serviceAreaOptionActive,
                    ]}
                    onPress={() => {
                      updateField("serviceAreaLabel", area);
                      setServiceAreaSearch("");
                    }}
                  >
                    <Text
                      style={[
                        styles.serviceAreaOptionText,
                        form.serviceAreaLabel === area && styles.serviceAreaOptionTextActive,
                      ]}
                    >
                      {area}
                    </Text>
                  </Pressable>
                ))}
                {serviceAreaSearch.trim() ? (
                  <Pressable
                    style={styles.serviceAreaOption}
                    onPress={() => {
                      updateField("serviceAreaLabel", serviceAreaSearch.trim());
                      setServiceAreaSearch("");
                    }}
                  >
                    <Text style={styles.serviceAreaOptionText}>
                      Use {serviceAreaSearch.trim()}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <TextInput
              value={form.serviceRadiusMiles}
              onChangeText={(value) => updateField("serviceRadiusMiles", value)}
              placeholder="How far you can travel in miles"
              placeholderTextColor={activeTheme.textMuted}
              keyboardType="number-pad"
              style={styles.input}
            />
            <Text style={styles.sectionSubTitle}>Available for</Text>
            <View style={styles.chipRow}>
              {mealCategories.map((category) => {
                const selected = form.availableMealCategories.includes(category);
                return (
                  <Pressable
                    key={category}
                    style={[styles.categoryChip, selected && styles.categoryChipActive]}
                    onPress={() => toggleMealCategory(category)}
                  >
                    <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={() => void handleSave()}>
          <Text style={styles.primaryButtonText}>Save profile details</Text>
        </Pressable>
      </ScrollView>

      {isSaving ? (
        <AuthProcessingScreen
          title="Saving your profile"
          subtitle="We're updating your trust details and preparing your home screen."
        />
      ) : null}
      {showSuccess ? (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={34} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Profile saved beautifully</Text>
            <Text style={styles.successBody}>
              {isCook && currentUser.cookVerification?.status !== "verified"
                ? "Your details are saved. The next step is identity verification so explorers can trust your profile."
                : "Your profile details are ready across the app."}
            </Text>
            <Pressable
              style={styles.successButton}
              onPress={() =>
                isCook && currentUser.cookVerification?.status !== "verified"
                  ? router.replace("/cook-verification" as never)
                  : router.back()
              }
            >
              <Text style={styles.successButtonText}>
                {isCook && currentUser.cookVerification?.status !== "verified"
                  ? "Start identity check"
                  : "Done"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: activeTheme.bg,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.layout.screenTop,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    loadingScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.bg,
    },
    loadingText: {
      color: activeTheme.text,
      fontSize: 16,
      fontWeight: "700",
    },
    heroGlow: {
      position: "absolute",
      top: -90,
      right: -40,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: activeTheme.accentSoft,
      opacity: activeTheme.bg === "#121713" ? 0.2 : 0.9,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
    },
    backText: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "700",
    },
    headerBlock: {
      gap: theme.spacing.xs,
    },
    eyebrow: {
      color: activeTheme.primaryDark,
      fontSize: 14,
      fontWeight: "800",
    },
    title: {
      color: activeTheme.text,
      fontSize: 31,
      lineHeight: 38,
      fontWeight: "800",
    },
    subtitle: {
      color: activeTheme.textMuted,
      fontSize: 15,
      lineHeight: 23,
    },
    progressCard: {
      backgroundColor: activeTheme.safeSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    progressTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    progressTitle: {
      color: activeTheme.text,
      fontSize: 17,
      fontWeight: "800",
    },
    progressPercent: {
      color: activeTheme.primaryDark,
      fontSize: 16,
      fontWeight: "800",
    },
    progressTrack: {
      height: 10,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.surfaceElevated,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primary,
    },
    progressCopy: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    photoCard: {
      backgroundColor: activeTheme.warmSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: 30,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
    },
    photoHalo: {
      position: "absolute",
      left: -28,
      top: -22,
      width: 138,
      height: 138,
      borderRadius: 69,
      backgroundColor: activeTheme.accentSoft,
      opacity: 0.76,
    },
    photoPreview: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.surfaceElevated,
      overflow: "hidden",
    },
    photoImage: {
      width: "100%",
      height: "100%",
    },
    photoFallback: {
      color: activeTheme.text,
      fontSize: 28,
      fontWeight: "800",
    },
    photoCopy: {
      flex: 1,
      gap: 4,
    },
    photoTitle: {
      color: activeTheme.text,
      fontSize: 18,
      fontWeight: "800",
    },
    photoSubtitle: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    photoButton: {
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primary,
      flexDirection: "row",
      gap: 7,
    },
    photoButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
    formCard: {
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: 30,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      shadowColor: activeTheme.shadow,
      shadowOpacity: 0.8,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    sectionHeadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.safeSurface,
    },
    sectionTitle: {
      color: activeTheme.text,
      fontSize: 19,
      fontWeight: "800",
    },
    sectionSubTitle: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "800",
    },
    input: {
      backgroundColor: activeTheme.surfaceElevated,
      borderWidth: 1,
      borderColor: activeTheme.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 16,
      color: activeTheme.text,
      fontSize: 15,
    },
    phoneRow: {
      flexDirection: "row",
      gap: 10,
    },
    codeInput: {
      width: 88,
      minHeight: 56,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surfaceElevated,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.sm,
    },
    codeInputText: {
      color: activeTheme.text,
      fontSize: 15,
      fontWeight: "700",
    },
    phoneInput: {
      flex: 1,
    },
    textArea: {
      minHeight: 108,
      textAlignVertical: "top",
    },
    helperText: {
      color: activeTheme.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    softChip: {
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: activeTheme.safeSurface,
    },
    softChipText: {
      color: activeTheme.text,
      fontSize: 12,
      fontWeight: "800",
    },
    serviceAreaPicker: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surfaceElevated,
      padding: 10,
      gap: 10,
    },
    searchInput: {
      minHeight: 48,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.bg,
      borderWidth: 1,
      borderColor: activeTheme.border,
      paddingHorizontal: theme.spacing.md,
      color: activeTheme.text,
      fontSize: 15,
    },
    serviceAreaResults: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    serviceAreaOption: {
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surface,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    serviceAreaOptionActive: {
      backgroundColor: activeTheme.primary,
      borderColor: activeTheme.primary,
    },
    serviceAreaOptionText: {
      color: activeTheme.text,
      fontSize: 12,
      fontWeight: "800",
    },
    serviceAreaOptionTextActive: {
      color: "#FFFFFF",
    },
    categoryChip: {
      minHeight: 40,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: activeTheme.border,
      backgroundColor: activeTheme.surfaceElevated,
      paddingHorizontal: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryChipActive: {
      backgroundColor: activeTheme.primaryDark,
      borderColor: activeTheme.primaryDark,
    },
    categoryChipText: {
      color: activeTheme.text,
      fontSize: 13,
      fontWeight: "800",
    },
    categoryChipTextActive: {
      color: "#FFFFFF",
    },
    errorText: {
      color: activeTheme.danger,
      fontSize: 13,
      lineHeight: 20,
    },
    primaryButton: {
      minHeight: 56,
      borderRadius: theme.radius.md,
      backgroundColor: activeTheme.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "800",
    },
    successOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.38)",
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    successCard: {
      width: "100%",
      maxWidth: 420,
      borderRadius: 34,
      backgroundColor: activeTheme.surface,
      padding: theme.spacing.xl,
      alignItems: "center",
      gap: 14,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    successIcon: {
      width: 74,
      height: 74,
      borderRadius: 37,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primary,
    },
    successTitle: {
      color: activeTheme.text,
      fontSize: 25,
      lineHeight: 31,
      fontWeight: "900",
      textAlign: "center",
    },
    successBody: {
      color: activeTheme.textMuted,
      fontSize: 14,
      lineHeight: 22,
      textAlign: "center",
    },
    successButton: {
      minHeight: 52,
      borderRadius: theme.radius.pill,
      backgroundColor: activeTheme.primaryDark,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xl,
      marginTop: 6,
    },
    successButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "900",
    },
  });

