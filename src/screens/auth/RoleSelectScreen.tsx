// شاشة اختيار نوع المستخدم: موظف أو ممول
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, radius, spacing, shadow } from "../../theme";
import type { AuthStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "RoleSelect">;

export default function RoleSelectScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={require("../../../assets/icon.png")} style={styles.logo} />
        <Text style={styles.title}>GeoTax</Text>
        <Text style={styles.subtitle}>منظومة المعاينات والربط الجغرافي الضريبي</Text>
      </View>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("EmployeeLogin")}
      >
        <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>موظف</Text>
          <Text style={styles.cardDesc}>دخول برقم الحاسب وكلمة المرور</Text>
        </View>
        <Ionicons name="chevron-back" size={22} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("TaxpayerLogin")}
      >
        <Ionicons name="person" size={32} color={colors.accent} />
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>ممول</Text>
          <Text style={styles.cardDesc}>دخول برقم التسجيل الضريبي — ملفك وطلباتك</Text>
        </View>
        <Ionicons name="chevron-back" size={22} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("Complaint")}
      >
        <Ionicons name="alert-circle" size={32} color="#DB2777" />
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>تقديم شكوى</Text>
          <Text style={styles.cardDesc}>متاح للجمهور بدون تسجيل دخول</Text>
        </View>
        <Ionicons name="chevron-back" size={22} color={colors.muted} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: spacing.xl * 1.5 },
  logo: {
    width: 84,
    height: 84,
    borderRadius: radius.lg,
  },
  title: { fontSize: 26, fontWeight: "800", color: colors.text, marginTop: spacing.lg },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: spacing.xs },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "right" },
  cardDesc: { fontSize: 13, color: colors.muted, textAlign: "right", marginTop: 2 },
});
