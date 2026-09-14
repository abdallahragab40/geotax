// قائمة الطلبات الواردة لإدارة (للموظف)
import React, { useCallback, useLayoutEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { listRequestsByDept } from "../../data/requests";
import { Request, REQUEST_STATUS_COLORS } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

type R = RouteProp<{ params: { department: string } }, "params">;

export default function RequestsListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<R>();
  const dept = route.params.department;
  const [items, setItems] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "الطلبات" });
  }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listRequestsByDept(dept)); } catch {} finally { setLoading(false); }
  }, [dept]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: Request }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => navigation.navigate("RequestDetail", { id: item.id })}>
      <View style={styles.head}>
        <Text style={styles.type}>{item.type}</Text>
        <View style={[styles.badge, { backgroundColor: REQUEST_STATUS_COLORS[item.status] ?? colors.muted }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      {!!item.name && <Text style={styles.line}>الاسم: {item.name}</Text>}
      {!!item.tax_number && <Text style={styles.line}>الرقم الضريبي: {item.tax_number}</Text>}
      <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>لا توجد طلبات بعد.</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  head: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  type: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "right" },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  line: { fontSize: 14, color: colors.text, textAlign: "right", marginTop: 2 },
  date: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 4 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 70, fontSize: 15 },
});
