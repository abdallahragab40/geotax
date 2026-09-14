// إضافة مخزن + موقع جغرافي + مرفقات
import React, { useLayoutEffect, useState } from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Field } from "../../components/Field";
import LocationCard, { Coords } from "../../components/LocationCard";
import PhotoPicker from "../../components/PhotoPicker";
import { uploadPhotos } from "../../data/storage";
import { addWarehouse } from "../../data/survey";
import { colors, radius, spacing, shadow } from "../../theme";

type R = RouteProp<{ params: { taxpayerId: number } }, "params">;

export default function AddWarehouseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<R>();
  const taxpayerId = route.params.taxpayerId;
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: "إضافة مخزن" }); }, [navigation]);

  async function save() {
    if (!address.trim()) { Alert.alert("بيانات ناقصة", "عنوان المخزن مطلوب."); return; }
    setSaving(true);
    try {
      const urls = photos.length ? await uploadPhotos(photos) : [];
      await addWarehouse({
        taxpayer_id: taxpayerId,
        address: address.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        photos: urls,
      });
      Alert.alert("تم", "تمت إضافة المخزن.");
      navigation.goBack();
    } catch (e: any) { Alert.alert("خطأ", e?.message ?? "تعذّر الحفظ."); }
    finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Field label="عنوان المخزن *" value={address} onChangeText={setAddress} placeholder="العنوان" type="multiline" />
        <Text style={styles.label}>الموقع الجغرافي</Text>
        <LocationCard coords={coords} onChange={setCoords} />
        <PhotoPicker
          existing={[]} pending={photos}
          onAddPending={(u) => setPhotos((p) => [...p, ...u])}
          onRemoveExisting={() => {}}
          onRemovePending={(uri) => setPhotos((p) => p.filter((x) => x !== uri))}
        />
      </ScrollView>
      <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.white} /> : (<><Ionicons name="checkmark-circle" size={20} color={colors.white} /><Text style={styles.btnText}>حفظ</Text></>)}
      </TouchableOpacity>
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
