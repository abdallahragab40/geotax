// إضافة تعديل/إضافة على ملف الممول (تغيير عنوان / فرع / مخزن / نشاط فرعي)
import React, { useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Field, StatusChips } from "../../components/Field";
import LocationCard, { Coords } from "../../components/LocationCard";
import { addModification } from "../../data/registry";
import { MODIFICATION_TYPES } from "../../types";
import { colors, spacing, radius, shadow } from "../../theme";
import type { InternalStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<InternalStackParamList, "ModificationForm">;

const TYPE_COLORS: Record<string, string> = {
  "تغيير عنوان": "#D97706",
  "إضافة فرع": "#0E7C66",
  "إضافة مخزن": "#2563EB",
  "إضافة نشاط فرعي": "#7C3AED",
};

export default function ModificationFormScreen({ navigation, route }: Props) {
  const taxpayerId = route.params.taxpayerId;
  const [type, setType] = useState(MODIFICATION_TYPES[0]);
  const [modDate, setModDate] = useState("");
  const [address, setAddress] = useState("");
  const [activity, setActivity] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "إضافة / تعديل" });
  }, [navigation]);

  async function save() {
    setSaving(true);
    try {
      await addModification(taxpayerId, {
        type,
        mod_date: modDate.trim(),
        address: address.trim(),
        activity: activity.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "حاول مجددًا.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>نوع التعديل</Text>
          <StatusChips options={MODIFICATION_TYPES} colorsMap={TYPE_COLORS} value={type} onChange={setType} />

          <Field label="تاريخ التعديل / الإضافة" value={modDate} onChangeText={setModDate} placeholder="يوم/شهر/سنة" />
          <Field label="نوع النشاط" value={activity} onChangeText={setActivity} placeholder="نوع النشاط (للفرع/المخزن/النشاط الفرعي)" />
          <Field label="العنوان" value={address} onChangeText={setAddress} placeholder="العنوان الجديد" type="multiline" />

          <Text style={styles.label}>الموقع الجغرافي</Text>
          <LocationCard coords={coords} onChange={setCoords} />
        </ScrollView>
        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : (
            <><Ionicons name="save" size={20} color={colors.white} /><Text style={styles.btnText}>حفظ التعديل</Text></>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs },
  btn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, margin: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 16 },
});
