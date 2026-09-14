// شاشة الإشعارات (للممول والموظف معًا)
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  listNotifications, markAllNotificationsRead, markNotificationRead,
} from "../../data/notifications_api";
import { Notification } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

const KIND_ICON: Record<string, string> = {
  message: "chatbubble",
  task: "git-network",
  request: "clipboard",
  appointment: "calendar",
  attendance: "person",
  file_approved: "checkmark-circle",
  file_rejected: "close-circle",
  general: "information-circle",
};
const KIND_COLOR: Record<string, string> = {
  message: "#0D9488",
  task: "#D97706",
  request: "#7C3AED",
  appointment: "#2563EB",
  attendance: "#0891B2",
  file_approved: "#0E7C66",
  file_rejected: "#DC2626",
  general: "#64748B",
};

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "الإشعارات" }); }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listNotifications()); } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function tap(n: Notification) {
    if (!n.read) await markNotificationRead(n.id);
    setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
  }

  async function markAll() {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {items.some((x) => !x.read) && (
        <TouchableOpacity style={styles.markAll} onPress={markAll}>
          <Ionicons name="checkmark-done" size={18} color={colors.primary} />
          <Text style={styles.markAllText}>تعليم الكل كمقروء</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.read && { backgroundColor: "#F1F5F9", borderRightWidth: 4, borderRightColor: KIND_COLOR[item.kind] ?? colors.muted }]}
            activeOpacity={0.7}
            onPress={() => tap(item)}
          >
            <View style={[styles.iconWrap, { backgroundColor: KIND_COLOR[item.kind] ?? colors.muted }]}>
              <Ionicons name={(KIND_ICON[item.kind] ?? "notifications") as any} size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, !item.read && { fontWeight: "800" }]}>{item.title}</Text>
              {!!item.body && <Text style={styles.body} numberOfLines={3}>{item.body}</Text>}
              <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={56} color={colors.border} />
            <Text style={styles.emptyText}>لا توجد إشعارات بعد.</Text>
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  markAll: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  markAllText: { color: colors.primary, fontWeight: "800", fontSize: 14 },
  list: { padding: spacing.lg },
  card: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, color: colors.text, textAlign: "right" },
  body: { fontSize: 13, color: colors.muted, textAlign: "right", marginTop: 2 },
  date: { fontSize: 11, color: colors.muted, textAlign: "right", marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { color: colors.muted, marginTop: spacing.md, fontSize: 15, textAlign: "center" },
});
