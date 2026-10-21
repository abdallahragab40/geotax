// تفعيل حسابات الممولين أصحاب الملفات: الموظف يتحقق من الشخصية ثم يصدر رمز التفعيل أو يرفض
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
  Modal, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { listPendingActivations, issueActivationCode, rejectActivation } from "../../data/registry";
import { TaxpayerActivation } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

export default function AccountActivationsScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<TaxpayerActivation[]>([]);
  const [loading, setLoading] = useState(false);
  const [issued, setIssued] = useState<{ name: string; code: string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TaxpayerActivation | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "تفعيل حسابات الممولين" }); }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listPendingActivations()); } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmIssue(a: TaxpayerActivation) {
    Alert.alert(
      "إصدار رمز التفعيل",
      "تأكد أولًا من شخصية الممول (اتصال على رقم الملف أو حضور بالبطاقة). الرمز يظهر لك مرة واحدة وصالح 48 ساعة.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إصدار",
          onPress: async () => {
            try {
              const code = await issueActivationCode(a.id);
              setIssued({ name: a.full_name, code });
              load();
            } catch (e: any) {
              Alert.alert("خطأ", e?.message ?? "تعذّر إصدار الرمز.");
            }
          },
        },
      ]
    );
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    if (!reason.trim()) { Alert.alert("بيانات ناقصة", "اكتب سبب الرفض."); return; }
    setBusy(true);
    try {
      await rejectActivation(rejectTarget.id, reason);
      setRejectTarget(null);
      setReason("");
      load();
      Alert.alert("تم", "تم رفض الطلب وحذف الحساب غير المفعّل، ويمكن لصاحب الملف التسجيل من جديد.");
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر الرفض.");
    } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.full_name || "بدون اسم"}</Text>
            <Text style={styles.meta}>رقم التسجيل الضريبي: {item.tax_number}</Text>
            <Text style={styles.meta}>الرقم القومي: {item.national_id}</Text>
            <Text style={styles.meta}>الهاتف المُدخل عند التسجيل: {item.phone || "—"}</Text>
            {!!item.taxpayers && (
              <Text style={styles.meta}>
                الملف: {item.taxpayers.name}{item.taxpayers.phone ? ` — هاتف الملف: ${item.taxpayers.phone}` : ""}
              </Text>
            )}
            <Text style={styles.meta}>{formatDateTime(item.created_at)}</Text>
            {!!item.code_issued_at && (
              <Text style={[styles.meta, { color: colors.warning }]}>
                صدر رمز في {formatDateTime(item.code_issued_at)} — بانتظار إدخاله
              </Text>
            )}
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => confirmIssue(item)}>
                <Ionicons name="key" size={18} color={colors.white} />
                <Text style={styles.btnText}>{item.code_issued_at ? "رمز جديد" : "إصدار رمز"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.danger }]} onPress={() => setRejectTarget(item)}>
                <Ionicons name="close" size={18} color={colors.white} />
                <Text style={styles.btnText}>رفض</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>لا توجد طلبات تفعيل.</Text> : null}
      />

      {/* عرض الرمز مرة واحدة */}
      <Modal visible={issued !== null} transparent animationType="fade" onRequestClose={() => setIssued(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>رمز تفعيل {issued?.name}</Text>
            <Text selectable style={styles.code}>{issued?.code}</Text>
            <Text style={styles.warn}>أبلغ الممول بالرمز ليُدخله في التطبيق. لن يظهر الرمز مرة أخرى.</Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => setIssued(null)}>
              <Text style={styles.btnText}>تم</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={rejectTarget !== null} transparent animationType="slide" onRequestClose={() => setRejectTarget(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>رفض طلب {rejectTarget?.full_name}</Text>
            <Text style={styles.warn}>سيُحذف الحساب غير المفعّل حتى يستطيع صاحب الملف الحقيقي التسجيل.</Text>
            <TextInput
              style={styles.input}
              placeholder="سبب الرفض (مطلوب)"
              placeholderTextColor={colors.muted}
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.danger }]} onPress={confirmReject} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>تأكيد الرفض</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => { setRejectTarget(null); setReason(""); }}>
              <Text style={styles.modalCloseText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderRightWidth: 4, borderRightColor: "#B45309", ...shadow },
  name: { fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "right" },
  meta: { fontSize: 13, color: colors.muted, textAlign: "right", marginTop: 2 },
  actions: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radius.md },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 70, fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.md },
  code: { fontSize: 40, fontWeight: "800", color: colors.primaryDark, textAlign: "center", letterSpacing: 8, marginVertical: spacing.md },
  warn: { fontSize: 13, color: colors.danger, textAlign: "center", marginBottom: spacing.md, lineHeight: 20 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, minHeight: 80, fontSize: 15, color: colors.text, textAlign: "right", textAlignVertical: "top", marginBottom: spacing.md },
  modalClose: { marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.sm },
  modalCloseText: { color: colors.muted, fontWeight: "700" },
});
