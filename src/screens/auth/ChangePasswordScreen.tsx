// شاشة إجبارية لتغيير كلمة المرور بعد أول دخول
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { colors, radius, spacing, shadow } from "../../theme";

export default function ChangePasswordScreen() {
  const { refreshProfile, signOut } = useAuth();
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (pwd1.length < 8) {
      Alert.alert("كلمة مرور قصيرة", "يجب ألا تقل عن 8 أحرف.");
      return;
    }
    if (pwd1 !== pwd2) {
      Alert.alert("غير متطابقة", "كلمتا المرور غير متطابقتين.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.rpc("change_my_password", { new_password: pwd1 });
      if (error) throw error;
      await refreshProfile();
      Alert.alert("تم", "تم تغيير كلمة المرور بنجاح.");
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "حاول مجددًا.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Ionicons name="key" size={48} color={colors.primary} style={{ alignSelf: "center" }} />
        <Text style={styles.title}>تغيير كلمة المرور</Text>
        <Text style={styles.sub}>يجب تعيين كلمة مرور جديدة خاصة بك (8 أحرف على الأقل) قبل المتابعة.</Text>

        <TextInput
          style={styles.input}
          placeholder="كلمة المرور الجديدة"
          placeholderTextColor={colors.muted}
          value={pwd1}
          onChangeText={setPwd1}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="تأكيد كلمة المرور"
          placeholderTextColor={colors.muted}
          value={pwd2}
          onChangeText={setPwd2}
          secureTextEntry
        />

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>حفظ كلمة المرور</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={signOut} style={styles.signOut}>
          <Text style={styles.signOutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, padding: spacing.xl, justifyContent: "center", alignItems: "stretch" },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: spacing.md, textAlign: "center" },
  sub: { color: colors.muted, textAlign: "center", marginVertical: spacing.md, lineHeight: 22 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, fontSize: 15,
    color: colors.text, textAlign: "right", marginBottom: spacing.md,
  },
  btn: { backgroundColor: colors.primary, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center", ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
  signOut: { marginTop: spacing.lg, alignItems: "center" },
  signOutText: { color: colors.muted, fontWeight: "700" },
});
