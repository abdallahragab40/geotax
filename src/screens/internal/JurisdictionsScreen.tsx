// توزيع الاختصاصات (مدير الحاسب الآلي) — هيكل مبدئي
import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, spacing } from "../../theme";

export default function JurisdictionsScreen() {
  const navigation = useNavigation<any>();
  useLayoutEffect(() => { navigation.setOptions({ title: "توزيع الاختصاصات" }); }, [navigation]);

  return (
    <View style={styles.container}>
      <Ionicons name="git-network-outline" size={64} color={colors.border} />
      <Text style={styles.title}>توزيع الاختصاصات</Text>
      <Text style={styles.sub}>
        تحديد الاختصاص الجغرافي + القطاع + تعديل الاختصاص.{"\n"}
        قيد التطوير في المرحلة التالية حسب التفاصيل التي سترسلها.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: spacing.xl },
  title: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: spacing.md },
  sub: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: spacing.sm, lineHeight: 22 },
});
