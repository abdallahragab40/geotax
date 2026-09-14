// تفاصيل الطلب ومعالجته (للموظف): الحالة + الموعد + الرد
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StatusChips } from "../../components/Field";
import { getRequest, updateRequest } from "../../data/requests";
import { createTaxpayerFile } from "../../data/registry";
import { openDirections } from "../../data/directions";
import { Request, REQUEST_STATUS, REQUEST_STATUS_COLORS } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime, formatCoords } from "../../utils";

type R = RouteProp<{ params: { id: number } }, "params">;

export default function RequestDetailScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<any>();
  const id = route.params.id;
  const [req, setReq] = useState<Request | null>(null);
  const [status, setStatus] = useState("جديد");
  const [appointment, setAppointment] = useState("");
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "معالجة الطلب" }); }, [navigation]);

  const load = useCallback(async () => {
    const r = await getRequest(id);
    setReq(r);
    if (r) { setStatus(r.status); setAppointment(r.appointment); setResponse(r.response); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save() {
    setSaving(true);
    try {
      await updateRequest(id, { status, appointment: appointment.trim(), response: response.trim() });
      Alert.alert("تم", "تم حفظ المعالجة وإرسالها للممول.");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "حاول مجددًا.");
    } finally { setSaving(false); }
  }

  async function openTaxFile() {
    if (!req) return;
    try {
      const tp = await createTaxpayerFile({
        name: req.name,
        national_id: req.national_id,
        phone: req.phone,
        activity: req.activity,
        address: req.address,
        start_date: req.start_date,
        tax_number: req.tax_number || null,
        latitude: req.latitude,
        longitude: req.longitude,
        source: "request",
        status: "قيد الحصر",
        user_id: req.applicant_id,
        summary: req.details,
      });
      await updateRequest(req.id, { status: "منتهي" });
      navigation.navigate("TaxpayerFile", { id: tp.id });
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر فتح الملف.");
    }
  }

  if (!req) return <SafeAreaView style={styles.container}><Text style={styles.loading}>جارٍ التحميل…</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{req.type}</Text>
        {!!req.name && <Info label="الاسم" value={req.name} />}
        {!!req.national_id && <Info label="الرقم القومي" value={req.national_id} />}
        {!!req.tax_number && <Info label="الرقم الضريبي" value={req.tax_number} />}
        {!!req.phone && <Info label="الهاتف" value={req.phone} />}
        {!!req.activity && <Info label="النشاط" value={req.activity} />}
        {!!req.address && <Info label="العنوان" value={req.address} />}
        {!!req.start_date && <Info label="بداية النشاط" value={req.start_date} />}
        {(req.latitude != null) && <Info label="الموقع" value={formatCoords(req.latitude, req.longitude)} />}
        {!!req.details && <Info label="تفاصيل" value={req.details} />}
        <Info label="التاريخ" value={formatDateTime(req.created_at)} />

        <Text style={styles.section}>الحالة</Text>
        <StatusChips options={REQUEST_STATUS} colorsMap={REQUEST_STATUS_COLORS} value={status} onChange={setStatus} />

        <Text style={styles.section}>موعد المعاينة / الزيارة / الحضور</Text>
        <TextInput style={styles.input} placeholder="مثال: 2026/06/10 الساعة 10 ص" placeholderTextColor={colors.muted} value={appointment} onChangeText={setAppointment} />

        <Text style={styles.section}>الرد على الممول</Text>
        <TextInput style={[styles.input, styles.multi]} placeholder="نص الرد" placeholderTextColor={colors.muted} value={response} onChangeText={setResponse} multiline />

        {req.latitude != null && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#2563EB" }]} onPress={() => openDirections(req.latitude!, req.longitude!)}>
            <Ionicons name="navigate" size={18} color={colors.white} />
            <Text style={styles.actionText}>خط السير للموقع</Text>
          </TouchableOpacity>
        )}
        {req.type === "فتح ملف ضريبي" && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={openTaxFile}>
            <Ionicons name="folder-open" size={18} color={colors.white} />
            <Text style={styles.actionText}>فتح ملف ودمجه بالممولين</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="send" size={18} color={colors.white} /><Text style={styles.btnText}>حفظ وإرسال للممول</Text></>)}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { textAlign: "center", marginTop: 40, color: colors.muted },
  content: { padding: spacing.lg },
  title: { fontSize: 20, fontWeight: "800", color: colors.text, textAlign: "right", marginBottom: spacing.md },
  info: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  infoLabel: { fontSize: 13, fontWeight: "700", color: colors.muted, textAlign: "right" },
  infoValue: { fontSize: 16, color: colors.text, textAlign: "right", marginTop: 4 },
  section: { fontSize: 15, fontWeight: "800", color: colors.text, textAlign: "right", marginTop: spacing.lg, marginBottom: spacing.sm },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 46, fontSize: 15, color: colors.text, textAlign: "right" },
  multi: { minHeight: 90, textAlignVertical: "top" },
  btn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, margin: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  actionBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, marginTop: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md },
  actionText: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
