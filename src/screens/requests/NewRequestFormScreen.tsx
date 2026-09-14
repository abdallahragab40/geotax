// نموذج طلب جديد من الممول
import React, { useLayoutEffect, useState } from "react";
import {
  Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, View,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Field } from "../../components/Field";
import LocationCard, { Coords } from "../../components/LocationCard";
import { createRequest } from "../../data/requests";
import { useAuth } from "../../context/AuthContext";
import { EXAM_REQUEST_TYPES, SURVEY_REQUEST_TYPES } from "../../types";
import { colors, spacing, radius, shadow } from "../../theme";

type R = RouteProp<{ params: { department: string } }, "params">;

export default function NewRequestFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<R>();
  const department = route.params.department;
  const { profile } = useAuth();

  const types = department === "survey" ? SURVEY_REQUEST_TYPES
    : department === "examination" ? EXAM_REQUEST_TYPES
    : [...SURVEY_REQUEST_TYPES, ...EXAM_REQUEST_TYPES];
  const [type, setType] = useState(types[0]);
  const [details, setDetails] = useState("");
  const [name, setName] = useState(profile?.full_name ?? "");
  const [activity, setActivity] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [saving, setSaving] = useState(false);

  const isNewFile = type === "فتح ملف ضريبي";

  useLayoutEffect(() => { navigation.setOptions({ title: "طلب جديد" }); }, [navigation]);

  async function save() {
    setSaving(true);
    try {
      await createRequest({
        department,
        type,
        tax_number: profile?.tax_number ?? "",
        national_id: profile?.national_id ?? "",
        phone: profile?.phone ?? "",
        name: name.trim(),
        activity: activity.trim(),
        address: address.trim(),
        start_date: startDate.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        details: details.trim(),
        status: "جديد",
      });
      Alert.alert("تم", "تم إرسال طلبك. ستصلك المعالجة في شاشة الطلبات.");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "حاول مجددًا.");
    } finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>نوع الطلب</Text>
          <View style={styles.chips}>
            {types.map((t) => {
              const active = type === t;
              return (
                <TouchableOpacity key={t} style={[styles.chip, active && styles.chipActive]} onPress={() => setType(t)}>
                  <Text style={[styles.chipText, active && { color: colors.white }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Field label="تفاصيل الطلب" value={details} onChangeText={setDetails} placeholder="اكتب تفاصيل طلبك" type="multiline" />

          {isNewFile && (
            <>
              <Field label="اسم النشاط / صاحب النشاط" value={name} onChangeText={setName} placeholder="الاسم" />
              <Field label="النشاط" value={activity} onChangeText={setActivity} placeholder="نوع النشاط" />
              <Field label="العنوان" value={address} onChangeText={setAddress} placeholder="العنوان" type="multiline" />
              <Field label="بداية النشاط" value={startDate} onChangeText={setStartDate} placeholder="يوم/شهر/سنة" />
              <Text style={styles.label}>الموقع الجغرافي</Text>
              <LocationCard coords={coords} onChange={setCoords} />
            </>
          )}
        </ScrollView>
        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="send" size={18} color={colors.white} /><Text style={styles.btnText}>إرسال الطلب</Text></>)}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  btn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.accent, margin: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
});
