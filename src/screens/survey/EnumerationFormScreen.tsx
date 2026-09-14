// الحصر الميداني — المرحلة 1: تسجيل نشاط جديد (بدون رقم ضريبي)
import React, { useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Field } from "../../components/Field";
import LocationCard, { Coords } from "../../components/LocationCard";
import PhotoPicker from "../../components/PhotoPicker";
import { createTaxpayerFile } from "../../data/registry";
import { uploadPhotos } from "../../data/storage";
import { colors, spacing, radius, shadow } from "../../theme";
import type { InternalStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<InternalStackParamList, "EnumerationForm">;

export default function EnumerationFormScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [activity, setActivity] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [summary, setSummary] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "حصر ميداني — تسجيل نشاط" });
  }, [navigation]);

  async function save() {
    if (!name.trim()) {
      Alert.alert("بيانات ناقصة", "اسم النشاط مطلوب.");
      return;
    }
    setSaving(true);
    try {
      const photoUrls = photos.length ? await uploadPhotos(photos) : [];
      const tp = await createTaxpayerFile({
        name: name.trim(),
        national_id: nationalId.trim(),
        activity: activity.trim(),
        address: address.trim(),
        start_date: startDate.trim(),
        summary: summary.trim(),
        photos: photoUrls,
        source: "survey",
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        status: "قيد الحصر",
      });
      Alert.alert(
        "تم تسجيل النشاط",
        "تم حفظ المرحلة الأولى. لإكمال التسجيل أدخل الرقم الضريبي من ملف الممول.",
        [{ text: "فتح الملف", onPress: () => navigation.replace("TaxpayerFile", { id: tp.id }) }]
      );
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "حاول مجددًا.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.stage}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <Text style={styles.stageText}>المرحلة 1: بيانات النشاط (الرقم الضريبي يُضاف لاحقًا)</Text>
          </View>
          <LocationCard coords={coords} onChange={setCoords} />
          <Field label="اسم النشاط / صاحب النشاط *" value={name} onChangeText={setName} placeholder="الاسم" />
          <Field label="الرقم القومي" value={nationalId} onChangeText={setNationalId} placeholder="الرقم القومي" type="number" />
          <Field label="النشاط" value={activity} onChangeText={setActivity} placeholder="نوع النشاط" />
          <Field label="العنوان" value={address} onChangeText={setAddress} placeholder="العنوان" type="multiline" />
          <Field label="بداية النشاط" value={startDate} onChangeText={setStartDate} placeholder="يوم/شهر/سنة" />
          <Field label="ملخص المعاينة" value={summary} onChangeText={setSummary} placeholder="ملخص ما تمت معاينته على الطبيعة" type="multiline" />
          <PhotoPicker
            existing={[]}
            pending={photos}
            onAddPending={(uris) => setPhotos((p) => [...p, ...uris])}
            onRemoveExisting={() => {}}
            onRemovePending={(uri) => setPhotos((p) => p.filter((u) => u !== uri))}
          />
        </ScrollView>
        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : (
            <><Ionicons name="save" size={20} color={colors.white} /><Text style={styles.btnText}>حفظ النشاط</Text></>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  stage: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginBottom: spacing.md },
  stageText: { fontSize: 13, fontWeight: "700", color: colors.primary, textAlign: "right", flex: 1 },
  btn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, margin: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
});
