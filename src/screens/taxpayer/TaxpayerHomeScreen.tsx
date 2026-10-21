// الشاشة الرئيسية للممول — 5 أيقونات (ملفي، آخر الأخبار، الطلبات، المراسلات، الإشعارات)
import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { countUnreadNotifications } from "../../data/notifications_api";
import { getMyActivationStatus, getMyFileRequest, verifyActivation } from "../../data/registry";
import { FILE_REQUEST_COLORS } from "../../types";
import { PRIVACY_POLICY_URL } from "../../lib/config";
import { colors, radius, spacing, shadow } from "../../theme";

export default function TaxpayerHomeScreen() {
  const navigation = useNavigation<any>();
  const { profile, signOut, deleteAccount, refreshProfile } = useAuth();
  const [unread, setUnread] = useState(0);
  const [activationPending, setActivationPending] = useState(false);
  const [fileReq, setFileReq] = useState<{ request_code: string; status: string; note: string } | null>(null);
  const [actCode, setActCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  // ممول جديد بدون رقم ضريبي → يُحوّل لطلب فتح ملف
  const hasFile = !!profile?.tax_number;

  useFocusEffect(useCallback(() => {
    countUnreadNotifications().then(setUnread).catch(() => {});
    if (!hasFile) {
      getMyActivationStatus().then((a) => setActivationPending(a?.status === "pending")).catch(() => {});
      getMyFileRequest().then(setFileReq).catch(() => {});
    }
  }, [hasFile]));

  async function activate() {
    if (!/^\d{6}$/.test(actCode.trim())) {
      Alert.alert("رمز غير صحيح", "رمز التفعيل يتكون من 6 أرقام.");
      return;
    }
    setVerifying(true);
    try {
      const ok = await verifyActivation(actCode);
      if (!ok) {
        Alert.alert("رمز غير صحيح", "تأكد من الرمز وحاول مجددًا.");
        return;
      }
      setActCode("");
      setActivationPending(false);
      await refreshProfile();
      Alert.alert("تم التفعيل", "تم ربط حسابك بملفك الضريبي.");
    } catch (e: any) {
      Alert.alert("تعذّر التفعيل", e?.message ?? "حاول مجددًا.");
    } finally {
      setVerifying(false);
    }
  }

  async function copyRequestCode() {
    if (!fileReq) return;
    await Clipboard.setStringAsync(fileReq.request_code);
    setCopied(true);
  }

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
          ) : activationPending ? (
            <Text style={styles.warn}>حسابك بانتظار التفعيل</Text>
          ) : fileReq ? (
            <Text style={styles.warn}>طلب فتح الملف: {fileReq.status}</Text>
          ) : (
            <Text style={styles.warn}>لا يوجد ملف ضريبي بعد — اطلب فتح ملف</Text>
          )}
        </View>
        <TouchableOpacity onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {/* تفعيل الحساب برمز المأمورية (ممول له ملف) */}
        {!hasFile && activationPending && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>تفعيل الحساب</Text>
            <Text style={styles.panelDesc}>
              سيتواصل معك موظف المأمورية للتحقق من شخصيتك ويعطيك رمز تفعيل من 6 أرقام. أدخله هنا لربط حسابك بملفك.
            </Text>
            <TextInput
              style={styles.codeInput}
              value={actCode}
              onChangeText={setActCode}
              placeholder="رمز التفعيل"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity style={styles.panelBtn} onPress={activate} disabled={verifying}>
              {verifying ? <ActivityIndicator color={colors.white} /> : <Text style={styles.panelBtnText}>تفعيل الحساب</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* طلب فتح الملف: الرقم + الحالة */}
        {!hasFile && !activationPending && fileReq && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>طلب فتح الملف</Text>
            <View style={styles.reqRow}>
              <Text selectable style={styles.reqCode}>{fileReq.request_code}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={copyRequestCode}>
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={20} color={colors.primary} />
                <Text style={styles.copyText}>{copied ? "تم النسخ" : "نسخ"}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.reqStatus, { backgroundColor: FILE_REQUEST_COLORS[fileReq.status] ?? colors.primary }]}>
              <Text style={styles.reqStatusText}>{fileReq.status}</Text>
            </View>
            {!!fileReq.note && (
              <Text style={styles.panelDesc}>
                {fileReq.status === "مرفوض" ? "سبب الرفض: " : "المستندات المطلوبة: "}{fileReq.note}
              </Text>
            )}
          </View>
        )}

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
        {!hasFile && !activationPending && (
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
  panel: { width: "100%", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderRightWidth: 4, borderRightColor: colors.warning, ...shadow },
  panelTitle: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "right" },
  panelDesc: { fontSize: 15, color: colors.muted, textAlign: "right", lineHeight: 24, marginTop: spacing.xs },
  codeInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, height: 58, fontSize: 24, letterSpacing: 6, color: colors.text, textAlign: "center", marginTop: spacing.md },
  panelBtn: { backgroundColor: colors.primary, height: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  panelBtnText: { color: colors.white, fontWeight: "800", fontSize: 17 },
  reqRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  reqCode: { fontSize: 24, fontWeight: "800", color: colors.primaryDark, letterSpacing: 1 },
  copyBtn: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  copyText: { color: colors.primary, fontWeight: "800", fontSize: 15 },
  reqStatus: { alignSelf: "flex-end", paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radius.pill, marginTop: spacing.sm },
  reqStatusText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  footer: { width: "100%", flexDirection: "row-reverse", justifyContent: "center", gap: spacing.xl, marginTop: spacing.lg },
  footerLink: { color: colors.muted, fontSize: 13, fontWeight: "700", paddingVertical: spacing.sm },
});
