// المهام الواردة (للمأمور) — مرسلة من المراجع
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { listMyTasks } from "../../data/survey";
import { Task, TASK_STATUS_COLORS } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

const PRIORITY_COLORS: Record<string, string> = {
  "عاجلة": "#DC2626", "مرتفعة": "#D97706", "عادية": "#2563EB", "منخفضة": "#64748B",
};

export default function MyTasksScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "المهام الواردة" }); }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listMyTasks()); } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => navigation.navigate("TaskDetail", { id: item.id })}>
            <View style={styles.head}>
              <Text style={styles.id}>مهمة #{item.id}</Text>
              <View style={[styles.badge, { backgroundColor: TASK_STATUS_COLORS[item.status] ?? colors.muted }]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.priorityChip, { backgroundColor: PRIORITY_COLORS[item.priority] ?? colors.muted }]}>
                <Text style={styles.priorityText}>{item.priority}</Text>
              </View>
              <Text style={styles.meta}>{item.taxpayer_ids?.length ?? 0} ملف</Text>
            </View>
            {!!item.due_date && <Text style={styles.meta}>📅 موعد التنفيذ: {item.due_date}</Text>}
            <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Ionicons name="git-network-outline" size={56} color={colors.border} />
            <Text style={styles.emptyText}>لا توجد مهام مسندة إليك بعد.</Text>
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  head: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  id: { fontSize: 16, fontWeight: "800", color: colors.text },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, marginVertical: spacing.xs },
  priorityChip: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  priorityText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  meta: { fontSize: 13, color: colors.muted, textAlign: "right", marginTop: 2 },
  date: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: spacing.xs },
  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { color: colors.muted, marginTop: spacing.md, fontSize: 15, textAlign: "center" },
});
