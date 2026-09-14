// بطاقة التقاط الموقع الجغرافي (GPS)
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { colors, radius, spacing } from "../theme";
import { formatCoords } from "../utils";

export interface Coords {
  lat: number;
  lng: number;
  acc: number | null;
}

export default function LocationCard({
  coords,
  onChange,
}: {
  coords: Coords | null;
  onChange: (c: Coords) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function capture() {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("إذن الموقع مرفوض", "فعّل إذن الموقع من إعدادات الجهاز.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
    } catch {
      Alert.alert("تعذّر تحديد الموقع", "تأكد من تفعيل GPS وحاول مجددًا.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="navigate" size={18} color={colors.primary} />
        <Text style={styles.title}>الموقع الجغرافي</Text>
      </View>
      <Text style={styles.coords}>
        {coords ? formatCoords(coords.lat, coords.lng) : "لم يُسجّل بعد"}
      </Text>
      {coords?.acc != null && <Text style={styles.acc}>الدقة: ±{Math.round(coords.acc)} م</Text>}
      <TouchableOpacity style={styles.btn} onPress={capture} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <>
            <Ionicons name="locate" size={16} color={colors.primary} />
            <Text style={styles.btnText}>{coords ? "تحديث الموقع" : "التقاط الموقع"}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  header: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs },
  title: { fontWeight: "700", color: colors.primaryDark, fontSize: 14 },
  coords: { fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "right", marginTop: spacing.sm },
  acc: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 2 },
  btn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  btnText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
});
