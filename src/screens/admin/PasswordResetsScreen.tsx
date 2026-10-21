// طلبات استعادة كلمة مرور الممولين — لمدير الحاسب ورئيس المأمورية
// خطوات المعالجة: الاتصال بالممول على رقمه المسجّل للتحقق من هويته ← تعيين كلمة مؤقتة ← إبلاغه بها هاتفيًا
import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Linking, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  listPasswordResetRequests, resolvePasswordReset, PasswordResetRequest,
} from "../../data/news";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

const STATUS_LABEL: Record<string, string> = { new: "جديد", done: "تمت المعالجة", rejected: "مرفوض" };
const STATUS_COLOR: Record<string, string> = { new: colors.warning, done: colors.primary, rejected: colors.danger };

function tempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function PasswordResetsScreen() {
  const [items, setItems] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await listPasswordResetRequests()); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function approve(r: PasswordResetRequest) {
    Alert.alert(
      "تأكيد الهوية",
      `اتصل بالممول على ${r.phone} وتأكد من هويته قبل إعادة التعيين.\n\nهل تم التحقق؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تم — أنشئ كلمة مؤقتة",
          onPress: async () => {
            const pwd = tempPassword();
            try {
              await resolvePasswordReset(r.id, pwd);
              Alert.alert("كلمة المرور المؤقتة", `${pwd}\n\nأبلغها للممول هاتفيًا — سيُطلب منه تغييرها عند الدخول.`);
              load();
            } catch (e: any) {
              Alert.alert("تعذّر التنفيذ", e?.message ?? "حاول مجددًا.");
            }
          },
        },
      ]
    );
  }

  function reject(r: PasswordResetRequest) {
    Alert.alert("رفض الطلب", "رفض طلب استعادة كلمة المرور؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "رفض",
        style: "destructive",
        onPress: async () => {
          try { await resolvePasswordReset(r.id, null, true); load(); }
          catch (e: any) { Alert.alert("تعذّر التنفيذ", e?.message ?? "حاول مجددًا."); }
        },
      },
    ]);
  }

  const renderItem = ({ item }: { item: PasswordResetRequest }) => (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.name}>{item.full_name || "ممول"}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] ?? colors.muted }]}>
          <Text style={styles.badgeText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
        </View>
      </View>
      {!!item.tax_number && <Text style={styles.line}>الرقم الضريبي: {item.tax_number}</Text>}
      <Text style={styles.line}>الرقم القومي: {item.national_id}</Text>
      <Text style={styles.line}>التاريخ: {formatDateTime(item.created_at)}</Text>

      {item.status === "new" && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: "#2563EB" }]} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
            <Ionicons name="call" size={16} color={colors.white} />
            <Text style={styles.btnText}>{item.phone}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => approve(item)}>
            <Ionicons name="key" size={16} color={colors.white} />
            <Text style={styles.btnText}>إعادة التعيين</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => reject(item)}>
            <Text style={[styles.btnText, { color: colors.danger }]}>رفض</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Ionicons name="key-outline" size={56} color={colors.border} />
            <Text style={styles.emptyText}>لا توجد طلبات استعادة كلمة مرور.</Text>
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow },
  top: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  name: { fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "right", flex: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  line: { fontSize: 13, color: colors.muted, textAlign: "right", marginTop: 2 },
  actions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  btn: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  rejectBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger },
  btnText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { color: colors.muted, marginTop: spacing.md, fontSize: 15 },
});
