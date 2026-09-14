// الشاشة الرئيسية للمأمور: إدارته فقط + الخريطة + المراسلات
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { DEPARTMENT_LIST } from "../../data/departments";
import { ROLE_LABELS } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";

export default function StaffHomeScreen() {
  const navigation = useNavigation<any>();
  const { profile, signOut } = useAuth();

  // إدارة المأمور حسب دوره
  const dept = DEPARTMENT_LIST.find((d) => d.role === profile?.role);

  function confirmLogout() {
    Alert.alert("تسجيل الخروج", "هل تريد الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: () => signOut() },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.role}>{ROLE_LABELS[profile?.role ?? ""] ?? "موظف"}</Text>
          <Text style={styles.name}>{profile?.full_name || ""}</Text>
        </View>
        <TouchableOpacity onPress={confirmLogout} style={styles.logout}>
          <Ionicons name="log-out-outline" size={24} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {dept ? (
          <TouchableOpacity
            style={[styles.card, { borderRightColor: dept.color }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("DepartmentHome", { deptKey: dept.key })}
          >
            <View style={[styles.cardIcon, { backgroundColor: dept.color }]}>
              <Ionicons name={dept.icon as any} size={26} color={colors.white} />
            </View>
            <Text style={styles.cardTitle}>{dept.title}</Text>
            <Ionicons name="chevron-back" size={22} color={colors.muted} />
          </TouchableOpacity>
        ) : (
          <Text style={styles.none}>لم تُسنَد إليك إدارة بعد. تواصل مع المدير.</Text>
        )}

        <View style={styles.quickRow}>
          <Quick icon="map" color={colors.primary} label="الخريطة" onPress={() => navigation.navigate("Map")} />
          <Quick icon="chatbubbles" color={colors.accent} label="المراسلات" onPress={() => navigation.navigate("Conversations")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Quick({ icon, color, label, onPress }: { icon: string; color: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickCard} activeOpacity={0.85} onPress={onPress}>
      <Ionicons name={icon as any} size={26} color={color} />
      <Text style={styles.quickText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  role: { fontSize: 14, color: colors.muted, textAlign: "right" },
  name: { fontSize: 20, fontWeight: "800", color: colors.text, textAlign: "right" },
  logout: { padding: spacing.sm },
  content: { padding: spacing.lg },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    borderRightWidth: 5,
    ...shadow,
  },
  cardIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "right" },
  none: { color: colors.muted, fontSize: 15, textAlign: "center", marginVertical: spacing.xl },
  quickRow: { flexDirection: "row-reverse", gap: spacing.md, marginTop: spacing.sm },
  quickCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: "center", gap: spacing.sm, ...shadow },
  quickText: { fontSize: 15, fontWeight: "700", color: colors.text },
});
