// شاشة مؤقتة للميزات القادمة (الطلبات/الشكاوى — مراحل لاحقة)
import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { colors, spacing } from "../theme";

type R = RouteProp<{ params: { title: string } }, "params">;

export default function PlaceholderScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<any>();

  useLayoutEffect(() => {
    navigation.setOptions({ title: route.params.title });
  }, [navigation, route.params.title]);

  return (
    <View style={styles.container}>
      <Ionicons name="construct-outline" size={64} color={colors.border} />
      <Text style={styles.title}>{route.params.title}</Text>
      <Text style={styles.sub}>هذه الميزة قيد التطوير وستتوفّر في التحديث القادم.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: spacing.xl },
  title: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: spacing.md },
  sub: { fontSize: 15, color: colors.muted, textAlign: "center", marginTop: spacing.sm, lineHeight: 24 },
});
