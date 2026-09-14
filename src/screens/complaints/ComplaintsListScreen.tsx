// قائمة الشكاوى (للموظف)
import React, { useCallback, useLayoutEffect, useState } from "react";
import { Text, FlatList, TouchableOpacity, StyleSheet, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { listComplaints } from "../../data/requests";
import { Complaint } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

export default function ComplaintsListScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "الشكاوى" }); }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listComplaints()); } catch {} finally { setLoading(false); }
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
          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => navigation.navigate("ComplaintDetail", { id: item.id })}>
            <View style={styles.head}>
              <Text style={styles.accused} numberOfLines={1}>ضد: {item.accused_name || "غير محدد"}</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{item.status}</Text></View>
            </View>
            <Text style={styles.line} numberOfLines={2}>{item.details || "بدون تفاصيل"}</Text>
            <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>لا توجد شكاوى بعد.</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderRightWidth: 4, borderRightColor: "#DB2777", ...shadow },
  head: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  accused: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "right" },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: "#DB2777" },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  line: { fontSize: 14, color: colors.muted, textAlign: "right" },
  date: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 4 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 70, fontSize: 15 },
});
