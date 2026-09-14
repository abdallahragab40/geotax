// تفاصيل الشكوى ومعالجتها (للموظف)
import React, { useCallback, useLayoutEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StatusChips } from "../../components/Field";
import { getComplaint, updateComplaint } from "../../data/requests";
import { createTaxpayerFile } from "../../data/registry";
import { Complaint, COMPLAINT_STATUS } from "../../types";
import LeafletMap from "../../components/LeafletMap";
import { openDirections } from "../../data/directions";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime, formatCoords } from "../../utils";

type R = RouteProp<{ params: { id: number } }, "params">;

const STATUS_COLORS: Record<string, string> = {
  "جديد": "#2563EB", "قيد المراجعة": "#D97706", "محوّل": "#7C3AED", "منتهي": "#0E7C66",
};

export default function ComplaintDetailScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<any>();
  const id = route.params.id;
  const [c, setC] = useState<Complaint | null>(null);

  useLayoutEffect(() => { navigation.setOptions({ title: "الشكوى" }); }, [navigation]);

  const load = useCallback(async () => { setC(await getComplaint(id)); }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function setStatus(status: string) {
    await updateComplaint(id, { status });
    load();
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

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
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

        {(c.photos?.length ?? 0) > 0 && (
          <>
            <Text style={styles.section}>الصور المرفقة ({c.photos!.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {c.photos!.map((url) => (
                <Image key={url} source={{ uri: url }} style={styles.photo} />
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
});

