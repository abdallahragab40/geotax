// طلب حضور — إخطار الممول بالحضور للمأمورية
import React, { useLayoutEffect, useState } from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Field } from "../../components/Field";
import TaxpayerSearchPicker from "../../components/TaxpayerSearchPicker";
import { createAttendanceRequest } from "../../data/exam";
import { Taxpayer } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";

export default function AttendanceRequestFormScreen() {
  const navigation = useNavigation<any>();
  const [tp, setTp] = useState<Taxpayer | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "طلب حضور" }); }, [navigation]);

  async function save() {
    if (!tp) { Alert.alert("ناقص", "اختر الممول."); return; }
    if (!date.trim() || !reason.trim()) { Alert.alert("ناقص", "أدخل التاريخ والسبب."); return; }
    setSaving(true);
    try {
      await createAttendanceRequest({
        taxpayer_id: tp.id, attend_date: date.trim(), attend_time: time.trim(),
        reason: reason.trim(), notes: notes.trim(), status: "مرسل",
      });
      Alert.alert("تم", "تم إرسال طلب الحضور وإشعار الممول.");
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
            <Field label="تاريخ الحضور *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            <Field label="وقت الحضور" value={time} onChangeText={setTime} placeholder="مثال: 10:00 ص" />
            <Field label="سبب الطلب *" value={reason} onChangeText={setReason} placeholder="السبب" type="multiline" />
            <Field label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="ملاحظات" type="multiline" />
          </>
        )}
      </ScrollView>
      {tp && (
        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="send" size={20} color={colors.white} /><Text style={styles.btnText}>إرسال الطلب</Text></>)}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  btn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: "#2563EB", margin: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
});
