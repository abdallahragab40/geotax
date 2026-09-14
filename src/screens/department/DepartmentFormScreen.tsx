// نموذج إضافة/تعديل سجل لإدارة معيّنة (عام)
import React, { useEffect, useLayoutEffect, useState } from "react";
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
import { DEPARTMENTS } from "../../data/departments";
import { Field, StatusChips } from "../../components/Field";
import LocationCard, { Coords } from "../../components/LocationCard";
import PhotoPicker from "../../components/PhotoPicker";
import { createRecord, getRecord, updateRecord } from "../../data/api";
import { uploadPhotos } from "../../data/storage";
import { colors, spacing, radius, shadow } from "../../theme";
import type { InternalStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<InternalStackParamList, "DeptForm">;

export default function DepartmentFormScreen({ navigation, route }: Props) {
  const dept = DEPARTMENTS[route.params.deptKey];
  const editId = route.params.id;
  const isEdit = typeof editId === "number";

  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState(dept.statusOptions[0]);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? "تعديل سجل" : `إضافة - ${dept.title}` });
  }, [navigation, dept, isEdit]);

  useEffect(() => {
    if (isEdit) {
      (async () => {
        const rec = await getRecord(dept.table, editId!);
        if (rec) {
          const v: Record<string, string> = {};
          dept.fields.forEach((f) => {
            v[f.key] = rec[f.key] != null ? String(rec[f.key]) : "";
          });
          setValues(v);
          if (rec.status) setStatus(rec.status);
          if (rec.latitude != null && rec.longitude != null) {
            setCoords({ lat: rec.latitude, lng: rec.longitude, acc: rec.accuracy ?? null });
          }
          setExistingPhotos(rec.photos ?? []);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key: string, val: string) => setValues((p) => ({ ...p, [key]: val }));

  async function save() {
    const required = dept.fields.filter((f) => f.required);
    for (const f of required) {
      if (!values[f.key]?.trim()) {
        Alert.alert("بيانات ناقصة", `${f.label} مطلوب.`);
        return;
      }
    }
    setSaving(true);
    try {
      // رفع الصور الجديدة
      let photoUrls = [...existingPhotos];
      if (pendingPhotos.length > 0) {
        const uploaded = await uploadPhotos(pendingPhotos);
        photoUrls = [...photoUrls, ...uploaded];
      }

      const payload: Record<string, any> = {};
      dept.fields.forEach((f) => {
        const raw = values[f.key]?.trim() ?? "";
        payload[f.key] = f.type === "number" ? Number(raw || 0) : raw;
      });
      payload.status = status;
      if (dept.hasPhotos) payload.photos = photoUrls;
      if (dept.hasLocation) {
        payload.latitude = coords?.lat ?? null;
        payload.longitude = coords?.lng ?? null;
        payload.accuracy = coords?.acc ?? null;
      }

      if (isEdit) await updateRecord(dept.table, editId!, payload);
      else await createRecord(dept.table, payload);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("خطأ في الحفظ", e?.message ?? "حاول مجددًا.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {dept.hasLocation && <LocationCard coords={coords} onChange={setCoords} />}

          {dept.fields.map((f) => (
            <Field
              key={f.key}
              label={f.required ? `${f.label} *` : f.label}
              value={values[f.key] ?? ""}
              onChangeText={(t) => setField(f.key, t)}
              placeholder={f.placeholder}
              type={f.type}
            />
          ))}

          <Text style={styles.label}>الحالة</Text>
          <StatusChips
            options={dept.statusOptions}
            colorsMap={dept.statusColors}
            value={status}
            onChange={setStatus}
          />

          {dept.hasPhotos && (
            <PhotoPicker
              existing={existingPhotos}
              pending={pendingPhotos}
              onAddPending={(uris) => setPendingPhotos((p) => [...p, ...uris])}
              onRemoveExisting={(url) => setExistingPhotos((p) => p.filter((u) => u !== url))}
              onRemovePending={(uri) => setPendingPhotos((p) => p.filter((u) => u !== uri))}
            />
          )}
        </ScrollView>

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.saveText}>حفظ</Text>
            </>
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
  saveBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    margin: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    ...shadow,
  },
  saveText: { color: colors.white, fontWeight: "800", fontSize: 16 },
});
