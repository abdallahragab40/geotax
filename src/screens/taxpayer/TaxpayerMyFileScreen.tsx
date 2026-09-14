// ملفي — البيانات الكاملة + الأنشطة الفرعية + الفروع + المخازن + سجل التعديلات
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getMyTaxpayerFile } from "../../data/registry";
import { supabase } from "../../lib/supabase";
import { listBranches, listSubActivities, listWarehouses } from "../../data/survey";
import { getOffice } from "../../data/offices";
import {
  Branch, Office, SubActivity, Taxpayer, TaxpayerModification, Warehouse,
} from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

const STATUS_COLOR: Record<string, string> = {
  active: "#0E7C66", partial_stop: "#D97706", final_stop: "#DC2626",
};
const STATUS_LABEL: Record<string, string> = {
  active: "نشط", partial_stop: "متوقف جزئيًا", final_stop: "متوقف نهائيًا",
};

export default function TaxpayerMyFileScreen() {
  const navigation = useNavigation<any>();
  const [tp, setTp] = useState<Taxpayer | null>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [subActs, setSubActs] = useState<SubActivity[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [mods, setMods] = useState<TaxpayerModification[]>([]);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "ملفي" }); }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await getMyTaxpayerFile();
      setTp(t);
      if (t) {
        if (t.office_id) getOffice(t.office_id).then(setOffice);
        const [sa, br, wh, modsData] = await Promise.all([
          listSubActivities(t.id),
          listBranches(t.id),
          listWarehouses(t.id),
          supabase.from("taxpayer_modifications").select("*").eq("taxpayer_id", t.id).order("created_at", { ascending: false }),
        ]);
        setSubActs(sa);
        setBranches(br);
        setWarehouses(wh);
        setMods((modsData.data as TaxpayerModification[]) ?? []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!tp) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={56} color={colors.border} />
          <Text style={styles.emptyText}>لا يوجد ملف ضريبي مرتبط بحسابك بعد.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <Text style={styles.section}>البيانات الأساسية</Text>
        <View style={styles.card}>
          <Row label="رقم التسجيل الضريبي" value={tp.tax_number || "—"} highlight />
          <Row label="اسم الممول" value={tp.name || "—"} />
          <Row label="الرقم القومي" value={tp.national_id || "—"} />
          <Row label="النشاط الرئيسي" value={tp.activity || "—"} />
          <Row label="تاريخ بداية النشاط" value={tp.start_date || "—"} />
          <Row label="العنوان" value={tp.address || "—"} />
          <Row label="المأمورية المختصة" value={office ? `${office.name} (${office.code})` : "—"} />
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>حالة النشاط:</Text>
            <View style={[styles.statusChip, { backgroundColor: STATUS_COLOR[tp.activity_status ?? "active"] ?? colors.muted }]}>
              <Text style={styles.statusText}>{STATUS_LABEL[tp.activity_status ?? "active"] ?? tp.activity_status}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.section}>الأنشطة الفرعية ({subActs.length})</Text>
        {subActs.length === 0 ? (
          <Text style={styles.empty2}>لا توجد أنشطة فرعية.</Text>
        ) : (
          subActs.map((s) => (
            <View key={s.id} style={styles.subCard}>
              <Text style={styles.subName}>{s.name}</Text>
              {!!s.description && <Text style={styles.subMeta}>{s.description}</Text>}
            </View>
          ))
        )}

        <Text style={styles.section}>الفروع ({branches.length})</Text>
        {branches.length === 0 ? (
          <Text style={styles.empty2}>لا توجد فروع.</Text>
        ) : (
          branches.map((b) => (
            <View key={b.id} style={styles.subCard}>
              <Text style={styles.subName}>{b.name}</Text>
              {!!b.address && <Text style={styles.subMeta}>{b.address}</Text>}
            </View>
          ))
        )}

        <Text style={styles.section}>المخازن ({warehouses.length})</Text>
        {warehouses.length === 0 ? (
          <Text style={styles.empty2}>لا توجد مخازن.</Text>
        ) : (
          warehouses.map((w) => (
            <View key={w.id} style={styles.subCard}>
              <Text style={styles.subName}>مخزن #{w.id}</Text>
              {!!w.address && <Text style={styles.subMeta}>{w.address}</Text>}
            </View>
          ))
        )}

        <Text style={styles.section}>سجل التعديلات ({mods.length})</Text>
        {mods.length === 0 ? (
          <Text style={styles.empty2}>لا توجد تعديلات.</Text>
        ) : (
          mods.map((m) => (
            <View key={m.id} style={styles.subCard}>
              <Text style={styles.subName}>{m.type}</Text>
              {!!m.mod_date && <Text style={styles.subMeta}>التاريخ: {m.mod_date}</Text>}
              {!!m.address && <Text style={styles.subMeta}>{m.address}</Text>}
              <Text style={styles.subMeta}>{formatDateTime(m.created_at)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && { color: colors.primary, fontWeight: "800" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.muted, marginTop: spacing.md, fontSize: 15, textAlign: "center" },
  empty2: { color: colors.muted, fontSize: 13, textAlign: "right", paddingVertical: spacing.sm },
  section: { fontSize: 15, fontWeight: "800", color: colors.text, textAlign: "right", marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, ...shadow },
  row: { flexDirection: "row-reverse", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border, gap: spacing.sm },
  rowLabel: { color: colors.muted, fontSize: 13, flex: 1, textAlign: "right" },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: "700", flex: 1.4, textAlign: "left" },
  statusRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, gap: spacing.sm },
  statusLabel: { color: colors.muted, fontSize: 13 },
  statusChip: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  subCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, ...shadow },
  subName: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right" },
  subMeta: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 2 },
});
