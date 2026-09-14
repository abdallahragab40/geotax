// أعمال الفحص — تُفلتر البلاطات حسب دور المستخدم
// - المأمور (examiner): كل الأدوات (تنفيذ ميداني)
// - المراجع (exam_reviewer): كل الأدوات + المهام (يُنفّذ ويوزّع)
// - المدير (exam_manager): "المهام قيد المراجعة" فقط + "الطلبات" + "التقارير"
import React, { useLayoutEffect } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { colors, radius, spacing, shadow } from "../../theme";

type Item = { icon: string; color: string; title: string; desc: string; route: string };

const ALL_ITEMS: Item[] = [
  { icon: "clipboard", color: "#0E7C66", title: "المعاينات", desc: "تنفيذ معاينة ميدانية + موقع فحص مستقل", route: "InspectionForm" },
  { icon: "person-add", color: "#2563EB", title: "طلب حضور", desc: "إخطار الممول بالحضور للمأمورية", route: "AttendanceRequestForm" },
  { icon: "calendar", color: "#7C3AED", title: "تحديد موعد معاينة", desc: "تحديد موعد مسبق وإخطار الممول", route: "AppointmentForm" },
  { icon: "pause-circle", color: "#D97706", title: "إخطار توقف جزئي", desc: "تحديث الحالة + علامة صفراء على الخريطة", route: "PartialStopForm" },
  { icon: "close-circle", color: "#DC2626", title: "إخطار توقف نهائي", desc: "تحديث الحالة + علامة حمراء على الخريطة", route: "FinalStopForm" },
  { icon: "git-network", color: "#0891B2", title: "المهام الواردة", desc: "مهام مرسلة من مراجع الفحص + خطوط السير", route: "MyTasks" },
];

const MANAGER_ITEMS: Item[] = [
  { icon: "checkmark-done", color: "#7C3AED", title: "المهام قيد المراجعة", desc: "المعاينات المُقدّمة من المأمورين للاعتماد", route: "MyAssignedTasks" },
  { icon: "clipboard", color: "#0891B2", title: "الطلبات", desc: "طلبات الممولين لإدارة الفحص", route: "RequestsList" },
  { icon: "bar-chart", color: "#0E7490", title: "التقارير", desc: "سحب تقرير وتصديره Excel", route: "Reports" },
];

export default function ExaminerWorksScreen() {
  const navigation = useNavigation<any>();
  const { profile } = useAuth();
  const role = profile?.role || "";
  const isManager = role === "exam_manager";
  const items = isManager ? MANAGER_ITEMS : ALL_ITEMS;

  useLayoutEffect(() => {
    navigation.setOptions({ title: isManager ? "المراجعة والاعتماد" : "أعمال الفحص" });
  }, [navigation, isManager]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {items.map((it) => (
          <TouchableOpacity key={it.route} style={[styles.card, { borderRightColor: it.color }]}
            onPress={() => {
              if (it.route === "RequestsList") navigation.navigate("RequestsList", { department: "exam" });
              else navigation.navigate(it.route);
            }} activeOpacity={0.85}>
            <View style={[styles.iconWrap, { backgroundColor: it.color }]}>
              <Ionicons name={it.icon as any} size={26} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{it.title}</Text>
              <Text style={styles.desc}>{it.desc}</Text>
            </View>
            <Ionicons name="chevron-back" size={22} color={colors.muted} />
          </TouchableOpacity>
        ))}
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
  desc: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 2 },
});
