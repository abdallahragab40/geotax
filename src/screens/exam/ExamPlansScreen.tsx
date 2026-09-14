// خطة الفحص (يومية/أسبوعية/شهرية) — هيكل مبدئي
import React, { useLayoutEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, radius, spacing, shadow } from "../../theme";

const PLANS = [
  { key: "daily", icon: "calendar", color: "#0E7C66", label: "خطة يومية", desc: "تحديد الملفات والأولويات وعدد المعاينات" },
  { key: "weekly", icon: "calendar-outline", color: "#2563EB", label: "خطة أسبوعية", desc: "توزيع الملفات + المستهدف الأسبوعي" },
  { key: "monthly", icon: "calendar-clear", color: "#7C3AED", label: "خطة شهرية", desc: "تحديد المستهدف الشهري ومتابعة التنفيذ" },
];

export default function ExamPlansScreen() {
  const navigation = useNavigation<any>();
  useLayoutEffect(() => { navigation.setOptions({ title: "خطة الفحص" }); }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {PLANS.map((p) => (
          <TouchableOpacity key={p.key} style={[styles.card, { borderRightColor: p.color }]}
            onPress={() => navigation.navigate("AssignTask", { taskType: "exam", planType: p.key })}>
            <View style={[styles.iconWrap, { backgroundColor: p.color }]}>
              <Ionicons name={p.icon as any} size={26} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{p.label}</Text>
              <Text style={styles.desc}>{p.desc}</Text>
            </View>
            <Ionicons name="chevron-back" size={22} color={colors.muted} />
          </TouchableOpacity>
        ))}
        <View style={styles.note}>
          <Ionicons name="information-circle" size={18} color={colors.muted} />
          <Text style={styles.noteText}>
            عبر "إسناد المهام" يمكنك توزيع الملفات على مأموري الفحص وتحديد المواعيد والأولويات وخط السير.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  card: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md, borderRightWidth: 5, ...shadow },
  iconWrap: { width: 50, height: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "right" },
  desc: { fontSize: 13, color: colors.muted, textAlign: "right", marginTop: 2 },
  note: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.sm, backgroundColor: colors.primaryLight, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
  noteText: { flex: 1, color: colors.primaryDark, fontSize: 13, textAlign: "right", lineHeight: 20 },
});
