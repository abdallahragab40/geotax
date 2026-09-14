// تفاصيل المهمة + تنفيذها (بدء/إنهاء + ملاحظات + صور + خط السير)
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StatusChips } from "../../components/Field";
import PhotoPicker from "../../components/PhotoPicker";
import LeafletMap, { MapMarker } from "../../components/LeafletMap";
import { supabase } from "../../lib/supabase";
import { getTask, updateTask } from "../../data/survey";
import { uploadPhotos } from "../../data/storage";
import { Task, TASK_STATUSES, TASK_STATUS_COLORS, Taxpayer } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

type R = RouteProp<{ params: { id: number } }, "params">;

export default function TaskDetailScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<any>();
  const id = route.params.id;
  const [task, setTask] = useState<Task | null>(null);
  const [stops, setStops] = useState<Taxpayer[]>([]);
  const [status, setStatus] = useState("جديدة");
  const [notes, setNotes] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [existing, setExisting] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: `مهمة #${id}` }); }, [navigation, id]);

  const load = useCallback(async () => {
    const t = await getTask(id);
    setTask(t);
    if (t) {
      setStatus(t.status);
      setNotes(t.notes);
      setExisting(t.photos ?? []);
      if (t.taxpayer_ids?.length) {
        const { data } = await supabase.from("taxpayers").select("*").in("id", t.taxpayer_ids);
        // ترتيب حسب taxpayer_ids
        const map = new Map((data ?? []).map((x: any) => [x.id, x]));
        setStops(t.taxpayer_ids.map((tid) => map.get(tid)).filter(Boolean) as Taxpayer[]);
      }
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function startTask() {
    await updateTask(id, { status: "قيد التنفيذ", started_at: new Date().toISOString() });
    load();
  }
  async function completeTask() {
    setSaving(true);
    try {
      let urls = [...existing];
      if (pendingPhotos.length) urls = [...urls, ...await uploadPhotos(pendingPhotos)];
      await updateTask(id, {
        status: "تم التنفيذ",
        completed_at: new Date().toISOString(),
        notes: notes.trim(),
        photos: urls,
      });
      setPendingPhotos([]);
      Alert.alert("تم", "تم إنهاء المهمة وإرسال النتائج للمراجع.");
      load();
    } catch (e: any) { Alert.alert("خطأ", e?.message ?? "حاول مجددًا."); }
    finally { setSaving(false); }
  }
  async function saveProgress() {
    setSaving(true);
    try {
      let urls = [...existing];
      if (pendingPhotos.length) urls = [...urls, ...await uploadPhotos(pendingPhotos)];
      await updateTask(id, { status, notes: notes.trim(), photos: urls });
      setPendingPhotos([]);
      Alert.alert("تم", "حُفظ التقدّم.");
      load();
    } catch (e: any) { Alert.alert("خطأ", e?.message ?? "حاول مجددًا."); }
    finally { setSaving(false); }
  }

  if (!task) {
    return <SafeAreaView style={styles.container}><Text style={styles.loading}>جارٍ التحميل…</Text></SafeAreaView>;
  }

  const markers: MapMarker[] = stops
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s, i) => ({
      id: s.id, lat: s.latitude!, lng: s.longitude!,
      title: `${i + 1}. ${s.name || "ممول"}`,
      subtitle: s.tax_number || "",
      color: "#2563EB",
    }));

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Text style={styles.taskId}>مهمة #{task.id}</Text>
          <View style={[styles.badge, { backgroundColor: TASK_STATUS_COLORS[task.status] ?? colors.muted }]}>
            <Text style={styles.badgeText}>{task.status}</Text>
          </View>
        </View>
        <Info label="الأولوية" value={task.priority} />
        {!!task.due_date && <Info label="تاريخ التنفيذ المطلوب" value={task.due_date} />}
        <Info label="تاريخ الإسناد" value={formatDateTime(task.created_at)} />
        {!!task.started_at && <Info label="بدأت في" value={formatDateTime(task.started_at)} />}
        {!!task.completed_at && <Info label="انتهت في" value={formatDateTime(task.completed_at)} />}

        <Text style={styles.section}>نقاط الزيارة (خط السير)</Text>
        {stops.length === 0 ? (
          <Text style={styles.empty}>لا توجد نقاط زيارة.</Text>
        ) : (
          stops.map((s, i) => (
            <View key={s.id} style={styles.stop}>
              <View style={styles.stopNum}><Text style={styles.stopNumText}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stopName}>{s.name || "—"}</Text>
                {!!s.tax_number && <Text style={styles.stopMeta}>رقم: {s.tax_number}</Text>}
                {!!s.address && <Text style={styles.stopMeta}>{s.address}</Text>}
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("TaxpayerFile", { id: s.id })}>
                <Ionicons name="open-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {markers.length > 0 && (
          <>
            <Text style={styles.section}>المسار على الخريطة</Text>
            <View style={styles.map}>
              <LeafletMap markers={markers} onMarkerPress={(tid) => navigation.navigate("TaxpayerFile", { id: tid })} />
            </View>
          </>
        )}

        <Text style={styles.section}>الحالة</Text>
        <StatusChips options={TASK_STATUSES} colorsMap={TASK_STATUS_COLORS} value={status} onChange={setStatus} />

        <Text style={styles.section}>ملاحظات</Text>
        <TextInput style={[styles.input, styles.multi]} value={notes} onChangeText={setNotes} placeholder="ملاحظات تنفيذ المهمة" placeholderTextColor={colors.muted} multiline />

        <Text style={styles.section}>صور ومرفقات</Text>
        <PhotoPicker
          existing={existing}
          pending={pendingPhotos}
          onAddPending={(uris) => setPendingPhotos((p) => [...p, ...uris])}
          onRemoveExisting={(u) => setExisting((p) => p.filter((x) => x !== u))}
          onRemovePending={(uri) => setPendingPhotos((p) => p.filter((x) => x !== uri))}
        />
      </ScrollView>

      <View style={styles.actions}>
        {task.status === "جديدة" && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={startTask}>
            <Ionicons name="play" size={18} color={colors.white} />
            <Text style={styles.btnText}>بدء المهمة</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]} onPress={saveProgress} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="save" size={18} color={colors.white} /><Text style={styles.btnText}>حفظ التقدّم</Text></>)}
        </TouchableOpacity>
        {task.status !== "تم التنفيذ" && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: "#0E7C66", flex: 1 }]} onPress={completeTask} disabled={saving}>
            <Ionicons name="checkmark-circle" size={18} color={colors.white} />
            <Text style={styles.btnText}>إنهاء</Text>
          </TouchableOpacity>
        )}
      </View>
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
  head: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  taskId: { fontSize: 20, fontWeight: "800", color: colors.text },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  info: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  infoLabel: { fontSize: 13, fontWeight: "700", color: colors.muted, textAlign: "right" },
  infoValue: { fontSize: 16, color: colors.text, textAlign: "right", marginTop: 4 },
  section: { fontSize: 15, fontWeight: "800", color: colors.text, textAlign: "right", marginTop: spacing.lg, marginBottom: spacing.sm },
  stop: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, ...shadow },
  stopNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  stopNumText: { color: colors.white, fontWeight: "800" },
  stopName: { fontSize: 15, fontWeight: "700", color: colors.text, textAlign: "right" },
  stopMeta: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 1 },
  empty: { color: colors.muted, textAlign: "center", padding: spacing.lg },
  map: { height: 240, borderRadius: radius.md, overflow: "hidden", ...shadow },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, color: colors.text, textAlign: "right" },
  multi: { minHeight: 90, textAlignVertical: "top" },
  actions: { flexDirection: "row-reverse", gap: spacing.sm, padding: spacing.lg },
  btn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
