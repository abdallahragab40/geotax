// الشاشة الرئيسية للممول — 5 أيقونات (ملفي، آخر الأخبار، الطلبات، المراسلات، الإشعارات)
import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { countUnreadNotifications } from "../../data/notifications_api";
import { PRIVACY_POLICY_URL } from "../../lib/config";
import { colors, radius, spacing, shadow } from "../../theme";

export default function TaxpayerHomeScreen() {
  const navigation = useNavigation<any>();
  const { profile, signOut, deleteAccount } = useAuth();
  const [unread, setUnread] = useState(0);

  useFocusEffect(useCallback(() => {
    countUnreadNotifications().then(setUnread).catch(() => {});
  }, []));

  // ممول جديد بدون رقم ضريبي → يُحوّل لطلب فتح ملف
  const hasFile = !!profile?.tax_number;

  function confirmLogout() {
    Alert.alert("تسجيل الخروج", "هل تريد الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: () => signOut() },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "حذف الحساب",
      "سيتم حذف حسابك ورسائلك وإشعاراتك نهائيًا. يبقى ملفك الضريبي لدى المأمورية وفق القانون، ويمكنك إنشاء حساب جديد لاحقًا.\n\nهل تريد المتابعة؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف نهائي",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
            } catch (e: any) {
              Alert.alert("تعذّر حذف الحساب", e?.message ?? "حاول مجددًا.");
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>مرحبًا</Text>
          <Text style={styles.name}>{profile?.full_name || "ممول"}</Text>
          {hasFile ? (
            <Text style={styles.tax}>الرقم الضريبي: {profile?.tax_number}</Text>
          ) : (
            <Text style={styles.warn}>لا يوجد ملف ضريبي بعد — اطلب فتح ملف</Text>
          )}
        </View>
        <TouchableOpacity onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        <Tile icon="folder-open" color="#0E7C66" title="ملفي" disabled={!hasFile}
          onPress={() => hasFile ? navigation.navigate("TaxpayerMyFile") : Alert.alert("لا يوجد ملف", "قدّم طلب فتح ملف أولًا.")} />
        <Tile icon="newspaper" color="#2563EB" title="آخر الأخبار"
          onPress={() => navigation.navigate("NewsList")} />
        <Tile icon="clipboard" color="#7C3AED" title="الطلبات"
          onPress={() => navigation.navigate("TaxpayerRequests")} />
        <Tile icon="chatbubbles" color="#0D9488" title="المراسلات"
          onPress={() => navigation.navigate("Conversations")} />
        <Tile icon="notifications" color="#D97706" title="الإشعارات" badge={unread}
          onPress={() => navigation.navigate("Notifications")} />
        {!hasFile && (
          <Tile icon="add-circle" color="#DC2626" title="طلب فتح ملف ضريبي"
            onPress={() => navigation.navigate("NewRequest", { department: "survey", forcedType: "فتح ملف ضريبي" })} />
        )}

        <View style={styles.footer}>
          {!!PRIVACY_POLICY_URL && (
            <Text style={styles.footerLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
              سياسة الخصوصية
            </Text>
          )}
          <Text style={[styles.footerLink, { color: colors.danger }]} onPress={confirmDeleteAccount}>
            حذف الحساب
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ icon, color, title, onPress, disabled, badge }: { icon: string; color: string; title: string; onPress: () => void; disabled?: boolean; badge?: number }) {
  return (
    <TouchableOpacity style={[styles.tile, disabled && { opacity: 0.5 }]} activeOpacity={0.85} onPress={onPress} disabled={disabled}>
      <View style={[styles.iconWrap, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={28} color={colors.white} />
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      {badge != null && badge > 0 && (
        <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  hello: { fontSize: 14, color: colors.muted, textAlign: "right" },
  name: { fontSize: 20, fontWeight: "800", color: colors.text, textAlign: "right" },
  tax: { fontSize: 13, color: colors.primary, fontWeight: "700", textAlign: "right", marginTop: 2 },
  warn: { fontSize: 13, color: colors.danger, fontWeight: "700", textAlign: "right", marginTop: 2 },
  grid: { padding: spacing.lg, flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.md, justifyContent: "flex-start" },
  tile: { width: "47%", aspectRatio: 1, backgroundColor: colors.surface, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: spacing.sm, position: "relative", ...shadow },
  iconWrap: { width: 60, height: 60, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  tileTitle: { fontSize: 15, fontWeight: "800", color: colors.text, textAlign: "center" },
  badge: { position: "absolute", top: 10, left: 10, backgroundColor: colors.danger, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  footer: { width: "100%", flexDirection: "row-reverse", justifyContent: "center", gap: spacing.xl, marginTop: spacing.lg },
  footerLink: { color: colors.muted, fontSize: 13, fontWeight: "700", paddingVertical: spacing.sm },
});
