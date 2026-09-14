// إضافة نشاط فرعي
import React, { useLayoutEffect, useState } from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Field } from "../../components/Field";
import { addSubActivity } from "../../data/survey";
import { colors, radius, spacing, shadow } from "../../theme";

type R = RouteProp<{ params: { taxpayerId: number } }, "params">;

export default function AddSubActivityScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<R>();
  const taxpayerId = route.params.taxpayerId;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "نشاط فرعي" }); }, [navigation]);

  async function save() {
    if (!name.trim()) { Alert.alert("بيانات ناقصة", "اسم النشاط مطلوب."); return; }
    setSaving(true);
    try {
      await addSubActivity({ taxpayer_id: taxpayerId, name: name.trim(), description: description.trim() });
      Alert.alert("تم", "تمت إضافة النشاط الفرعي.");
      navigation.goBack();
    } catch (e: any) { Alert.alert("خطأ", e?.message ?? "تعذّر الحفظ."); }
    finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Field label="اسم النشاط الفرعي *" value={name} onChangeText={setName} placeholder="مثال: مخبز فرعي" />
        <Field label="الوصف" value={description} onChangeText={setDescription} placeholder="وصف النشاط" type="multiline" />
      </ScrollView>
      <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="checkmark-circle" size={20} color={colors.white} /><Text style={styles.btnText}>حفظ</Text></>)}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  btn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, margin: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
});
