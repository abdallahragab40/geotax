// إضافة/تعديل خبر — تحديد الفئة المستهدفة
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Field } from "../../components/Field";
import { supabase } from "../../lib/supabase";
import { createNews, updateNews } from "../../data/news";
import { ROLE_LABELS, STAFF_ROLES } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { colors, radius, spacing, shadow } from "../../theme";

type R = RouteProp<{ params: { id?: number } }, "params">;

const AUDIENCES = [
  { key: "all", label: "الجميع" },
  { key: "office", label: "مأموريتي فقط" },
  { key: "role", label: "دور محدد" },
];

export default function NewsFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<R>();
  const { profile } = useAuth();
  const editId = route.params?.id;
  const isAdmin = profile?.role === "admin";
  // النشر للجميع للإدارة العليا فقط؛ رئيس المأمورية ومدير الحاسب داخل مأموريتهم
  const audiences = isAdmin ? AUDIENCES.filter((a) => a.key !== "office") : AUDIENCES.filter((a) => a.key !== "all");
  const isEdit = typeof editId === "number";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<"all" | "office" | "role">(isAdmin ? "all" : "office");
  const [targetRole, setTargetRole] = useState<string>("surveyor");
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: isEdit ? "تعديل خبر" : "إضافة خبر" }); }, [navigation, isEdit]);

  useEffect(() => {
    if (isEdit && editId) {
      supabase.from("news").select("*").eq("id", editId).maybeSingle().then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setContent(data.content);
          setAudience(data.audience);
          if (data.target_role) setTargetRole(data.target_role);
        }
      });
    }
  }, [isEdit, editId]);

  async function save() {
    if (!title.trim() || !content.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل العنوان والمحتوى.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        content: content.trim(),
        audience,
        office_id: isAdmin ? null : profile?.office_id ?? null,
        target_role: audience === "role" ? targetRole : null,
      };
      if (isEdit) await updateNews(editId!, payload);
      else await createNews(payload);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر الحفظ.");
    } finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Field label="عنوان الخبر *" value={title} onChangeText={setTitle} placeholder="العنوان" />
        <Field label="المحتوى *" value={content} onChangeText={setContent} placeholder="نص الخبر" type="multiline" />

        <Text style={styles.label}>الفئة المستهدفة</Text>
        <View style={styles.chips}>
          {audiences.map((a) => {
            const active = audience === a.key;
            return (
              <TouchableOpacity key={a.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setAudience(a.key as any)}>
                <Text style={[styles.chipText, active && { color: colors.white }]}>{a.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {audience === "role" && (
          <>
            <Text style={styles.label}>الدور</Text>
            <View style={styles.chips}>
              {STAFF_ROLES.filter((r) => r !== "employee").map((r) => {
                const active = targetRole === r;
                return (
                  <TouchableOpacity key={r} style={[styles.chip, active && styles.chipActive]} onPress={() => setTargetRole(r)}>
                    <Text style={[styles.chipText, active && { color: colors.white }]}>{ROLE_LABELS[r]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
      <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="checkmark-circle" size={20} color={colors.white} /><Text style={styles.btnText}>حفظ الخبر</Text></>)}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs, marginTop: spacing.sm },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  btn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, margin: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
});
