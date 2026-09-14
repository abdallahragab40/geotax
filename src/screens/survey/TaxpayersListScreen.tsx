// قائمة الممولين: 3 أقسام (مرفوعة / حصر / طلبات) + حالة التسجيل + تحديث لحظي
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { listRegistry } from "../../data/registry";
import { supabase } from "../../lib/supabase";
import { Taxpayer, TAXPAYER_SOURCES } from "../../types";

const SOURCE_LABEL: Record<string, string> = {
  imported: "مرفوع",
  survey: "حصر",
  request: "طلب فتح",
};
const SOURCE_COLOR: Record<string, string> = {
  imported: "#0E7C66",
  survey: "#2563EB",
  request: "#D97706",
};
import { colors, radius, spacing, shadow } from "../../theme";
import { formatCoords } from "../../utils";
import type { InternalStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<InternalStackParamList, "TaxpayersList">;

export default function TaxpayersListScreen({ navigation, route }: Props) {
  const mode = route.params?.mode ?? "view";
  const [source, setSource] = useState("all");
  const [items, setItems] = useState<Taxpayer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const sourceRef = useRef(source);
  const searchRef = useRef(search);
  sourceRef.current = source;
  searchRef.current = search;

  useLayoutEffect(() => {
    navigation.setOptions({ title: mode === "modify" ? "إضافات وتعديلات" : "الممولون" });
  }, [navigation, mode]);

  const load = useCallback(async (q: string, src: string) => {
    setLoading(true);
    try {
      // "all" يعني بدون تصفية على المصدر — يضم البيانات المرفوعة والحصر والطلبات
      setItems(await listRegistry(q, src === "all" ? undefined : src));
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(search, source); }, [load, search, source]));

  // تحديث لحظي عند أي تعديل/إضافة من المأمور
  useEffect(() => {
    const ch = supabase
      .channel("taxpayers-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "taxpayers" }, () => {
        load(searchRef.current, sourceRef.current);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const renderItem = ({ item }: { item: Taxpayer }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => navigation.navigate("TaxpayerFile", { id: item.id })}>
      <View style={styles.head}>
        <Text style={styles.name} numberOfLines={1}>{item.name || "بدون اسم"}</Text>
        <View style={[styles.regChip, { backgroundColor: item.registered ? colors.primary : colors.muted }]}>
          <Ionicons name={item.registered ? "checkmark-circle" : "ellipse-outline"} size={12} color={colors.white} />
          <Text style={styles.regText}>{item.registered ? "مسجل بالتطبيق" : "غير مسجل"}</Text>
        </View>
      </View>
      <View style={[styles.srcChip, { backgroundColor: SOURCE_COLOR[item.source] ?? colors.muted }]}>
        <Text style={styles.srcText}>{SOURCE_LABEL[item.source] ?? item.source}</Text>
      </View>
      {!!item.tax_number && (
        <View style={styles.row}><Ionicons name="pricetag-outline" size={15} color={colors.primary} /><Text style={styles.tax}>{item.tax_number}</Text></View>
      )}
      {!!item.activity && (
        <View style={styles.row}><Ionicons name="briefcase-outline" size={15} color={colors.muted} /><Text style={styles.meta} numberOfLines={1}>{item.activity}</Text></View>
      )}
      <View style={styles.row}><Ionicons name="navigate-outline" size={15} color={colors.muted} /><Text style={styles.meta}>{formatCoords(item.latitude, item.longitude)}</Text></View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.tabs}>
        {TAXPAYER_SOURCES.map((s) => {
          const active = source === s.key;
          return (
            <TouchableOpacity key={s.key} style={[styles.tab, active && styles.tabActive]} onPress={() => { setSource(s.key); load(search, s.key); }}>
              <Text style={[styles.tabText, active && { color: colors.white }]} numberOfLines={1}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="بحث برقم التسجيل / الاسم / الرقم القومي"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={(t) => { setSearch(t); load(t, source); }}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(search, source)} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>لا يوجد ممولون في هذا القسم.</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: "row-reverse", gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  tab: { flex: 1, paddingVertical: spacing.sm, paddingHorizontal: 4, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontWeight: "700", color: colors.text, fontSize: 12 },
  searchBox: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.surface, marginHorizontal: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, height: 44, color: colors.text, textAlign: "right", fontSize: 15 },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  head: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  name: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "right", marginLeft: spacing.sm },
  regChip: { flexDirection: "row-reverse", alignItems: "center", gap: 3, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  regText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  srcChip: { alignSelf: "flex-start", paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, marginBottom: 4 },
  srcText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginTop: 3 },
  tax: { fontSize: 15, fontWeight: "700", color: colors.primary, textAlign: "right" },
  meta: { flex: 1, fontSize: 13, color: colors.muted, textAlign: "right" },
  empty: { color: colors.muted, textAlign: "center", marginTop: 70, fontSize: 15 },
});
