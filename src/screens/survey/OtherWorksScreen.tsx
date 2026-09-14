// أعمال الحصر الأخرى — اختيار النوع (فرع/مخزن/نشاط فرعي/تغيير عنوان) → بحث بالرقم → نموذج
import React, { useLayoutEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { Taxpayer } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";

type WorkType = "sub_activity" | "warehouse" | "branch" | "address_change";
const WORKS: { key: WorkType; label: string; icon: string; color: string }[] = [
  { key: "sub_activity", label: "إضافة نشاط فرعي", icon: "layers", color: "#0E7C66" },
  { key: "warehouse", label: "إضافة مخزن", icon: "cube", color: "#2563EB" },
  { key: "branch", label: "إضافة فرع", icon: "git-branch", color: "#7C3AED" },
  { key: "address_change", label: "تغيير عنوان", icon: "location", color: "#D97706" },
];

export default function OtherWorksScreen() {
  const navigation = useNavigation<any>();
  const [tax, setTax] = useState("");
  const [found, setFound] = useState<Taxpayer | null>(null);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "أعمال الحصر الأخرى" }); }, [navigation]);

  async function searchByTax() {
    if (!tax.trim()) { Alert.alert("بيانات ناقصة", "أدخل رقم التسجيل."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("taxpayers").select("*").eq("tax_number", tax.trim()).maybeSingle();
      if (error) throw error;
      if (!data) { Alert.alert("غير موجود", "لا يوجد ممول بهذا الرقم."); return; }
      setFound(data as Taxpayer);
    } catch (e: any) { Alert.alert("خطأ", e?.message ?? "تعذّر البحث."); }
    finally { setLoading(false); }
  }

  function openWork(t: WorkType) {
    if (!found) { Alert.alert("ابحث أولًا", "ابحث عن ممول بالرقم الضريبي."); return; }
    if (t === "address_change") {
      navigation.navigate("ModificationForm", { taxpayerId: found.id, modType: "تغيير عنوان" });
    } else if (t === "sub_activity") {
      navigation.navigate("AddSubActivity", { taxpayerId: found.id });
    } else if (t === "warehouse") {
      navigation.navigate("AddWarehouse", { taxpayerId: found.id });
    } else if (t === "branch") {
      navigation.navigate("AddBranch", { taxpayerId: found.id });
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        <Text style={styles.label}>رقم التسجيل الضريبي</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="ابحث عن ممول بالرقم"
            placeholderTextColor={colors.muted}
            value={tax}
            onChangeText={setTax}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.btn} onPress={searchByTax} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.white} /> : <Ionicons name="search" size={18} color={colors.white} />}
          </TouchableOpacity>
        </View>

        {found && (
          <View style={styles.foundCard}>
            <Text style={styles.foundName}>{found.name}</Text>
            <Text style={styles.foundMeta}>الرقم: {found.tax_number}</Text>
            {!!found.activity && <Text style={styles.foundMeta}>النشاط: {found.activity}</Text>}
            {!!found.address && <Text style={styles.foundMeta}>{found.address}</Text>}
          </View>
        )}

        <Text style={styles.heading}>اختر نوع العمل</Text>
        <View style={styles.grid}>
          {WORKS.map((w) => (
            <TouchableOpacity key={w.key} style={[styles.tile, !found && { opacity: 0.4 }]} disabled={!found} onPress={() => openWork(w.key)}>
              <View style={[styles.iconWrap, { backgroundColor: w.color }]}>
                <Ionicons name={w.icon as any} size={26} color={colors.white} />
              </View>
              <Text style={styles.tileTitle}>{w.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs },
  row: { flexDirection: "row-reverse", gap: spacing.sm, marginBottom: spacing.md },
  input: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, fontSize: 15, color: colors.text, textAlign: "right" },
  btn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, borderRadius: radius.md, alignItems: "center", justifyContent: "center", height: 48, ...shadow },
  foundCard: { backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  foundName: { fontSize: 16, fontWeight: "800", color: colors.primaryDark, textAlign: "right" },
  foundMeta: { fontSize: 13, color: colors.text, textAlign: "right", marginTop: 2 },
  heading: { fontSize: 15, fontWeight: "800", color: colors.text, textAlign: "right", marginTop: spacing.md, marginBottom: spacing.sm },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.md, justifyContent: "flex-start" },
  tile: { width: "47%", aspectRatio: 1, backgroundColor: colors.surface, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: spacing.sm, ...shadow },
  iconWrap: { width: 56, height: 56, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  tileTitle: { fontSize: 14, fontWeight: "800", color: colors.text, textAlign: "center", paddingHorizontal: spacing.sm },
});
