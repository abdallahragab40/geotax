// قائمة سجلات إدارة معيّنة (عامة) + بحث
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { DEPARTMENTS, statusColor } from "../../data/departments";
import { listRecords } from "../../data/api";
import { DeptRecord } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";
import type { InternalStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<InternalStackParamList, "DeptList">;

export default function DepartmentListScreen({ navigation, route }: Props) {
  const dept = DEPARTMENTS[route.params.deptKey];
  const [records, setRecords] = useState<DeptRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: dept.title });
  }, [navigation, dept]);

  const load = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        setRecords(await listRecords(dept.table, q));
      } catch {
        // أخطاء الشبكة تُتجاهل بصمت هنا (يظهر التحديث الفارغ)
      } finally {
        setLoading(false);
      }
    },
    [dept.table]
  );

  useFocusEffect(
    useCallback(() => {
      load(search);
    }, [load, search])
  );

  const renderItem = ({ item }: { item: DeptRecord }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("DeptDetail", { deptKey: dept.key, id: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name || "بدون اسم"}
        </Text>
        {!!item.status && (
          <View style={[styles.badge, { backgroundColor: statusColor(dept, item.status) }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        )}
      </View>
      <View style={styles.row}>
        <Ionicons name="pricetag-outline" size={15} color={dept.color} />
        <Text style={styles.tax}>{item.tax_number}</Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="time-outline" size={15} color={colors.muted} />
        <Text style={styles.meta}>{formatDateTime(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="بحث برقم التسجيل أو الاسم"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            load(t);
          }}
        />
      </View>

      <FlatList
        data={records}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(search)} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name={dept.icon as any} size={56} color={colors.border} />
              <Text style={styles.emptyText}>لا توجد سجلات بعد.</Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: dept.color }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("DeptForm", { deptKey: dept.key })}
      >
        <Ionicons name="add" size={26} color={colors.white} />
        <Text style={styles.fabText}>إضافة</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surface,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, height: 44, color: colors.text, textAlign: "right", fontSize: 15 },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 96 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  cardHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  name: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "right", marginLeft: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginTop: 3 },
  tax: { fontSize: 15, fontWeight: "700", color: colors.primary, textAlign: "right" },
  meta: { fontSize: 13, color: colors.muted, textAlign: "right" },
  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { color: colors.muted, marginTop: spacing.md, fontSize: 15 },
  fab: {
    position: "absolute",
    bottom: spacing.xl,
    left: spacing.lg,
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    gap: spacing.xs,
    ...shadow,
  },
  fabText: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
