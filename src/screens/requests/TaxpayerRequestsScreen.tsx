// شاشة طلبات الممول: اختيار الإدارة + عرض طلباته + طلب جديد
import React, { useCallback, useLayoutEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { listMyRequests } from "../../data/requests";
import { DEPARTMENT_LIST } from "../../data/departments";
import { Request, REQUEST_STATUS_COLORS } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

export default function TaxpayerRequestsScreen() {
  const navigation = useNavigation<any>();
  const [dept, setDept] = useState("survey");
  const [items, setItems] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "الطلبات" }); }, [navigation]);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    try { setItems(await listMyRequests(d)); } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(dept); }, [load, dept]));

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.tabs}>
        {DEPARTMENT_LIST.map((d) => {
          const active = dept === d.key;
          return (
            <TouchableOpacity key={d.key} style={[styles.tab, active && { backgroundColor: d.color }]} onPress={() => { setDept(d.key); load(d.key); }}>
              <Text style={[styles.tabText, active && { color: colors.white }]}>{d.title.replace("إدارة ", "")}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(dept)} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.type}>{item.type}</Text>
              <View style={[styles.badge, { backgroundColor: REQUEST_STATUS_COLORS[item.status] ?? colors.muted }]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            {!!item.appointment && <Text style={styles.line}>📅 الموعد: {item.appointment}</Text>}
            {!!item.response && <Text style={styles.resp}>الرد: {item.response}</Text>}
            <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>لا توجد طلبات في هذه الإدارة.</Text> : null}
      />

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => navigation.navigate("NewRequest", { department: dept })}>
        <Ionicons name="add" size={24} color={colors.white} />
        <Text style={styles.fabText}>طلب جديد</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: "row-reverse", gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.sm },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  tabText: { fontWeight: "700", color: colors.text, fontSize: 13 },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  head: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  type: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "right" },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  line: { fontSize: 14, color: colors.text, textAlign: "right", marginTop: 2 },
  resp: { fontSize: 14, color: colors.primary, textAlign: "right", marginTop: 4, fontWeight: "600" },
  date: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 4 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 70, fontSize: 15 },
  fab: { position: "absolute", bottom: spacing.xl, left: spacing.lg, flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.accent, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, gap: spacing.xs, ...shadow },
  fabText: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
