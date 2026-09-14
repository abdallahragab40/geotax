// إسناد ملفات + خط سير + موعد إلى مأمور
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert,
  ActivityIndicator, FlatList, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { listRegistry } from "../../data/registry";
import { createTask } from "../../data/survey";
import { useAuth } from "../../context/AuthContext";
import { Profile, ROLE_LABELS, TASK_PRIORITIES, Taxpayer } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";

type R = RouteProp<{ params: { taskType?: "survey" | "exam" } }, "params">;

export default function AssignTaskScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<R>();
  const { profile } = useAuth();
  const taskType = route.params?.taskType ?? "survey";

  const [staff, setStaff] = useState<Profile[]>([]);
  const [pool, setPool] = useState<Taxpayer[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [priority, setPriority] = useState("عادية");
  const [dueDate, setDueDate] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useLayoutEffect(() => { navigation.setOptions({ title: "إسناد مهمة" }); }, [navigation]);

  useEffect(() => {
    const wantedRole = taskType === "survey" ? "surveyor" : "examiner";
    supabase
      .from("profiles").select("*")
      .eq("role", wantedRole)
      .eq("office_id", profile?.office_id ?? -1)
      .then(({ data }) => setStaff((data as Profile[]) ?? []));
    listRegistry().then(setPool).catch(() => {});
  }, [taskType, profile?.office_id]);

  function toggleFile(id: number) {
    setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  function moveUp(i: number) {
    if (i === 0) return;
    const a = [...selectedIds]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setSelectedIds(a);
  }
  function moveDown(i: number) {
    if (i === selectedIds.length - 1) return;
    const a = [...selectedIds]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; setSelectedIds(a);
  }

  const filtered = pool.filter((t) => {
    const q = search.trim();
    if (!q) return true;
    return (t.name?.includes(q) || t.tax_number?.includes(q));
  });

  async function submit() {
    if (!selectedStaff) { Alert.alert("ناقص", "اختر المأمور المختص."); return; }
    if (selectedIds.length === 0) { Alert.alert("ناقص", "اختر ملفًا واحدًا على الأقل."); return; }
    setSaving(true);
    try {
      await createTask({
        task_type: taskType,
        assigned_to: selectedStaff.id,
        taxpayer_ids: selectedIds,
        priority,
        due_date: dueDate.trim(),
        status: "جديدة",
      });
      Alert.alert("تم", "تم إسناد المهمة وإرسال خط السير للمأمور.");
      navigation.goBack();
    } catch (e: any) { Alert.alert("خطأ", e?.message ?? "تعذّر الإسناد."); }
    finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>المأمور المختص</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setPickerOpen(true)}>
          <Text style={styles.pickerText}>
            {selectedStaff ? `${selectedStaff.full_name} (${selectedStaff.employee_number || "—"})` : "اختر مأمورًا"}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.muted} />
        </TouchableOpacity>

        <Text style={styles.label}>الأولوية</Text>
        <View style={styles.chips}>
          {TASK_PRIORITIES.map((p) => {
            const active = priority === p;
            return (
              <TouchableOpacity key={p} style={[styles.chip, active && styles.chipActive]} onPress={() => setPriority(p)}>
                <Text style={[styles.chipText, active && { color: colors.white }]}>{p}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>تاريخ التنفيذ المطلوب</Text>
        <TextInput style={styles.input} placeholder="2026-06-15" placeholderTextColor={colors.muted} value={dueDate} onChangeText={setDueDate} />

        <View style={styles.fileHead}>
          <Text style={styles.label}>الملفات المسندة + خط السير ({selectedIds.length})</Text>
          <TouchableOpacity style={styles.addFiles} onPress={() => setFilesOpen(true)}>
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.addFilesText}>اختيار ملفات</Text>
          </TouchableOpacity>
        </View>
        {selectedIds.length === 0 ? (
          <Text style={styles.empty}>لم يتم اختيار ملفات بعد.</Text>
        ) : (
          selectedIds.map((id, i) => {
            const t = pool.find((x) => x.id === id);
            return (
              <View key={id} style={styles.stop}>
                <View style={styles.stopNum}><Text style={styles.stopNumText}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopName}>{t?.name || "ملف #" + id}</Text>
                  <Text style={styles.stopMeta}>{t?.tax_number}</Text>
                </View>
                <TouchableOpacity onPress={() => moveUp(i)}><Ionicons name="arrow-up" size={20} color={colors.muted} /></TouchableOpacity>
                <TouchableOpacity onPress={() => moveDown(i)}><Ionicons name="arrow-down" size={20} color={colors.muted} /></TouchableOpacity>
                <TouchableOpacity onPress={() => toggleFile(id)}><Ionicons name="trash" size={20} color={colors.danger} /></TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="send" size={18} color={colors.white} /><Text style={styles.btnText}>إسناد المهمة وإرسالها</Text></>)}
      </TouchableOpacity>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>اختر المأمور</Text>
            <FlatList
              data={staff}
              keyExtractor={(s) => s.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalRow} onPress={() => { setSelectedStaff(item); setPickerOpen(false); }}>
                  <Text style={styles.modalRowText}>{item.full_name} — رقم {item.employee_number || "—"}</Text>
                  <Text style={styles.modalRowRole}>{ROLE_LABELS[item.role]}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>لا يوجد مأمورون في مأموريتك.</Text>}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setPickerOpen(false)}>
              <Text style={styles.modalCloseText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={filesOpen} transparent animationType="slide" onRequestClose={() => setFilesOpen(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxHeight: "85%" }]}>
            <Text style={styles.modalTitle}>اختيار ملفات</Text>
            <TextInput style={styles.input} placeholder="بحث بالاسم أو الرقم" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} />
            <FlatList
              data={filtered.slice(0, 200)}
              keyExtractor={(t) => String(t.id)}
              renderItem={({ item }) => {
                const checked = selectedIds.includes(item.id);
                return (
                  <TouchableOpacity style={styles.modalRow} onPress={() => toggleFile(item.id)}>
                    <Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={checked ? colors.primary : colors.muted} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalRowText}>{item.name || "—"}</Text>
                      <Text style={styles.modalRowRole}>{item.tax_number || ""}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={[styles.modalClose, { backgroundColor: colors.primary }]} onPress={() => setFilesOpen(false)}>
              <Text style={[styles.modalCloseText, { color: colors.white }]}>تم</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs, marginTop: spacing.sm },
  picker: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, marginBottom: spacing.md },
  pickerText: { color: colors.text, fontSize: 15, fontWeight: "600", textAlign: "right", flex: 1 },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, fontSize: 15, color: colors.text, textAlign: "right", marginBottom: spacing.md },
  fileHead: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md, marginBottom: spacing.sm },
  addFiles: { flexDirection: "row-reverse", alignItems: "center", gap: 4, backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  addFilesText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  stop: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.xs, ...shadow },
  stopNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  stopNumText: { color: colors.white, fontWeight: "800" },
  stopName: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right" },
  stopMeta: { fontSize: 12, color: colors.muted, textAlign: "right" },
  empty: { color: colors.muted, textAlign: "center", padding: spacing.md, fontSize: 14 },
  btn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, margin: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.md },
  modalRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalRowText: { color: colors.text, fontSize: 14, textAlign: "right" },
  modalRowRole: { color: colors.muted, fontSize: 12, textAlign: "right" },
  modalClose: { marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  modalCloseText: { color: colors.muted, fontWeight: "800" },
});
