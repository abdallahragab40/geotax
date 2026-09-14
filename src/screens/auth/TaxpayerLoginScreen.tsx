// تسجيل دخول/تسجيل الممول
// - دخول: رقم تسجيل ضريبي + كلمة سر
// - تسجيل ممول مُسجَّل بالنظام: قومي + هاتف + رقم ضريبي + كلمة سر
// - تسجيل ممول جديد (طلب فتح ملف): اختيار مأمورية + قومي + هاتف + اسم + كلمة سر
import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Modal, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../context/AuthContext";
import { listOffices } from "../../data/offices";
import { Office } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import type { AuthStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "TaxpayerLogin">;
type Mode = "login" | "existing" | "new";

export default function TaxpayerLoginScreen({ navigation }: Props) {
  const { signInTaxpayer, signUpExistingTaxpayer, signUpNewTaxpayer } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [taxNumber, setTaxNumber] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [office, setOffice] = useState<Office | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === "new") listOffices().then(setOffices).catch(() => {});
  }, [mode]);

  async function submit() {
    if (password.length < 6) {
      Alert.alert("كلمة مرور ضعيفة", "يجب 6 أحرف على الأقل.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        if (!taxNumber.trim()) throw new Error("أدخل رقم التسجيل الضريبي.");
        await signInTaxpayer(taxNumber, password);
      } else if (mode === "existing") {
        if (!nationalId.trim() || !phone.trim() || !fullName.trim() || !taxNumber.trim()) {
          throw new Error("املأ كل الحقول.");
        }
        await signUpExistingTaxpayer({ nationalId, phone, fullName, taxNumber, password });
      } else {
        if (!office) throw new Error("اختر المأمورية المختصة.");
        if (!nationalId.trim() || !phone.trim() || !fullName.trim()) {
          throw new Error("املأ كل الحقول.");
        }
        await signUpNewTaxpayer({ nationalId, phone, fullName, password, officeId: office.id });
      }
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (mode === "login" && /invalid login|credentials/i.test(msg)) {
        Alert.alert("لا يوجد حساب", "لم نجد حسابًا بهذا الرقم. سجّل دخولك لأول مرة من «ممول مسجَّل» أو «طلب فتح ملف جديد».");
      } else {
        Alert.alert("خطأ", msg || "حاول مجددًا.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color={colors.text} />
        </TouchableOpacity>

        <Ionicons name="person-circle" size={56} color={colors.accent} />
        <Text style={styles.title}>
          {mode === "login" ? "دخول الممول" : mode === "existing" ? "تسجيل ممول مسجَّل" : "طلب فتح ملف جديد"}
        </Text>

        {/* اختيار الوضع */}
        <View style={styles.tabs}>
          <Tab label="دخول" active={mode === "login"} onPress={() => setMode("login")} />
          <Tab label="ممول مسجَّل" active={mode === "existing"} onPress={() => setMode("existing")} />
          <Tab label="ملف جديد" active={mode === "new"} onPress={() => setMode("new")} />
        </View>

        {/* الحقول حسب الوضع */}
        {mode === "new" && (
          <TouchableOpacity style={styles.picker} onPress={() => setPickerOpen(true)}>
            <Text style={styles.pickerText}>
              {office ? `${office.name} — ${office.governorate}` : "اختر المأمورية المختصة"}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.muted} />
          </TouchableOpacity>
        )}

        {(mode === "existing" || mode === "new") && (
          <>
            <TextInput style={styles.input} placeholder="الاسم بالكامل" placeholderTextColor={colors.muted}
              value={fullName} onChangeText={setFullName} />
            <TextInput style={styles.input} placeholder="الرقم القومي" placeholderTextColor={colors.muted}
              value={nationalId} onChangeText={setNationalId} keyboardType="number-pad" />
            <TextInput style={styles.input} placeholder="رقم الهاتف" placeholderTextColor={colors.muted}
              value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </>
        )}

        {(mode === "login" || mode === "existing") && (
          <TextInput style={styles.input} placeholder="رقم التسجيل الضريبي" placeholderTextColor={colors.muted}
            value={taxNumber} onChangeText={setTaxNumber} keyboardType="number-pad" />
        )}

        <TextInput style={styles.input} placeholder="كلمة المرور (6 أحرف على الأقل)" placeholderTextColor={colors.muted}
          value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : (
            <Text style={styles.btnText}>
              {mode === "login" ? "دخول" : mode === "existing" ? "تسجيل والدخول" : "إرسال الطلب"}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          {mode === "login"
            ? "إن كنت تدخل لأول مرة استخدم «ممول مسجَّل» أو «ملف جديد»."
            : mode === "existing"
              ? "لربط حساب بسجلك القائم في المأمورية."
              : "طلبك سيُعرض على مأمور الحصر في المأمورية المختارة."}
        </Text>
      </ScrollView>

      {/* مُنتقي المأمورية */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>اختر المأمورية المختصة</Text>
            <FlatList
              data={offices}
              keyExtractor={(o) => String(o.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.officeRow}
                  onPress={() => { setOffice(item); setPickerOpen(false); }}
                >
                  <Text style={styles.officeName}>{item.name} — {item.governorate}</Text>
                  <Text style={styles.officeCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setPickerOpen(false)}>
              <Text style={styles.modalCloseText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { padding: spacing.xl, alignItems: "stretch", paddingTop: spacing.xl * 2 },
  back: { position: "absolute", top: spacing.lg, right: spacing.lg },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, marginVertical: spacing.lg, textAlign: "center" },
  tabs: { flexDirection: "row-reverse", marginBottom: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.pill, padding: 4 },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: "center", borderRadius: radius.pill },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  tabTextActive: { color: colors.white },
  picker: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, marginBottom: spacing.md },
  pickerText: { color: colors.text, fontSize: 15, fontWeight: "600", flex: 1, textAlign: "right" },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, fontSize: 15, color: colors.text, textAlign: "right", marginBottom: spacing.md },
  btn: { backgroundColor: colors.accent, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginTop: spacing.sm, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  hint: { color: colors.muted, fontSize: 12, marginTop: spacing.md, textAlign: "center", lineHeight: 18 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.md },
  officeRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  officeName: { color: colors.text, fontSize: 15, flex: 1, textAlign: "right" },
  officeCode: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  modalClose: { marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.sm },
  modalCloseText: { color: colors.muted, fontWeight: "700" },
});
