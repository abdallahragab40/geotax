// إدارة الملفات (رئيس المأمورية): مراجعة الملفات + حذف بالخطأ + سجل الحذف
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
  Modal, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { listRegistry } from "../../data/registry";
import { headDeleteTaxpayer, listDeletionLog } from "../../data/news";
import { DeletionLog, Taxpayer } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

export default function FileManagementScreen() {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<"files" | "log">("files");
  const [files, setFiles] = useState<Taxpayer[]>([]);
  const [log, setLog] = useState<DeletionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [delTarget, setDelTarget] = useState<Taxpayer | null>(null);
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "إدارة الملفات" }); }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "files") setFiles(await listRegistry());
      else setLog(await listDeletionLog());
    } catch {} finally { setLoading(false); }
  }, [tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function confirmDelete() {
    if (!delTarget) return;
    if (!reason.trim()) { Alert.alert("بيانات ناقصة", "اكتب سبب الحذف."); return; }
    setDeleting(true);
    try {
      await headDeleteTaxpayer(delTarget.id, reason.trim());
      setDelTarget(null);
      setReason("");
      load();
      Alert.alert("تم", "تم حذف الملف وتسجيل العملية في السجل.");
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر الحذف.");
    } finally { setDeleting(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.tabs}>
        <Tab label="الملفات" active={tab === "files"} onPress={() => setTab("files")} />
        <Tab label="سجل الحذف" active={tab === "log"} onPress={() => setTab("log")} />
      </View>

      {tab === "files" ? (
        <FlatList
          data={files}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name || "بدون اسم"}</Text>
              {!!item.tax_number && <Text style={styles.meta}>رقم: {item.tax_number}</Text>}
              {!!item.activity && <Text style={styles.meta}>النشاط: {item.activity}</Text>}
              <Text style={styles.meta}>المصدر: {item.source}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actBtn} onPress={() => navigation.navigate("TaxpayerFile", { id: item.id })}>
                  <Ionicons name="eye" size={18} color={colors.primary} />
                  <Text style={styles.actText}>عرض</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actBtn} onPress={() => setDelTarget(item)}>
                  <Ionicons name="trash" size={18} color={colors.danger} />
                  <Text style={[styles.actText, { color: colors.danger }]}>حذف</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={!loading ? <Text style={styles.empty}>لا توجد ملفات.</Text> : null}
        />
      ) : (
        <FlatList
          data={log}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>حذف ملف ممول #{item.entity_id}</Text>
              <Text style={styles.meta}>الاسم: {item.entity_snapshot?.name ?? "—"}</Text>
              {!!item.entity_snapshot?.tax_number && <Text style={styles.meta}>رقم: {item.entity_snapshot.tax_number}</Text>}
              {!!item.reason && <Text style={[styles.meta, { color: colors.danger }]}>السبب: {item.reason}</Text>}
              <Text style={styles.meta}>{formatDateTime(item.deleted_at)}</Text>
            </View>
          )}
          ListEmptyComponent={!loading ? <Text style={styles.empty}>لا توجد عمليات حذف.</Text> : null}
        />
      )}

      <Modal visible={delTarget !== null} transparent animationType="slide" onRequestClose={() => setDelTarget(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>حذف ملف {delTarget?.name}</Text>
            <Text style={styles.warn}>سيُحذف الملف نهائيًا ويُسجَّل في سجل الحذف.</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
              placeholder="سبب الحذف (مطلوب)"
              placeholderTextColor={colors.muted}
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancel]} onPress={() => { setDelTarget(null); setReason(""); }}>
                <Text style={styles.cancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.del]} onPress={confirmDelete} disabled={deleting}>
                {deleting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.delText}>تأكيد الحذف</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && { color: colors.white }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: "row-reverse", gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.sm },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontWeight: "700", color: colors.text, fontSize: 14 },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  name: { fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "right" },
  meta: { fontSize: 13, color: colors.muted, textAlign: "right", marginTop: 2 },
  actions: { flexDirection: "row-reverse", gap: spacing.lg, marginTop: spacing.sm },
  actBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  actText: { fontSize: 13, fontWeight: "700", color: colors.text },
  empty: { color: colors.muted, textAlign: "center", marginTop: 80, fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "right", marginBottom: spacing.sm },
  warn: { color: colors.danger, fontSize: 13, textAlign: "right", marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, color: colors.text, textAlign: "right", marginBottom: spacing.md },
  modalActions: { flexDirection: "row-reverse", gap: spacing.md },
  modalBtn: { flex: 1, height: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cancel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.text, fontWeight: "700", fontSize: 15 },
  del: { backgroundColor: colors.danger },
  delText: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
