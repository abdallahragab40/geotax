// متابعة شكوى / طلب فتح ملف — متاح للجمهور بدون تسجيل دخول (الرقم + الموبايل للتحقق)
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { trackComplaint } from "../../data/requests";
import { trackFileRequest } from "../../data/registry";
import {
  ComplaintTracking, FileRequestTracking,
  COMPLAINT_PUBLIC_STATUS, FILE_REQUEST_COLORS,
} from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";
import type { AuthStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "Track">;

const COMPLAINT_COLORS: Record<string, string> = {
  "جديد": "#2563EB", "قيد المراجعة": "#D97706", "محوّل": "#7C3AED", "منتهي": "#0E7C66", "مرفوض": "#DC2626",
};

export default function TrackScreen({ navigation, route }: Props) {
  const isComplaint = route.params.kind === "complaint";
  const [code, setCode] = useState(route.params.code ?? "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [complaint, setComplaint] = useState<ComplaintTracking | null>(null);
  const [fileReq, setFileReq] = useState<FileRequestTracking | null>(null);

  async function search() {
    if (!code.trim()) {
      Alert.alert("بيانات ناقصة", isComplaint ? "أدخل رقم الشكوى." : "أدخل رقم الطلب.");
      return;
    }
    if (!/^01\d{9}$/.test(phone.trim())) {
      Alert.alert("رقم هاتف غير صحيح", "أدخل رقم الموبايل الذي استخدمته عند التقديم (11 رقمًا يبدأ بـ 01).");
      return;
    }
    setLoading(true);
    setComplaint(null);
    setFileReq(null);
    try {
      let found = false;
      if (isComplaint) {
        const r = await trackComplaint(code, phone);
        setComplaint(r);
        found = !!r;
      } else {
        const r = await trackFileRequest(code, phone);
        setFileReq(r);
        found = !!r;
      }
      if (!found) {
        Alert.alert("لم يتم العثور", "تأكد من الرقم ومن رقم الموبايل المستخدم عند التقديم.");
      }
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "حاول مجددًا.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-forward" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isComplaint ? "متابعة شكوى" : "متابعة طلب فتح ملف"}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>
            {isComplaint
              ? "أدخل رقم الشكوى الذي ظهر لك عند الإرسال، ورقم الموبايل الذي كتبته في الشكوى."
              : "أدخل رقم الطلب الذي ظهر لك عند التقديم، ورقم الموبايل المسجّل في الطلب."}
          </Text>

          <Text style={styles.label}>{isComplaint ? "رقم الشكوى" : "رقم الطلب"}</Text>
          <TextInput
            style={styles.input}
            placeholder={isComplaint ? "مثال: C-12345678" : "مثال: F-12345678"}
            placeholderTextColor={colors.muted}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Text style={styles.label}>رقم الموبايل</Text>
          <TextInput
            style={styles.input}
            placeholder="01xxxxxxxxx"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={11}
          />

          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={search} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.white} /> : (
              <>
                <Ionicons name="search" size={22} color={colors.white} />
                <Text style={styles.btnText}>استعلام</Text>
              </>
            )}
          </TouchableOpacity>

          {complaint && (
            <View style={styles.result}>
              <StatusBadge
                label={COMPLAINT_PUBLIC_STATUS[complaint.status] ?? complaint.status}
                color={COMPLAINT_COLORS[complaint.status] ?? colors.primary}
              />
              <Row icon="document-text" label="رقم الشكوى" value={complaint.tracking_code} />
              <Row icon="business" label="الجهة المسؤولة حاليًا" value={complaint.responsible} />
              <Row icon="calendar" label="تاريخ التقديم" value={formatDateTime(complaint.created_at)} />
              <Row icon="time" label="آخر تحديث" value={formatDateTime(complaint.updated_at)} />
              {!!complaint.official_reply && (
                <View style={styles.reply}>
                  <Text style={styles.replyTitle}>الرد الرسمي</Text>
                  <Text style={styles.replyText}>{complaint.official_reply}</Text>
                  {!!complaint.replied_at && <Text style={styles.replyDate}>{formatDateTime(complaint.replied_at)}</Text>}
                </View>
              )}
            </View>
          )}

          {fileReq && (
            <View style={styles.result}>
              <StatusBadge label={fileReq.status} color={FILE_REQUEST_COLORS[fileReq.status] ?? colors.primary} />
              <Row icon="document-text" label="رقم الطلب" value={fileReq.request_code} />
              {!!fileReq.office_name && <Row icon="business" label="المأمورية" value={fileReq.office_name} />}
              <Row icon="calendar" label="تاريخ التقديم" value={formatDateTime(fileReq.created_at)} />
              <Row icon="time" label="آخر تحديث" value={formatDateTime(fileReq.updated_at)} />
              {!!fileReq.note && (
                <View style={styles.reply}>
                  <Text style={styles.replyTitle}>
                    {fileReq.status === "مرفوض" ? "سبب الرفض" : "المستندات المطلوبة"}
                  </Text>
                  <Text style={styles.replyText}>{fileReq.note}</Text>
                </View>
              )}
              {!!fileReq.tax_number && (
                <View style={[styles.reply, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.replyTitle, { color: colors.primaryDark }]}>رقم التسجيل الضريبي</Text>
                  <Text selectable style={[styles.replyText, styles.taxNumber]}>{fileReq.tax_number}</Text>
                  <Text style={styles.replyDate}>ادخل به مع كلمة المرور من «دخول الممول».</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text style={styles.rowLabelText}>{label}</Text>
      </View>
      <Text selectable style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xl * 2 },
  hint: { fontSize: 15, color: colors.muted, textAlign: "right", lineHeight: 24, marginBottom: spacing.lg },
  label: { fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, height: 58, fontSize: 18, color: colors.text, textAlign: "right", marginBottom: spacing.lg,
  },
  btn: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.primary, height: 60, borderRadius: radius.md, ...shadow,
  },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 18 },
  result: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl, ...shadow },
  badge: { alignSelf: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.pill, marginBottom: spacing.lg },
  badgeText: { color: colors.white, fontWeight: "800", fontSize: 18 },
  row: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs },
  rowLabelText: { fontSize: 14, fontWeight: "700", color: colors.muted },
  rowValue: { fontSize: 17, color: colors.text, textAlign: "right", marginTop: 4, fontWeight: "600" },
  reply: { backgroundColor: "#FEF3C7", borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  replyTitle: { fontSize: 15, fontWeight: "800", color: "#92400E", textAlign: "right" },
  replyText: { fontSize: 16, color: colors.text, textAlign: "right", marginTop: spacing.xs, lineHeight: 26 },
  replyDate: { fontSize: 13, color: colors.muted, textAlign: "right", marginTop: spacing.xs },
  taxNumber: { fontSize: 22, fontWeight: "800", color: colors.primaryDark },
});
