// إخطار توقف جزئي — يحدّث حالة النشاط ويلوّن الخريطة بالأصفر
import React, { useLayoutEffect, useState } from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Field } from "../../components/Field";
import PhotoPicker from "../../components/PhotoPicker";
import TaxpayerSearchPicker from "../../components/TaxpayerSearchPicker";
import { uploadPhotos } from "../../data/storage";
import { createPartialStop } from "../../data/exam";
import { Taxpayer } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";

export default function PartialStopFormScreen() {
  const navigation = useNavigation<any>();
  const [tp, setTp] = useState<Taxpayer | null>(null);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "إخطار توقف جزئي" }); }, [navigation]);

  async function save() {
    if (!tp) { Alert.alert("ناقص", "اختر الممول."); return; }
    if (!date.trim() || !reason.trim()) { Alert.alert("ناقص", "أدخل التاريخ والسبب."); return; }
    setSaving(true);
    try {
      const urls = photos.length ? await uploadPhotos(photos) : [];
      await createPartialStop({
        taxpayer_id: tp.id, stop_date: date.trim(),
        reason: reason.trim(), notes: notes.trim(), photos: urls,
      });
      Alert.alert("تم", "تم تسجيل التوقف الجزئي وتحديث الخريطة (أصفر).");
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
            <Field label="تاريخ التوقف *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            <Field label="سبب التوقف *" value={reason} onChangeText={setReason} placeholder="السبب" type="multiline" />
            <Field label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="ملاحظات إضافية" type="multiline" />
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
          {saving ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="pause-circle" size={20} color={colors.white} /><Text style={styles.btnText}>تسجيل توقف جزئي</Text></>)}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  btn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: "#D97706", margin: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
});
