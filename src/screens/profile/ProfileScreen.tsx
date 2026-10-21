// الملف الشخصي: البيانات + تغيير كلمة المرور + معلومات المأمورية
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { updateOwnProfile } from "../../data/news";
import { getOffice } from "../../data/offices";
import { Office, ROLE_LABELS } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { profile, refreshProfile, signOut } = useAuth();
  const [office, setOffice] = useState<Office | null>(null);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [position, setPosition] = useState(profile?.position_title ?? "");
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [savingP, setSavingP] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "الملف الشخصي" }); }, [navigation]);

  useEffect(() => {
    if (profile?.office_id) getOffice(profile.office_id).then(setOffice);
  }, [profile?.office_id]);

  async function saveProfile() {
    setSavingP(true);
    try {
      await updateOwnProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        position_title: position.trim(),
      });
      await refreshProfile();
      Alert.alert("تم", "حُفظت البيانات.");
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "حاول مجددًا.");
    } finally { setSavingP(false); }
  }

  async function changePassword() {
    if (pwd1.length < 8) return Alert.alert("كلمة مرور قصيرة", "8 أحرف على الأقل.");
    if (pwd1 !== pwd2) return Alert.alert("غير متطابقة", "تأكيد كلمة المرور غير صحيح.");
    setSavingPwd(true);
    try {
      const { error } = await supabase.rpc("change_my_password", { new_password: pwd1 });
      if (error) throw error;
      setPwd1(""); setPwd2("");
      Alert.alert("تم", "تم تغيير كلمة المرور.");
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "حاول مجددًا.");
    } finally { setSavingPwd(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={42} color={colors.white} />
        </View>
        <Text style={styles.name}>{profile?.full_name || "—"}</Text>
        <Text style={styles.role}>{ROLE_LABELS[profile?.role ?? ""] ?? ""}</Text>

        <Card>
          <Row label="رقم الحاسب" value={profile?.employee_number || "—"} />
          <Row label="المأمورية" value={office ? `${office.name} (${office.code})` : "الإدارة العليا"} />
          {office?.governorate && <Row label="المحافظة" value={office.governorate} />}
          <Row label="الحالة" value={profile?.status === "suspended" ? "موقوف" : "نشط"} />
        </Card>

        <Text style={styles.section}>تعديل البيانات</Text>
        <Field label="الاسم بالكامل" value={fullName} onChangeText={setFullName} />
        <Field label="رقم الهاتف" value={phone} onChangeText={setPhone} />
        <Field label="الوظيفة" value={position} onChangeText={setPosition} />
        <TouchableOpacity style={styles.btn} onPress={saveProfile} disabled={savingP}>
          {savingP ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>حفظ البيانات</Text>}
        </TouchableOpacity>

        <Text style={styles.section}>تغيير كلمة المرور</Text>
        <Field label="كلمة المرور الجديدة" value={pwd1} onChangeText={setPwd1} secure />
        <Field label="تأكيد كلمة المرور" value={pwd2} onChangeText={setPwd2} secure />
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={changePassword} disabled={savingPwd}>
          {savingPwd ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>تغيير كلمة المرور</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOut} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, secure }: { label: string; value: string; onChangeText: (t: string) => void; secure?: boolean }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} secureTextEntry={secure} placeholderTextColor={colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, alignItems: "stretch" },
  avatar: { alignSelf: "center", width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center" },
  role: { fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, ...shadow },
  row: { flexDirection: "row-reverse", justifyContent: "space-between", paddingVertical: spacing.xs, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  rowLabel: { color: colors.muted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: "700" },
  section: { fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "right", marginTop: spacing.xl, marginBottom: spacing.sm },
  fieldGroup: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, fontSize: 15, color: colors.text, textAlign: "right" },
  btn: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginTop: spacing.sm, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  signOut: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.xl, paddingVertical: spacing.md },
  signOutText: { color: colors.danger, fontWeight: "800", fontSize: 15 },
});
