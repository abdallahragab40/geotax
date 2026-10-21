// تسجيل دخول/تسجيل الممول — 3 حالات
// - دخول: عنده ملف وحساب → رقم تسجيل ضريبي + كلمة سر (+ نسيت كلمة المرور)
// - عندي ملف وأريد إنشاء حساب: قومي + هاتف + رقم ضريبي + كلمة سر → تفعيل برمز من المأمورية
// - ليس لدي ملف (طلب فتح ملف): اختيار مأمورية + قومي + هاتف + اسم + كلمة سر → رقم طلب للمتابعة
import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Modal, FlatList, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../context/AuthContext";
import { listOffices } from "../../data/offices";
import { PRIVACY_POLICY_URL } from "../../lib/config";
import { submitForgotPassword } from "../../data/news";
import { getMyFileRequest } from "../../data/registry";
import { Office } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import type { AuthStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "TaxpayerLogin">;
type Mode = "login" | "existing" | "new";

const MODES: { key: Mode; icon: any; title: string; desc: string }[] = [
  { key: "login", icon: "log-in", title: "دخول", desc: "لديك حساب بالفعل — ادخل برقم التسجيل الضريبي وكلمة المرور" },
  { key: "existing", icon: "person-add", title: "عندي ملف وأريد إنشاء حساب", desc: "لديك ملف ضريبي بالمأمورية ولم تنشئ حسابًا في التطبيق بعد" },
  { key: "new", icon: "document-text", title: "ليس لدي ملف (طلب فتح ملف)", desc: "ليس لديك ملف ضريبي — قدّم طلبًا للمأمورية وتابعه برقم الطلب" },
];

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
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fNational, setFNational] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fSending, setFSending] = useState(false);

  async function sendForgot() {
    if (!/^\d{14}$/.test(fNational.trim()) || !/^01\d{9}$/.test(fPhone.trim())) {
      Alert.alert("بيانات غير صحيحة", "أدخل الرقم القومي (14 رقمًا) ورقم الهاتف المسجّل بحسابك.");
      return;
    }
    setFSending(true);
    try {
      await submitForgotPassword(fNational, fPhone);
      setForgotOpen(false);
      setFNational(""); setFPhone("");
      Alert.alert(
        "تم استلام طلبك",
        "إذا كانت البيانات مطابقة لحسابك سيتصل بك مدير الحاسب الآلي بمأموريتك على رقمك المسجّل لإعطائك كلمة مرور مؤقتة."
      );
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "حاول مجددًا.");
    } finally {
      setFSending(false);
    }
  }

  useEffect(() => {
    if (mode === "new") listOffices().then(setOffices).catch(() => {});
  }, [mode]);

  async function submit() {
    if (mode !== "login" && password.length < 8) {
      Alert.alert("كلمة مرور ضعيفة", "يجب 8 أحرف على الأقل.");
      return;
    }
    if (mode === "login" && !password) {
      Alert.alert("بيانات ناقصة", "أدخل كلمة المرور.");
      return;
    }
    if (mode !== "login" && !/^\d{14}$/.test(nationalId.trim())) {
      Alert.alert("رقم قومي غير صحيح", "الرقم القومي يتكون من 14 رقمًا.");
      return;
    }
    if (mode !== "login" && !/^01\d{9}$/.test(phone.trim())) {
      Alert.alert("رقم هاتف غير صحيح", "أدخل رقم هاتف محمول مصري من 11 رقمًا يبدأ بـ 01.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        if (!taxNumber.trim()) throw new Error("أدخل رقم التسجيل الضريبي أو الرقم القومي.");
        await signInTaxpayer(taxNumber, password);
      } else if (mode === "existing") {
        if (!nationalId.trim() || !phone.trim() || !fullName.trim() || !taxNumber.trim()) {
          throw new Error("املأ كل الحقول.");
        }
        await signUpExistingTaxpayer({ nationalId, phone, fullName, taxNumber, password });
        Alert.alert(
          "تم إنشاء الحساب",
          "حسابك بانتظار التفعيل. سيتواصل معك موظف المأمورية للتحقق من شخصيتك ويعطيك رمز التفعيل، ثم أدخله في الشاشة الرئيسية."
        );
      } else {
        if (!office) throw new Error("اختر المأمورية المختصة.");
        if (!nationalId.trim() || !phone.trim() || !fullName.trim()) {
          throw new Error("املأ كل الحقول.");
        }
        await signUpNewTaxpayer({ nationalId, phone, fullName, password, officeId: office.id });
        const req = await getMyFileRequest();
        Alert.alert(
          "تم إرسال طلب فتح الملف",
          (req?.request_code ? `رقم طلبك: ${req.request_code}\n\n` : "") +
            "احتفظ برقم الطلب لمتابعته من «متابعة طلب فتح ملف»، ويظهر أيضًا في الشاشة الرئيسية بعد الدخول."
        );
      }
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (mode === "login" && /invalid login|credentials/i.test(msg)) {
        Alert.alert("تعذّر الدخول", "الرقم أو كلمة المرور غير صحيحة. إن كنت تدخل لأول مرة اختر «عندي ملف وأريد إنشاء حساب» أو «ليس لدي ملف».");
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

        <Ionicons name="person-circle" size={56} color={colors.accent} style={{ alignSelf: "center" }} />
        <Text style={styles.title}>خدمات الممولين</Text>

        {/* اختيار الحالة */}
        <View style={styles.tabs}>
          {MODES.map((m) => (
            <Tab key={m.key} icon={m.icon} title={m.title} desc={m.desc}
              active={mode === m.key} onPress={() => setMode(m.key)} />
          ))}
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
              value={nationalId} onChangeText={setNationalId} keyboardType="number-pad" maxLength={14} />
            <TextInput style={styles.input} placeholder="رقم الهاتف" placeholderTextColor={colors.muted}
              value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={11} />
          </>
        )}

        {(mode === "login" || mode === "existing") && (
          <TextInput style={styles.input}
            placeholder={mode === "login" ? "رقم التسجيل الضريبي أو الرقم القومي" : "رقم التسجيل الضريبي"}
            placeholderTextColor={colors.muted}
            value={taxNumber} onChangeText={setTaxNumber} keyboardType="number-pad" />
        )}

        <TextInput style={styles.input}
          placeholder={mode === "login" ? "كلمة المرور" : "كلمة المرور (8 أحرف على الأقل)"}
          placeholderTextColor={colors.muted}
          value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : (
            <Text style={styles.btnText}>
              {mode === "login" ? "دخول" : mode === "existing" ? "إنشاء الحساب" : "إرسال طلب فتح الملف"}
            </Text>
          )}
        </TouchableOpacity>

        {mode === "login" && (
          <TouchableOpacity onPress={() => setForgotOpen(true)} style={{ paddingVertical: spacing.sm }}>
            <Text style={[styles.hint, styles.link, { fontSize: 16 }]}>نسيت كلمة المرور؟</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.hint}>
          {mode === "login"
            ? "إن لم يُفتح ملفك بعد ادخل برقمك القومي وكلمة المرور."
            : mode === "existing"
              ? "للتأكد أن الملف ملكك، سيتواصل معك موظف المأمورية ويعطيك رمز تفعيل تُدخله بعد الدخول."
              : "طلبك سيُعرض على مأمور الحصر في المأمورية المختارة، وستحصل على رقم طلب لمتابعته."}
        </Text>

        {mode !== "existing" && (
          <TouchableOpacity style={styles.trackBtn} onPress={() => navigation.navigate("Track", { kind: "file" })}>
            <Ionicons name="search" size={20} color={colors.primary} />
            <Text style={styles.trackText}>متابعة طلب فتح ملف</Text>
          </TouchableOpacity>
        )}

        {mode !== "login" && !!PRIVACY_POLICY_URL && (
          <Text style={styles.hint}>
            بالتسجيل فإنك توافق على{" "}
            <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>سياسة الخصوصية</Text>
          </Text>
        )}
      </ScrollView>

      {/* نسيت كلمة المرور */}
      <Modal visible={forgotOpen} transparent animationType="slide" onRequestClose={() => setForgotOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>استعادة كلمة المرور</Text>
            <Text style={[styles.hint, { marginTop: 0, marginBottom: spacing.md }]}>
              أدخل الرقم القومي ورقم الهاتف المسجّلين بحسابك، وسيتواصل معك مدير الحاسب الآلي بمأموريتك.
            </Text>
            <TextInput style={styles.input} placeholder="الرقم القومي" placeholderTextColor={colors.muted}
              value={fNational} onChangeText={setFNational} keyboardType="number-pad" maxLength={14} />
            <TextInput style={styles.input} placeholder="رقم الهاتف المسجّل" placeholderTextColor={colors.muted}
              value={fPhone} onChangeText={setFPhone} keyboardType="phone-pad" maxLength={11} />
            <TouchableOpacity style={styles.btn} onPress={sendForgot} disabled={fSending}>
              {fSending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>إرسال الطلب</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setForgotOpen(false)}>
              <Text style={styles.modalCloseText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

function Tab({ icon, title, desc, active, onPress }: { icon: any; title: string; desc: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={24} color={active ? colors.white : colors.muted} />
      <View style={{ flex: 1 }}>
        <View style={styles.tabHead}>
          <Ionicons name={icon} size={20} color={active ? colors.white : colors.accent} />
          <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
        </View>
        <Text style={[styles.tabDesc, active && styles.tabTextActive]}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { padding: spacing.xl, alignItems: "stretch", paddingTop: spacing.xl * 2 },
  back: { position: "absolute", top: spacing.lg, right: spacing.lg },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, marginVertical: spacing.lg, textAlign: "center" },
  tabs: { gap: spacing.sm, marginBottom: spacing.xl },
  tab: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, minHeight: 72 },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent, ...shadow },
  tabHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs },
  tabText: { color: colors.text, fontWeight: "800", fontSize: 17, textAlign: "right", flexShrink: 1 },
  tabDesc: { color: colors.muted, fontSize: 14, textAlign: "right", marginTop: 4, lineHeight: 21 },
  tabTextActive: { color: colors.white },
  picker: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 58, marginBottom: spacing.md },
  pickerText: { color: colors.text, fontSize: 17, fontWeight: "600", flex: 1, textAlign: "right" },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 58, fontSize: 17, color: colors.text, textAlign: "right", marginBottom: spacing.md },
  btn: { backgroundColor: colors.accent, height: 60, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginTop: spacing.sm, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 18 },
  hint: { color: colors.muted, fontSize: 14, marginTop: spacing.md, textAlign: "center", lineHeight: 22 },
  trackBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, height: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface, marginTop: spacing.lg },
  trackText: { color: colors.primary, fontWeight: "800", fontSize: 17 },
  link: { color: colors.primary, fontWeight: "700", textDecorationLine: "underline" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.md },
  officeRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  officeName: { color: colors.text, fontSize: 16, flex: 1, textAlign: "right" },
  officeCode: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  modalClose: { marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.sm },
  modalCloseText: { color: colors.muted, fontWeight: "700" },
});
