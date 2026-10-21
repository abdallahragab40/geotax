// تسجيل دخول الموظف: اختيار المأمورية + رقم الحاسب + كلمة المرور
// (الإدارة العليا تختار "مركزي" وتدخل بريدها مباشرة)
import React, { useEffect, useState } from "react";
import {
  Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, ScrollView, View, Modal, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../context/AuthContext";
import { listOffices } from "../../data/offices";
import { Office } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import type { AuthStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<AuthStackParamList, "EmployeeLogin">;

export default function EmployeeLoginScreen({ navigation }: Props) {
  const { signInEmployee } = useAuth();
  const [offices, setOffices] = useState<Office[]>([]);
  const [office, setOffice] = useState<Office | null>(null);  // null = الإدارة العليا
  const [pickerOpen, setPickerOpen] = useState(false);
  const [identifier, setIdentifier] = useState(""); // رقم الحاسب أو البريد (للإدارة العليا)
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listOffices().then(setOffices).catch(() => {});
  }, []);

  function deriveEmail(): string {
    const id = identifier.trim();
    if (!office) return id; // الإدارة العليا — البريد كما هو
    if (id.includes("@")) return id; // إيميل كامل (لمن أُنشئ ببريد حقيقي)
    // رقم حاسب فقط → اشتقاق إيميل
    return `emp${id}@office${office.code}.geotax.local`;
  }

  async function submit() {
    if (!identifier.trim() || !password) {
      Alert.alert("بيانات ناقصة", "أدخل رقم الحاسب وكلمة المرور.");
      return;
    }
    setLoading(true);
    try {
      await signInEmployee(deriveEmail(), password);
    } catch (e: any) {
      Alert.alert("فشل الدخول", e?.message ?? "تحقق من البيانات.");
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

        <Ionicons name="shield-checkmark" size={48} color={colors.primary} style={styles.icon} />
        <Text style={styles.title}>دخول الموظف</Text>

        <Text style={styles.label}>المأمورية</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setPickerOpen(true)}>
          <Text style={styles.pickerText}>
            {office ? `${office.name} — ${office.governorate}` : "الإدارة العليا (مركزي)"}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.muted} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={office ? "رقم الحاسب" : "البريد الإلكتروني (للإدارة العليا)"}
          placeholderTextColor={colors.muted}
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          keyboardType={office ? "number-pad" : "email-address"}
        />
        <TextInput
          style={styles.input}
          placeholder="كلمة المرور"
          placeholderTextColor={colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>دخول</Text>}
        </TouchableOpacity>

        <Text style={styles.hint}>
          عند الدخول لأول مرة سيُطلب منك تغيير كلمة المرور.{"\n"}
          نسيت كلمة المرور؟ تواصل مع مدير الحاسب الآلي بمأموريتك لإعادة تعيينها.
        </Text>
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>اختر المأمورية</Text>
            <FlatList
              data={[null, ...offices]}
              keyExtractor={(o, i) => (o ? String(o.id) : "central") + i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.officeRow}
                  onPress={() => { setOffice(item); setPickerOpen(false); }}
                >
                  <Text style={styles.officeText}>
                    {item ? `${item.name} — ${item.governorate}` : "الإدارة العليا (مركزي)"}
                  </Text>
                  {item && <Text style={styles.officeCode}>{item.code}</Text>}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { padding: spacing.xl, alignItems: "stretch", paddingTop: spacing.xl * 2.5 },
  back: { position: "absolute", top: spacing.lg, right: spacing.lg, zIndex: 10 },
  icon: { alignSelf: "center" },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, marginVertical: spacing.lg, textAlign: "center" },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs },
  picker: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, marginBottom: spacing.md,
  },
  pickerText: { color: colors.text, fontSize: 15, fontWeight: "600", textAlign: "right", flex: 1 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, fontSize: 15,
    color: colors.text, textAlign: "right", marginBottom: spacing.md,
  },
  btn: {
    backgroundColor: colors.primary, height: 52, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center", marginTop: spacing.sm, ...shadow,
  },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  hint: { color: colors.muted, fontSize: 12, marginTop: spacing.md, textAlign: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.md },
  officeRow: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  officeText: { color: colors.text, fontSize: 15, flex: 1, textAlign: "right" },
  officeCode: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  modalClose: { marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.sm },
  modalCloseText: { color: colors.muted, fontWeight: "700" },
});
