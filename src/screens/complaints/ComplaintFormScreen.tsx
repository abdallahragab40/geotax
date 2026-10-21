// نموذج تقديم شكوى — متاح للجمهور بدون تسجيل دخول
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Field } from "../../components/Field";
import LocationCard, { Coords } from "../../components/LocationCard";
import PhotoPicker from "../../components/PhotoPicker";
import { uploadPhotos } from "../../data/storage";
import { createComplaint } from "../../data/requests";
import { listOffices } from "../../data/offices";
import { Office } from "../../types";
import { colors, spacing, radius, shadow } from "../../theme";
import type { AuthStackParamList } from "../../navigation";
import { Modal, FlatList } from "react-native";

type Props = NativeStackScreenProps<AuthStackParamList, "Complaint">;

export default function ComplaintFormScreen({ navigation }: Props) {
  const [office, setOffice] = useState<Office | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [accused, setAccused] = useState("");
  const [activity, setActivity] = useState("");
  const [address, setAddress] = useState("");
  const [details, setDetails] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    listOffices().then(setOffices).catch(() => {});
  }, []);

  async function submit() {
    if (!office) {
      Alert.alert("بيانات ناقصة", "اختر المأمورية المختصة أولًا.");
      return;
    }
    if (!name.trim() || !nationalId.trim() || !phone.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل الاسم والرقم القومي ورقم الهاتف.");
      return;
    }
    if (!/^\d{14}$/.test(nationalId.trim())) {
      Alert.alert("رقم قومي غير صحيح", "الرقم القومي يتكون من 14 رقمًا.");
      return;
    }
    if (!/^01\d{9}$/.test(phone.trim())) {
      Alert.alert("رقم هاتف غير صحيح", "أدخل رقم هاتف محمول مصري من 11 رقمًا يبدأ بـ 01.");
      return;
    }
    if (!accused.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل اسم المشكو في حقه.");
      return;
    }
    setSaving(true);
    try {
      const photoUrls = photos.length ? await uploadPhotos(photos) : [];
      const code = await createComplaint({
        office_id: office.id,
        complainant_name: name.trim(),
        complainant_national_id: nationalId.trim(),
        complainant_phone: phone.trim(),
        accused_name: accused.trim(),
        activity: activity.trim(),
        address: address.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        details: details.trim(),
        photos: photoUrls,
        status: "جديد",
      });
      setSubmittedCode(code);
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "حاول مجددًا.");
    } finally { setSaving(false); }
  }

  async function copyCode() {
    if (!submittedCode) return;
    await Clipboard.setStringAsync(submittedCode);
    setCopied(true);
  }

  // شاشة التأكيد: رقم الشكوى + نسخ + متابعة
  if (submittedCode) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.done}>
          <Ionicons name="checkmark-circle" size={88} color={colors.primary} />
          <Text style={styles.doneTitle}>تم استلام الشكوى</Text>
          <Text style={styles.doneDesc}>
            احتفظ برقم الشكوى. ستحتاجه مع رقم موبايلك لمتابعة شكواك ومعرفة الرد عليها.
          </Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>رقم الشكوى</Text>
            <Text selectable style={styles.codeText}>{submittedCode}</Text>
          </View>
          <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
            <Ionicons name={copied ? "checkmark" : "copy-outline"} size={22} color={colors.primary} />
            <Text style={styles.copyText}>{copied ? "تم النسخ" : "نسخ رقم الشكوى"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.replace("Track", { kind: "complaint", code: submittedCode })}
          >
            <Ionicons name="search" size={20} color={colors.white} />
            <Text style={styles.btnText}>متابعة الشكوى</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeLink} onPress={() => navigation.popToTop()}>
            <Text style={styles.homeLinkText}>العودة للرئيسية</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تقديم شكوى</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.group}>المأمورية المختصة *</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setPickerOpen(true)}>
            <Text style={styles.pickerText}>
              {office ? `${office.name} — ${office.governorate}` : "اختر المأمورية المختصة"}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.muted} />
          </TouchableOpacity>

          <Text style={styles.group}>بيانات مقدّم الشكوى</Text>
          <Field label="الاسم" value={name} onChangeText={setName} placeholder="اسمك" />
          <Field label="الرقم القومي" value={nationalId} onChangeText={setNationalId} placeholder="الرقم القومي" type="number" />
          <Field label="رقم الهاتف" value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" type="number" />

          <Text style={styles.group}>بيانات الشكوى</Text>
          <Field label="اسم المشكو في حقه" value={accused} onChangeText={setAccused} placeholder="الاسم / النشاط" />
          <Field label="النشاط" value={activity} onChangeText={setActivity} placeholder="نوع النشاط" />
          <Field label="العنوان" value={address} onChangeText={setAddress} placeholder="العنوان" type="multiline" />
          <Field label="تفاصيل الشكوى" value={details} onChangeText={setDetails} placeholder="اشرح الشكوى" type="multiline" />
          <Text style={styles.label}>الموقع الجغرافي</Text>
          <LocationCard coords={coords} onChange={setCoords} />
          <PhotoPicker
            existing={[]}
            pending={photos}
            onAddPending={(uris) => setPhotos((p) => [...p, ...uris])}
            onRemoveExisting={() => {}}
            onRemovePending={(uri) => setPhotos((p) => p.filter((u) => u !== uri))}
          />
        </ScrollView>
        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="send" size={18} color={colors.white} /><Text style={styles.btnText}>إرسال الشكوى</Text></>)}
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>اختر المأمورية المختصة</Text>
            <FlatList
              data={offices}
              keyExtractor={(o) => String(o.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.officeRow} onPress={() => { setOffice(item); setPickerOpen(false); }}>
                  <Text style={styles.officeText}>{item.name} — {item.governorate}</Text>
                  <Text style={styles.officeCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setPickerOpen(false)}>
              <Text style={styles.modalCloseText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  content: { padding: spacing.lg, paddingTop: 0 },
  group: { fontSize: 15, fontWeight: "800", color: colors.primary, textAlign: "right", marginBottom: spacing.sm, marginTop: spacing.sm },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs },
  btn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: "#DB2777", margin: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  picker: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, marginBottom: spacing.md,
  },
  pickerText: { color: colors.text, fontSize: 15, fontWeight: "600", textAlign: "right", flex: 1 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.md },
  officeRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  officeText: { color: colors.text, fontSize: 15, flex: 1, textAlign: "right" },
  officeCode: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  modalClose: { marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.sm },
  modalCloseText: { color: colors.muted, fontWeight: "700" },
  done: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  doneTitle: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: spacing.md },
  doneDesc: { fontSize: 16, color: colors.muted, textAlign: "center", lineHeight: 26, marginTop: spacing.sm },
  codeBox: { alignSelf: "stretch", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.primary, borderStyle: "dashed", padding: spacing.lg, marginTop: spacing.xl, ...shadow },
  codeLabel: { fontSize: 15, fontWeight: "700", color: colors.muted },
  codeText: { fontSize: 32, fontWeight: "800", color: colors.primaryDark, marginTop: spacing.xs, letterSpacing: 2 },
  copyBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, alignSelf: "stretch", height: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface, marginTop: spacing.lg },
  copyText: { color: colors.primary, fontWeight: "800", fontSize: 17 },
  doneBtn: { alignSelf: "stretch", marginHorizontal: 0, height: 58 },
  homeLink: { paddingVertical: spacing.md },
  homeLinkText: { color: colors.muted, fontWeight: "700", fontSize: 16 },
});
