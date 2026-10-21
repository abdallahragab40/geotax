// قائمة الشكاوى (للموظف)
// - مأمور الحصر: الشكاوى المسندة إليه
// - رئيس المأمورية: المصعّدة إليه + المتأخرة عن المدة المحددة (قابلة للضبط)
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  Text, FlatList, TouchableOpacity, StyleSheet, View, RefreshControl,
  Modal, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { listComplaintInbox, setComplaintOverdueDays } from "../../data/requests";
import { getOffice } from "../../data/offices";
import { useAuth } from "../../context/AuthContext";
import { Complaint, COMPLAINT_CLOSED } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function ComplaintsListScreen() {
  const navigation = useNavigation<any>();
  const { profile } = useAuth();
  const isHead = profile?.role === "office_head";
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [overdueDays, setOverdueDays] = useState(3);
  const [daysOpen, setDaysOpen] = useState(false);
  const [daysInput, setDaysInput] = useState("");
  const [savingDays, setSavingDays] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "الشكاوى",
      headerLeft: isHead
        ? () => (
            <TouchableOpacity onPress={() => { setDaysInput(String(overdueDays)); setDaysOpen(true); }} hitSlop={10}>
              <Ionicons name="settings-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, isHead, overdueDays]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listComplaintInbox());
      if (profile?.office_id) {
        const o = await getOffice(profile.office_id);
        if (o?.complaint_overdue_days) setOverdueDays(o.complaint_overdue_days);
      }
    } catch {} finally { setLoading(false); }
  }, [profile?.office_id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function saveDays() {
    const n = parseInt(daysInput, 10);
    if (!n || n < 1 || n > 60) { Alert.alert("قيمة غير صحيحة", "أدخل عدد أيام من 1 إلى 60."); return; }
    setSavingDays(true);
    try {
      await setComplaintOverdueDays(n);
      setOverdueDays(n);
      setDaysOpen(false);
      load();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر الحفظ.");
    } finally { setSavingDays(false); }
  }

  const isOverdue = (c: Complaint) =>
    !COMPLAINT_CLOSED.includes(c.status) && Date.now() - new Date(c.created_at).getTime() > overdueDays * DAY_MS;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {isHead && (
        <Text style={styles.note}>
          تظهر هنا الشكاوى المصعّدة إليك من مأمور الحصر، والشكاوى التي مرّ عليها أكثر من {overdueDays} أيام دون إغلاق.
        </Text>
      )}
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => navigation.navigate("ComplaintDetail", { id: item.id })}>
            <View style={styles.head}>
              <Text style={styles.accused} numberOfLines={1}>ضد: {item.accused_name || "غير محدد"}</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{item.status}</Text></View>
            </View>
            {!!item.tracking_code && <Text style={styles.code}>{item.tracking_code}</Text>}
            <Text style={styles.line} numberOfLines={2}>{item.details || "بدون تفاصيل"}</Text>
            <View style={styles.tags}>
              {item.escalated && <Tag label="مصعّدة" color="#7C3AED" />}
              {isOverdue(item) && <Tag label="متأخرة" color={colors.danger} />}
            </View>
            <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>لا توجد شكاوى بعد.</Text> : null}
      />

      <Modal visible={daysOpen} transparent animationType="slide" onRequestClose={() => setDaysOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>مدة التأخير قبل ظهور الشكوى لك</Text>
            <TextInput
              style={styles.input}
              value={daysInput}
              onChangeText={setDaysInput}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="عدد الأيام"
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveDays} disabled={savingDays}>
              {savingDays ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>حفظ</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setDaysOpen(false)}>
              <Text style={styles.modalCloseText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  note: { fontSize: 13, color: colors.muted, textAlign: "right", paddingHorizontal: spacing.lg, paddingTop: spacing.md, lineHeight: 20 },
  list: { padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderRightWidth: 4, borderRightColor: "#DB2777", ...shadow },
  head: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  accused: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "right" },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: "#DB2777" },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  code: { fontSize: 13, color: colors.primary, fontWeight: "700", textAlign: "right", marginBottom: 2 },
  line: { fontSize: 14, color: colors.muted, textAlign: "right" },
  tags: { flexDirection: "row-reverse", gap: spacing.xs, marginTop: spacing.xs },
  tag: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1 },
  tagText: { fontSize: 12, fontWeight: "800" },
  date: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 4 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 70, fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, fontSize: 18, color: colors.text, textAlign: "center", marginBottom: spacing.md },
  saveBtn: { backgroundColor: colors.primary, height: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  saveText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  modalClose: { marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.sm },
  modalCloseText: { color: colors.muted, fontWeight: "700" },
});
