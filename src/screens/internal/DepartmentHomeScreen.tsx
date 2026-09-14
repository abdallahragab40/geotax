// شاشة إدارة عامة (حصر/فحص): البلاطات تُفلتر حسب دور المستخدم
// - المأمور (surveyor/examiner): يرى الأدوات الميدانية (حصر ميداني، إضافات)
// - المراجع (survey_reviewer/exam_reviewer): يرى نفس المأمور + مراجعة
// - المدير (survey_manager/exam_manager): يرى للمراجعة والاعتماد فقط
import React, { useLayoutEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { DEPARTMENTS } from "../../data/departments";
import { useAuth } from "../../context/AuthContext";
import { colors, radius, spacing, shadow } from "../../theme";

type R = RouteProp<{ params: { deptKey: string } }, "params">;

export default function DepartmentHomeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<R>();
  const dept = DEPARTMENTS[route.params.deptKey];
  const isSurvey = dept.key === "survey";
  const { profile } = useAuth();
  const role = profile?.role || "";

  // الأدوار التي تنفّذ عملًا ميدانيًا (لها الحق بالحصر الميداني)
  const isFieldWorker = role === "surveyor" || role === "examiner";
  // المراجع يستطيع رؤية الأدوات لكنه لا يُنفّذ ميدانيًا بشكل أساسي
  const isReviewer = role === "survey_reviewer" || role === "exam_reviewer";
  // المدير للمراجعة والاعتماد فقط
  const isManager = role === "survey_manager" || role === "exam_manager";

  useLayoutEffect(() => {
    navigation.setOptions({ title: dept.title });
  }, [navigation, dept]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card icon="people" color="#0E7C66" title="الممولون" desc="جميع الممولين + بحث + موقع"
          onPress={() => navigation.navigate("TaxpayersList", { mode: "view" })} />

        {isSurvey && (isFieldWorker || isReviewer) && (
          <>
            <Card icon="add-circle" color="#0891B2" title="حصر ميداني" desc="تسجيل نشاط جديد على مرحلتين"
              onPress={() => navigation.navigate("EnumerationForm")} />
            <Card icon="create" color="#D97706" title="إضافات وتعديلات" desc="تغيير عنوان / فرع / مخزن / نشاط فرعي"
              onPress={() => navigation.navigate("TaxpayersList", { mode: "modify" })} />
          </>
        )}

        {!isSurvey && (
          <Card icon={dept.icon} color={dept.color} title={`سجلّات ${dept.title.replace("إدارة ", "")}`} desc="إضافة وعرض السجلات"
            onPress={() => navigation.navigate("DeptList", { deptKey: dept.key })} />
        )}

        {isManager && (
          <Card icon="checkmark-done" color="#7C3AED" title="المهام قيد المراجعة" desc="مراجعة أعمال المأمورين والمراجعين"
            onPress={() => navigation.navigate("DeptList", { deptKey: dept.key })} />
        )}

        <Card icon="clipboard" color="#7C3AED" title="الطلبات" desc="طلبات الممولين الواردة لهذه الإدارة"
          onPress={() => navigation.navigate("RequestsList", { department: dept.key })} />
        <Card icon="bar-chart" color="#0E7490" title="التقارير" desc="سحب تقرير وتصديره Excel"
          onPress={() => navigation.navigate("Reports")} />
        <Card icon="map" color="#2563EB" title="الخريطة" desc="مواقع الممولين"
          onPress={() => navigation.navigate("Map")} />
        <Card icon="chatbubbles" color="#0D9488" title="المراسلات" desc="التواصل مع الممولين والزملاء"
          onPress={() => navigation.navigate("Conversations")} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ icon, color, title, desc, onPress }: { icon: string; color: string; title: string; desc: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.card, { borderRightColor: color }]} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={24} color={colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-back" size={22} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  card: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md, borderRightWidth: 5, ...shadow },
  icon: { width: 46, height: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "right" },
  desc: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 2 },
});
