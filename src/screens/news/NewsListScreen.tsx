// قائمة الأخبار: عرض + (للمصرّح بهم) إضافة وتعديل وحذف
import React, { useCallback, useLayoutEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { listNews, deleteNews } from "../../data/news";
import { useAuth } from "../../context/AuthContext";
import { News, ROLE_LABELS } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

const CAN_EDIT = ["admin", "office_head", "it_manager"];

export default function NewsListScreen() {
  const navigation = useNavigation<any>();
  const { profile } = useAuth();
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const canEdit = profile && CAN_EDIT.includes(profile.role);

  useLayoutEffect(() => { navigation.setOptions({ title: "آخر الأخبار" }); }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listNews()); } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmDelete(n: News) {
    Alert.alert("حذف الخبر", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: async () => { await deleteNews(n.id); load(); } },
    ]);
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
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              {item.audience !== "all" && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>
                    {item.audience === "office" ? "مأمورية" : `دور: ${ROLE_LABELS[item.target_role ?? ""] ?? "—"}`}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.content} numberOfLines={4}>{item.content}</Text>
            <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
            {canEdit && (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => navigation.navigate("NewsForm", { id: item.id })}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>لا توجد أخبار بعد.</Text> : null}
      />
      {canEdit && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("NewsForm", {})}>
          <Ionicons name="add" size={24} color={colors.white} />
          <Text style={styles.fabText}>إضافة خبر</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: 96 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  head: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs, gap: spacing.sm },
  title: { flex: 1, fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "right" },
  tag: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  tagText: { color: colors.primaryDark, fontSize: 11, fontWeight: "700" },
  content: { fontSize: 14, color: colors.text, textAlign: "right", lineHeight: 22, marginVertical: spacing.xs },
  date: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: spacing.xs },
  actions: { flexDirection: "row-reverse", gap: spacing.lg, marginTop: spacing.sm },
  empty: { color: colors.muted, textAlign: "center", marginTop: 80, fontSize: 15 },
  fab: { position: "absolute", bottom: spacing.xl, left: spacing.lg, flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, gap: spacing.xs, ...shadow },
  fabText: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
