// شاشة رئيس المأمورية — الأخبار، إدارة المستخدمين، إدارة الملفات، الخريطة، التقارير، الملف الشخصي
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { getOffice } from "../../data/offices";
import { Office } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import NotificationBell from "../../components/NotificationBell";

export default function OfficeHeadHomeScreen() {
  const navigation = useNavigation<any>();
  const { profile } = useAuth();
  const [office, setOffice] = useState<Office | null>(null);

  useEffect(() => {
    if (profile?.office_id) getOffice(profile.office_id).then(setOffice);
  }, [profile?.office_id]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.role}>رئيس المأمورية</Text>
          <Text style={styles.name}>{profile?.full_name || "—"}</Text>
          {office && <Text style={styles.office}>{office.name} — {office.governorate}</Text>}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
            <Ionicons name="person-circle" size={40} color={colors.primary} />
          </TouchableOpacity>
          <NotificationBell />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        <Tile icon="newspaper" color="#0E7C66" title="آخر الأخبار" onPress={() => navigation.navigate("NewsList")} />
        <Tile icon="people" color="#7C3AED" title="إدارة المستخدمين" onPress={() => navigation.navigate("ManageEmployees")} />
        <Tile icon="folder" color="#2563EB" title="إدارة الملفات" onPress={() => navigation.navigate("FileManagement")} />
        <Tile icon="map" color="#0891B2" title="الخريطة التفاعلية" onPress={() => navigation.navigate("Map")} />
        <Tile icon="bar-chart" color="#0E7490" title="التقارير" onPress={() => navigation.navigate("Reports")} />
        <Tile icon="chatbubbles" color="#0D9488" title="المراسلات" onPress={() => navigation.navigate("Conversations")} />
        <Tile icon="alert-circle" color="#DB2777" title="الشكاوى" onPress={() => navigation.navigate("ComplaintsList")} />
        <Tile icon="document-text" color="#475569" title="سجل العمليات" onPress={() => navigation.navigate("AuditLog")} />
        <Tile icon="key" color="#B45309" title="استعادة كلمات المرور" onPress={() => navigation.navigate("PasswordResets")} />
        <Tile icon="person" color="#D97706" title="الملف الشخصي" onPress={() => navigation.navigate("Profile")} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ icon, color, title, onPress }: { icon: string; color: string; title: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tile} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={28} color={colors.white} />
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  role: { fontSize: 14, color: colors.muted, textAlign: "right" },
  name: { fontSize: 20, fontWeight: "800", color: colors.text, textAlign: "right" },
  office: { fontSize: 13, color: colors.primary, fontWeight: "700", textAlign: "right", marginTop: 2 },
  grid: { padding: spacing.lg, flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.md, justifyContent: "flex-start" },
  tile: { width: "47%", aspectRatio: 1, backgroundColor: colors.surface, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: spacing.sm, ...shadow },
  iconWrap: { width: 60, height: 60, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  tileTitle: { fontSize: 15, fontWeight: "800", color: colors.text, textAlign: "center" },
});
