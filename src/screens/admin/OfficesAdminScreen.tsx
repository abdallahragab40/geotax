// إدارة المأموريات (الإدارة العليا): عرض/إضافة/تعديل/تفعيل/إيقاف
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
  Modal, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { listOffices } from "../../data/offices";
import { createOffice, setOfficeStatus, updateOffice } from "../../data/news";
import { Office } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";

export default function OfficesAdminScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Office | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [region, setRegion] = useState("");
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "إدارة المأموريات" }); }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listOffices(false)); } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openNew() {
    setEditing(null); setCode(""); setName(""); setGovernorate(""); setRegion(""); setModal(true);
  }

  function openEdit(o: Office) {
    setEditing(o);
    setCode(o.code); setName(o.name); setGovernorate(o.governorate); setRegion(o.region);
    setModal(true);
  }

  async function save() {
    if (!code.trim() || !name.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل الكود والاسم.");
      return;
    }
    setSaving(true);
    try {
      const payload = { code: code.trim(), name: name.trim(), governorate: governorate.trim(), region: region.trim() };
      if (editing) await updateOffice(editing.id, payload);
      else await createOffice(payload);
      setModal(false);
      load();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر الحفظ.");
    } finally { setSaving(false); }
  }

  async function toggle(o: Office) {
    const next = o.status === "active" ? "inactive" : "active";
    try { await setOfficeStatus(o.id, next as any); load(); } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر التغيير.");
    }
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
            <View style={styles.head}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={[styles.chip, { backgroundColor: item.status === "active" ? colors.primary : colors.muted }]}>
                <Text style={styles.chipText}>{item.status === "active" ? "نشطة" : "موقوفة"}</Text>
              </View>
            </View>
            <Text style={styles.line}>الكود: {item.code}</Text>
            {!!item.governorate && <Text style={styles.line}>المحافظة: {item.governorate}</Text>}
            {!!item.region && <Text style={styles.line}>المنطقة: {item.region}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actBtn} onPress={() => openEdit(item)}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={styles.actText}>تعديل</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actBtn} onPress={() => toggle(item)}>
                <Ionicons name={item.status === "active" ? "pause" : "play"} size={18} color={colors.warning} />
                <Text style={styles.actText}>{item.status === "active" ? "إيقاف" : "تفعيل"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>لا توجد مأموريات.</Text> : null}
      />

      <TouchableOpacity style={styles.fab} onPress={openNew}>
        <Ionicons name="add" size={24} color={colors.white} />
        <Text style={styles.fabText}>إضافة مأمورية</Text>
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? "تعديل مأمورية" : "إضافة مأمورية"}</Text>
            <TextInput style={styles.input} placeholder="كود المأمورية" placeholderTextColor={colors.muted} value={code} onChangeText={setCode} />
            <TextInput style={styles.input} placeholder="اسم المأمورية" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="المحافظة" placeholderTextColor={colors.muted} value={governorate} onChangeText={setGovernorate} />
            <TextInput style={styles.input} placeholder="المنطقة (اختياري)" placeholderTextColor={colors.muted} value={region} onChangeText={setRegion} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancel]} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>حفظ</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: 96 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  head: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "right" },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  chipText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  line: { fontSize: 13, color: colors.muted, textAlign: "right", marginTop: 2 },
  actions: { flexDirection: "row-reverse", gap: spacing.md, marginTop: spacing.sm },
  actBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  actText: { fontSize: 13, fontWeight: "700", color: colors.text },
  empty: { color: colors.muted, textAlign: "center", marginTop: 80, fontSize: 15 },
  fab: { position: "absolute", bottom: spacing.xl, left: spacing.lg, flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, gap: spacing.xs, ...shadow },
  fabText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, fontSize: 15, color: colors.text, textAlign: "right", marginBottom: spacing.md },
  modalActions: { flexDirection: "row-reverse", gap: spacing.md },
  modalBtn: { flex: 1, height: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cancel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.text, fontWeight: "700", fontSize: 15 },
  saveBtn: { backgroundColor: colors.primary },
  saveText: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
