import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

import { subscribeToBookingsForCurrentUser, type BookingRecord } from "@/lib/marketplace";
import { getTheme, theme } from "@/theme/theme";

function coordinateFromText(value?: string) {
  const text = value || "New York";
  const seed = text.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return {
    latitude: 40.68 + (seed % 50) / 1000,
    longitude: -73.98 + (seed % 70) / 1000,
  };
}

export default function LiveServiceScreen() {
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const colorScheme = useColorScheme();
  const activeTheme = getTheme(colorScheme);
  const styles = createStyles(activeTheme);
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const destination = coordinateFromText(booking?.homeAccessNotes || booking?.areaLabel);
  const origin = {
    latitude: destination.latitude + 0.026,
    longitude: destination.longitude - 0.032,
  };

  useEffect(() => {
    const unsubscribe = subscribeToBookingsForCurrentUser((bookings) => {
      setBooking(bookings.find((item) => item.id === params.bookingId) || null);
    });

    return () => unsubscribe();
  }, [params.bookingId]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
    >
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={activeTheme.text} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.mapCard}>
        {Platform.OS === "web" ? (
          <>
            <View style={styles.mapGrid} />
            <View style={styles.routeLine} />
            <View style={styles.pinStart}>
              <Ionicons name="restaurant" size={15} color="#FFFFFF" />
            </View>
            <View style={styles.pinEnd}>
              <Ionicons name="home" size={15} color="#FFFFFF" />
            </View>
          </>
        ) : (
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: destination.latitude,
              longitude: destination.longitude,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
          >
            <Marker coordinate={origin} title="Cook starting point" />
            <Marker coordinate={destination} title="Service address" />
            <Polyline coordinates={[origin, destination]} strokeColor={activeTheme.primaryDark} strokeWidth={5} />
          </MapView>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>
          {booking?.deliveryMode === "dispatch" ? "Home address" : "Live direction"}
        </Text>
        <Text style={styles.body}>
          {booking?.deliveryMode === "dispatch"
            ? "Share this address with your dispatch rider. Keep all client messages inside the app."
            : "Use this service view when you are heading out for home cooking or cook delivery."}
        </Text>
        <Text style={styles.addressText}>{booking?.homeAccessNotes || booking?.areaLabel || "Address will appear here."}</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (activeTheme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: activeTheme.bg },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.layout.screenTop,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    backButton: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
    backText: { color: activeTheme.text, fontSize: 15, fontWeight: "800" },
    mapCard: {
      height: 430,
      borderRadius: 34,
      overflow: "hidden",
      backgroundColor: activeTheme.safeSurface,
      borderWidth: 1,
      borderColor: activeTheme.border,
    },
    map: {
      width: "100%",
      height: "100%",
    },
    mapGrid: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.42,
      backgroundColor: activeTheme.surfaceElevated,
    },
    routeLine: {
      position: "absolute",
      left: "22%",
      top: "28%",
      width: "56%",
      height: 7,
      borderRadius: 999,
      backgroundColor: activeTheme.primary,
      transform: [{ rotate: "28deg" }],
    },
    pinStart: {
      position: "absolute",
      left: "18%",
      top: "25%",
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.primaryDark,
    },
    pinEnd: {
      position: "absolute",
      right: "18%",
      bottom: "29%",
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: activeTheme.secondaryAccent,
    },
    card: {
      borderRadius: 28,
      backgroundColor: activeTheme.surface,
      borderWidth: 1,
      borderColor: activeTheme.border,
      padding: theme.spacing.lg,
      gap: 10,
    },
    title: { color: activeTheme.text, fontSize: 25, fontWeight: "900" },
    body: { color: activeTheme.textMuted, fontSize: 14, lineHeight: 22 },
    addressText: { color: activeTheme.text, fontSize: 16, lineHeight: 23, fontWeight: "900" },
  });
