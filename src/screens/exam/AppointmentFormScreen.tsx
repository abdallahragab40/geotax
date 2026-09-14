// تحديد موعد معاينة مسبق
import React, { useLayoutEffect, useState } from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Field } from "../../components/Field";
import TaxpayerSearchPicker from "../../components/TaxpayerSearchPicker";
import { createAppointment } from "../../data/exam";
import { Taxpayer } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";

export default function AppointmentFormScreen() {
  const navigation = useNavigation<any>();
  const [tp, setTp] = useState<Taxpayer | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "تحديد موعد معاينة" }); }, [navigation]);

  async function save() {
    if (!tp) { Alert.alert("ناقص", "اختر الممول."); return; }
    if (!date.trim()) { Alert.alert("ناقص", "أدخل تاريخ الموعد."); return; }
    setSaving(true);
    try {
      await createAppointment({
        taxpayer_id: tp.id, appointment_date: date.trim(), appointment_time: time.trim(),
        notes: notes.trim(), status: "مجدول",
      });
      Alert.alert("تم", "تم تحديد الموعد وإشعار الممول.");
      navigation.goBack();
    } catch (e: any) { Alert.alert("خطأ", e?.message ?? "تعذّر الحفظ."); }
    finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TaxpayerSearchPicker taxpayer={tp} onPick={setTp} />
        {tp && (
          <>
            <Field label="تاريخ المعاينة *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            <Field label="الوقت" value={time} onChangeText={setTime} placeholder="مثال: 10:00 ص" />
            <Field label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="ملاحظات" type="multiline" />
          </>
        )}
      </ScrollView>
      {tp && (
        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="calendar" size={20} color={colors.white} /><Text style={styles.btnText}>حفظ الموعد</Text></>)}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  btn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: "#7C3AED", margin: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
});
