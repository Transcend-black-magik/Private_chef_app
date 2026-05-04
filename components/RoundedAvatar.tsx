import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

type RoundedAvatarProps = {
  name: string;
  photoUrl?: string;
  size?: number;
  backgroundColor: string;
  textColor?: string;
};

export default function RoundedAvatar({
  name,
  photoUrl,
  size = 52,
  backgroundColor,
  textColor = "#FFFFFF",
}: RoundedAvatarProps) {
  const radius = size / 2;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor,
        },
      ]}
    >
      {photoUrl ? (
        <Image source={photoUrl} style={styles.image} contentFit="cover" />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize: Math.max(18, size * 0.38) }]}>
          {(name.trim().slice(0, 1) || "?").toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  text: {
    fontWeight: "800",
  },
});
