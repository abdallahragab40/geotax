// نموذج معاينة فحص — يحفظ موقع الفحص مستقلًا عن موقع الحصر
import React, { useLayoutEffect, useState } from "react";
import {
  ScrollView, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, View,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Field } from "../../components/Field";
import LocationCard, { Coords } from "../../components/LocationCard";
import PhotoPicker from "../../components/PhotoPicker";
import TaxpayerSearchPicker from "../../components/TaxpayerSearchPicker";
import { uploadPhotos } from "../../data/storage";
import { createInspection } from "../../data/exam";
import { Taxpayer } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";

export default function InspectionFormScreen() {
  const navigation = useNavigation<any>();
  const [tp, setTp] = useState<Taxpayer | null>(null);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "معاينة فحص" }); }, [navigation]);

  async function save() {
    if (!tp) { Alert.alert("بيانات ناقصة", "اختر الممول أولًا."); return; }
    if (!date.trim()) { Alert.alert("بيانات ناقصة", "أدخل تاريخ المعاينة."); return; }
    setSaving(true);
    try {
      const urls = photos.length ? await uploadPhotos(photos) : [];
      await createInspection({
        taxpayer_id: tp.id,
        inspection_date: date.trim(),
        start_time: start.trim(),
        end_time: end.trim(),
        notes: notes.trim(),
        result: result.trim(),
        exam_latitude: coords?.lat ?? null,
        exam_longitude: coords?.lng ?? null,
        photos: urls,
      });
      Alert.alert("تم", "تم حفظ المعاينة. موقع الفحص محفوظ مستقلًا عن موقع الحصر.");
      navigation.goBack();
    } catch (e: any) { Alert.alert("خطأ", e?.message ?? "تعذّر الحفظ."); }
    finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TaxpayerSearchPicker taxpayer={tp} onPick={setTp} />

          {tp && (
            <>
              <View style={styles.surveyBox}>
                <Text style={styles.boxLabel}>بيانات الحصر (للمرجع فقط)</Text>
                {!!tp.activity && <Text style={styles.boxLine}>النشاط: {tp.activity}</Text>}
                {!!tp.address && <Text style={styles.boxLine}>العنوان: {tp.address}</Text>}
                {tp.latitude != null && (
                  <Text style={styles.boxLine}>موقع الحصر: {tp.latitude.toFixed(5)}, {tp.longitude?.toFixed(5)}</Text>
                )}
              </View>

              <Field label="تاريخ المعاينة *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
              <Field label="وقت البدء" value={start} onChangeText={setStart} placeholder="مثال: 10:00 ص" />
              <Field label="وقت الانتهاء" value={end} onChangeText={setEnd} placeholder="مثال: 11:30 ص" />
              <Field label="نتيجة المعاينة" value={result} onChangeText={setResult} placeholder="ملخص النتيجة" />
              <Field label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="ملاحظات المعاينة" type="multiline" />

              <Text style={styles.label}>الموقع الجغرافي الفعلي للمعاينة (مستقل عن موقع الحصر)</Text>
              <LocationCard coords={coords} onChange={setCoords} />

              <PhotoPicker
                existing={[]} pending={photos}
                onAddPending={(u) => setPhotos((p) => [...p, ...u])}
                onRemoveExisting={() => {}}
                onRemovePending={(uri) => setPhotos((p) => p.filter((x) => x !== uri))}
              />
            </>
          )}
        </ScrollView>
        {tp && (
          <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="checkmark-circle" size={20} color={colors.white} /><Text style={styles.btnText}>حفظ المعاينة</Text></>)}
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  surveyBox: { backgroundColor: colors.surface, borderRightWidth: 4, borderRightColor: colors.muted, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  boxLabel: { fontSize: 12, fontWeight: "800", color: colors.muted, textAlign: "right", marginBottom: 4 },
  boxLine: { fontSize: 13, color: colors.text, textAlign: "right", marginTop: 2 },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs, marginTop: spacing.sm },
  btn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, margin: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
});
