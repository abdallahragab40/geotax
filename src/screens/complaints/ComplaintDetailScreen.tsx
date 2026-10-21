// تفاصيل الشكوى ومعالجتها (للموظف)
import React, { useCallback, useLayoutEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StatusChips } from "../../components/Field";
import { getComplaint, updateComplaint, escalateComplaint } from "../../data/requests";
import { useAuth } from "../../context/AuthContext";
import { createTaxpayerFile } from "../../data/registry";
import { Complaint, COMPLAINT_STATUS, COMPLAINT_CLOSED } from "../../types";
import LeafletMap from "../../components/LeafletMap";
import { openDirections } from "../../data/directions";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime, formatCoords } from "../../utils";
import SecureImage from "../../components/SecureImage";

type R = RouteProp<{ params: { id: number } }, "params">;

const STATUS_COLORS: Record<string, string> = {
  "جديد": "#2563EB", "قيد المراجعة": "#D97706", "محوّل": "#7C3AED", "منتهي": "#0E7C66", "مرفوض": "#DC2626",
};

export default function ComplaintDetailScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<any>();
  const id = route.params.id;
  const { profile } = useAuth();
  const [c, setC] = useState<Complaint | null>(null);
  const [reply, setReply] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const [escOpen, setEscOpen] = useState(false);
  const [escNote, setEscNote] = useState("");
  const [escalating, setEscalating] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "الشكوى" }); }, [navigation]);

  const load = useCallback(async () => {
    const data = await getComplaint(id);
    setC(data);
    setReply(data?.official_reply ?? "");
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function setStatus(status: string) {
    await updateComplaint(id, { status });
    load();
  }

  async function saveReply() {
    setSavingReply(true);
    try {
      await updateComplaint(id, { official_reply: reply.trim() });
      Alert.alert("تم", "تم حفظ الرد الرسمي، وسيظهر للمواطن عند متابعة الشكوى.");
      load();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر الحفظ.");
    } finally { setSavingReply(false); }
  }

  async function escalate() {
    setEscalating(true);
    try {
      await escalateComplaint(id, escNote);
      setEscOpen(false);
      setEscNote("");
      Alert.alert("تم التصعيد", "تم رفع الشكوى لرئيس المأمورية وتسجيل العملية في سجل العمليات.");
      load();
    } catch (e: any) {
      Alert.alert("تعذّر التصعيد", e?.message ?? "حاول مجددًا.");
    } finally { setEscalating(false); }
  }

  async function openTaxFile() {
    if (!c) return;
    try {
      const tp = await createTaxpayerFile({
        name: c.accused_name,
        activity: c.activity,
        address: c.address,
        latitude: c.latitude,
        longitude: c.longitude,
        source: "survey",
        status: "قيد الحصر",
        summary: `محوّل من شكوى: ${c.details}`,
      });
      await updateComplaint(id, { status: "محوّل" });
      navigation.navigate("TaxpayerFile", { id: tp.id });
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر فتح الملف.");
    }
  }

  if (!c) return <SafeAreaView style={styles.container}><Text style={styles.loading}>جارٍ التحميل…</Text></SafeAreaView>;

  const hasCoords = c.latitude != null && c.longitude != null;
  // التصعيد لمأمور الحصر المختص فقط، وللشكاوى المفتوحة غير المصعّدة
  const canEscalate = profile?.role === "surveyor" && !c.escalated && !COMPLAINT_CLOSED.includes(c.status)
    && (c.assigned_to === profile.id || c.assigned_to == null);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {!!c.tracking_code && <Info label="رقم الشكوى" value={c.tracking_code} />}
        {c.escalated && (
          <View style={styles.escBox}>
            <Text style={styles.escTitle}>مصعّدة لرئيس المأمورية{c.escalated_at ? ` — ${formatDateTime(c.escalated_at)}` : ""}</Text>
            {!!c.escalation_note && <Text style={styles.escText}>{c.escalation_note}</Text>}
          </View>
        )}

        <Text style={styles.section}>المشكو في حقه</Text>
        <Info label="الاسم / النشاط" value={c.accused_name || "—"} />
        {!!c.activity && <Info label="النشاط" value={c.activity} />}
        {!!c.address && <Info label="العنوان" value={c.address} />}
        {hasCoords && <Info label="الموقع" value={formatCoords(c.latitude, c.longitude)} />}
        {!!c.details && <Info label="تفاصيل الشكوى" value={c.details} />}

        <Text style={styles.section}>مقدّم الشكوى</Text>
        <Info label="الاسم" value={c.complainant_name || "—"} />
        <Info label="الرقم القومي" value={c.complainant_national_id || "—"} />
        <Info label="الهاتف" value={c.complainant_phone || "—"} />
        <Info label="التاريخ" value={formatDateTime(c.created_at)} />

        <Text style={styles.section}>الحالة</Text>
        <StatusChips options={COMPLAINT_STATUS} colorsMap={STATUS_COLORS} value={c.status} onChange={setStatus} />

        <Text style={styles.section}>الرد الرسمي (يظهر للمواطن)</Text>
        <TextInput
          style={styles.replyInput}
          value={reply}
          onChangeText={setReply}
          placeholder="اكتب الرد الرسمي على الشكوى"
          placeholderTextColor={colors.muted}
          multiline
        />
        <TouchableOpacity style={styles.replyBtn} onPress={saveReply} disabled={savingReply}>
          {savingReply ? <ActivityIndicator color={colors.primary} /> : (
            <>
              <Ionicons name="save-outline" size={16} color={colors.primary} />
              <Text style={styles.replyBtnText}>حفظ الرد</Text>
            </>
          )}
        </TouchableOpacity>

        {canEscalate && (
          <TouchableOpacity style={styles.escBtn} onPress={() => setEscOpen(true)}>
            <Ionicons name="arrow-up-circle" size={18} color={colors.white} />
            <Text style={styles.actionText}>تصعيد لرئيس المأمورية</Text>
          </TouchableOpacity>
        )}

        {(c.photos?.length ?? 0) > 0 && (
          <>
            <Text style={styles.section}>الصور المرفقة ({c.photos!.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {c.photos!.map((url) => (
                <SecureImage key={url} uri={url} style={styles.photo} />
              ))}
            </ScrollView>
          </>
        )}

        {hasCoords && (
          <>
            <Text style={styles.section}>الموقع على الخريطة</Text>
            <View style={styles.map}>
              <LeafletMap markers={[{ id: c.id, lat: c.latitude!, lng: c.longitude!, title: c.accused_name || "شكوى", subtitle: c.activity, color: "#DB2777" }]} />
            </View>
            <TouchableOpacity style={styles.dirBtn} onPress={() => openDirections(c.latitude!, c.longitude!)}>
              <Ionicons name="navigate" size={18} color={colors.white} />
              <Text style={styles.actionText}>خط السير للموقع</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.openBtn} onPress={openTaxFile}>
          <Ionicons name="folder-open" size={18} color={colors.white} />
          <Text style={styles.actionText}>فتح ملف ضريبي من الشكوى</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={escOpen} transparent animationType="slide" onRequestClose={() => setEscOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>تصعيد الشكوى لرئيس المأمورية</Text>
            <TextInput
              style={styles.replyInput}
              value={escNote}
              onChangeText={setEscNote}
              placeholder="سبب التصعيد (اختياري)"
              placeholderTextColor={colors.muted}
              multiline
            />
            <TouchableOpacity style={[styles.escBtn, { marginTop: 0 }]} onPress={escalate} disabled={escalating}>
              {escalating ? <ActivityIndicator color={colors.white} /> : <Text style={styles.actionText}>تأكيد التصعيد</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setEscOpen(false)}>
              <Text style={styles.modalCloseText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  section: { fontSize: 15, fontWeight: "800", color: colors.text, textAlign: "right", marginTop: spacing.lg, marginBottom: spacing.sm },
  info: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  infoLabel: { fontSize: 13, fontWeight: "700", color: colors.muted, textAlign: "right" },
  infoValue: { fontSize: 16, color: colors.text, textAlign: "right", marginTop: 4 },
  map: { height: 220, borderRadius: radius.md, overflow: "hidden", ...shadow },
  photo: { width: 130, height: 130, borderRadius: radius.md, marginLeft: spacing.sm, backgroundColor: colors.border },
  dirBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: "#2563EB", marginTop: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md },
  openBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: colors.primary, marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  actionText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  escBox: { backgroundColor: "#EDE9FE", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  escTitle: { fontSize: 14, fontWeight: "800", color: "#5B21B6", textAlign: "right" },
  escText: { fontSize: 14, color: colors.text, textAlign: "right", marginTop: 4 },
  replyInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, minHeight: 90, fontSize: 15, color: colors.text, textAlign: "right", textAlignVertical: "top", marginBottom: spacing.sm },
  replyBtn: { flexDirection: "row-reverse", alignItems: "center", alignSelf: "flex-start", gap: spacing.xs, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  replyBtnText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  escBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: "#7C3AED", marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.md },
  modalClose: { marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.sm },
  modalCloseText: { color: colors.muted, fontWeight: "700" },
});

