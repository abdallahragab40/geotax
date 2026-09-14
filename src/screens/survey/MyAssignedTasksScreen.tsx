// متابعة المهام التي أسندتها (للمراجع)
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { listAssignedByMe } from "../../data/survey";
import { Task, TASK_STATUS_COLORS } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

export default function MyAssignedTasksScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "متابعة المهام المسندة" }); }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listAssignedByMe()); } catch {} finally { setLoading(false); }
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
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("TaskDetail", { id: item.id })}>
            <View style={styles.head}>
              <Text style={styles.id}>مهمة #{item.id}</Text>
              <View style={[styles.badge, { backgroundColor: TASK_STATUS_COLORS[item.status] ?? colors.muted }]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.meta}>الأولوية: {item.priority}</Text>
            <Text style={styles.meta}>عدد الملفات: {item.taxpayer_ids?.length ?? 0}</Text>
            {!!item.due_date && <Text style={styles.meta}>📅 موعد التنفيذ: {item.due_date}</Text>}
            {!!item.completed_at && <Text style={[styles.meta, { color: "#0E7C66" }]}>✅ منتهية: {formatDateTime(item.completed_at)}</Text>}
            <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>لم تُسند مهامًا بعد.</Text> : null}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("AssignTask", { taskType: "survey" })}>
        <Ionicons name="add" size={24} color={colors.white} />
        <Text style={styles.fabText}>إسناد مهمة</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: 96 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  head: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  id: { fontSize: 16, fontWeight: "800", color: colors.text },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  meta: { fontSize: 13, color: colors.muted, textAlign: "right", marginTop: 2 },
  date: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: spacing.xs },
  empty: { color: colors.muted, textAlign: "center", marginTop: 80, fontSize: 15 },
  fab: { position: "absolute", bottom: spacing.xl, left: spacing.lg, flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, gap: spacing.xs, ...shadow },
  fabText: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
