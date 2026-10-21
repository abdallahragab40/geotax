// الخريطة التفاعلية الكاملة: ممولون (5 ألوان حسب الحالة) + فروع + مخازن + بحث
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { listRegistry } from "../data/registry";
import LeafletMap, { MapMarker } from "../components/LeafletMap";
import { Branch, Taxpayer, Warehouse } from "../types";
import { colors, radius, spacing } from "../theme";
import type { InternalStackParamList } from "../navigation";

type Props = NativeStackScreenProps<InternalStackParamList, "Map">;

// ألوان الخريطة حسب المواصفة
const COL = {
  active: "#16A34A",       // أخضر — قائم
  partial_stop: "#EAB308", // أصفر — توقف جزئي
  final_stop: "#DC2626",   // أحمر — توقف نهائي
  new_act: "#2563EB",      // أزرق — نشاط جديد
  incomplete: "#64748B",   // رمادي — غير مكتمل / قيد الإجراء
  branch: "#7C3AED",       // بنفسجي — فرع
  warehouse: "#0891B2",    // فيروزي — مخزن
};

function taxpayerColor(t: Taxpayer): string {
  if (t.activity_status === "final_stop") return COL.final_stop;
  if (t.activity_status === "partial_stop") return COL.partial_stop;
  if (t.source === "request" || t.status === "طلب جديد") return COL.new_act;
  if (t.status === "قيد الحصر" || !t.tax_number) return COL.incomplete;
  return COL.active;
}

type Lookup = { kind: "taxpayer" | "branch" | "warehouse"; id: number };

export default function MapScreen({ navigation }: Props) {
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [search, setSearch] = useState("");
  const lookup = useRef<Record<number, Lookup>>({});

  useLayoutEffect(() => { navigation.setOptions({ title: "الخريطة التفاعلية" }); }, [navigation]);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const tps = await listRegistry();
        setTaxpayers(tps);
        const [br, wh] = await Promise.all([
          supabase.from("branches").select("*"),
          supabase.from("warehouses").select("*"),
        ]);
        setBranches((br.data as Branch[]) ?? []);
        setWarehouses((wh.data as Warehouse[]) ?? []);
      } catch {}
    })();
  }, []));

  // تصفية حسب البحث
  const q = search.trim();
  const matches = (s: string | null | undefined) => !q || (s ?? "").includes(q);

  const markers: MapMarker[] = useMemo(() => {
    const arr: MapMarker[] = [];
    const map: Record<number, Lookup> = {};
    let sid = 0;

    for (const t of taxpayers) {
      if (t.latitude == null || t.longitude == null) continue;
      if (!matches(t.tax_number) && !matches(t.name) && !matches(t.activity) && !matches(t.address)) continue;
      const id = sid++;
      arr.push({
        id,
        lat: t.latitude, lng: t.longitude,
        title: t.name || "ممول",
        subtitle: `${t.tax_number || "بلا رقم"} — ${t.activity || ""}`,
        color: taxpayerColor(t),
      });
      map[id] = { kind: "taxpayer", id: t.id };
    }

    for (const b of branches) {
      if (b.latitude == null || b.longitude == null) continue;
      if (!matches(b.name) && !matches(b.address)) continue;
      const id = sid++;
      arr.push({
        id, lat: b.latitude, lng: b.longitude,
        title: `فرع: ${b.name || "—"}`,
        subtitle: b.address || "",
        color: COL.branch,
      });
      map[id] = { kind: "branch", id: b.id };
    }

    for (const w of warehouses) {
      if (w.latitude == null || w.longitude == null) continue;
      if (!matches(w.address)) continue;
      const id = sid++;
      arr.push({
        id, lat: w.latitude, lng: w.longitude,
        title: `مخزن`,
        subtitle: w.address || "",
        color: COL.warehouse,
      });
      map[id] = { kind: "warehouse", id: w.id };
    }

    lookup.current = map;
    return arr;
  }, [taxpayers, branches, warehouses, q]);

  function onPress(sid: number) {
    const t = lookup.current[sid];
    if (t?.kind === "taxpayer") navigation.navigate("TaxpayerFile", { id: t.id });
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="بحث برقم التسجيل / الاسم / النشاط / العنوان"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legendBar} contentContainerStyle={styles.legend}>
        <Legend color={COL.active} label="نشط" />
        <Legend color={COL.partial_stop} label="توقف جزئي" />
        <Legend color={COL.final_stop} label="توقف نهائي" />
        <Legend color={COL.new_act} label="جديد" />
        <Legend color={COL.incomplete} label="قيد الإجراء" />
        <Legend color={COL.branch} label="فرع" />
        <Legend color={COL.warehouse} label="مخزن" />
      </ScrollView>

      <View style={{ flex: 1 }}>
        <LeafletMap markers={markers} onMarkerPress={onPress} />
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{markers.length} نقطة معروضة</Text>
      </View>
    </SafeAreaView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBox: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, margin: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, height: 42, color: colors.text, textAlign: "right", fontSize: 14 },
  // بدون flexGrow: 0 يتمدد شريط التمرير الأفقي على أندرويد ويشدّ الشارات رأسيًا
  legendBar: { flexGrow: 0, flexShrink: 0 },
  legend: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, paddingBottom: spacing.xs },
  legItem: { flexDirection: "row-reverse", alignItems: "center", gap: 4, backgroundColor: colors.surface, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legLabel: { fontSize: 11, color: colors.text, fontWeight: "700" },
  statusBar: { paddingVertical: 6, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  statusText: { fontSize: 12, color: colors.muted, textAlign: "center", fontWeight: "700" },
});
