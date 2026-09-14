// شاشة "أعمال شعبة الحصر" — 4 أقسام: فتح ملف على الطبيعة، الطلبات، المهام الواردة، أعمال أخرى
import React, { useLayoutEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, radius, spacing, shadow } from "../../theme";

export default function SurveyorWorksScreen() {
  const navigation = useNavigation<any>();

  useLayoutEffect(() => { navigation.setOptions({ title: "أعمال شعبة الحصر" }); }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Section
          icon="add-circle" color="#0E7C66"
          title="فتح ملف حصر على الطبيعة"
          desc="معاينة ميدانية + موقع جغرافي + صور ومرفقات"
          onPress={() => navigation.navigate("EnumerationForm")}
        />
        <Section
          icon="clipboard" color="#7C3AED"
          title="الطلبات"
          desc="طلبات الممولين الواردة (إضافة فرع، تغيير عنوان، بطاقة...)"
          onPress={() => navigation.navigate("RequestsList", { department: "survey" })}
        />
        <Section
          icon="git-network" color="#D97706"
          title="المهام الواردة"
          desc="المهام المرسلة من مراجع الحصر مع خطوط السير"
          onPress={() => navigation.navigate("MyTasks")}
        />
        <Section
          icon="layers" color="#2563EB"
          title="أعمال الحصر الأخرى"
          desc="إضافة نشاط فرعي / مخزن / فرع / تغيير عنوان"
          onPress={() => navigation.navigate("OtherWorks")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ icon, color, title, desc, onPress }: { icon: string; color: string; title: string; desc: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.card, { borderRightColor: color }]} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={26} color={colors.white} />
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
  iconWrap: { width: 50, height: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "right" },
  desc: { fontSize: 13, color: colors.muted, textAlign: "right", marginTop: 2 },
});
