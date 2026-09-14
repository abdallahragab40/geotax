// سجل العمليات — للأدمن ورئيس المأمورية ومدير الحاسب
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

interface AuditRow {
  id: number;
  user_name: string;
  employee_number: string;
  operation: string;
  entity_type: string;
  entity_id: number | null;
  details: any;
  created_at: string;
}

export default function AuditLogScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useLayoutEffect(() => { navigation.setOptions({ title: "سجل العمليات" }); }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("audit_log").select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setItems((data as AuditRow[]) ?? []);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const q = search.trim();
  const filtered = !q ? items : items.filter((r) =>
    (r.user_name ?? "").includes(q) ||
    (r.employee_number ?? "").includes(q) ||
    (r.operation ?? "").includes(q));

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="بحث بالاسم/رقم الحاسب/نوع العملية"
          placeholderTextColor={colors.muted}
          value={search} onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.head}>
              <View style={styles.opChip}><Text style={styles.opText}>{item.operation}</Text></View>
              <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
            </View>
            <Text style={styles.row}>المستخدم: {item.user_name || "—"}{item.employee_number ? ` (${item.employee_number})` : ""}</Text>
            {!!item.entity_type && <Text style={styles.row}>الكيان: {item.entity_type}{item.entity_id ? ` #${item.entity_id}` : ""}</Text>}
            {item.details && Object.keys(item.details).length > 0 && (
              <Text style={styles.row} numberOfLines={2}>{JSON.stringify(item.details)}</Text>
            )}
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>لا توجد عمليات.</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBox: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, margin: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, height: 42, color: colors.text, textAlign: "right", fontSize: 14 },
  list: { padding: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, ...shadow },
  head: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  opChip: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  opText: { color: colors.primaryDark, fontWeight: "800", fontSize: 12 },
  date: { fontSize: 11, color: colors.muted },
  row: { fontSize: 13, color: colors.text, textAlign: "right", marginTop: 2 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 80, fontSize: 15 },
});
