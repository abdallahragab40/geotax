// ملف الممول: البيانات + الموقع + استكمال التسجيل (المرحلة 2) + التعديلات
import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import LocationCard, { Coords } from "../../components/LocationCard";
import PhotoPicker from "../../components/PhotoPicker";
import {
  getTaxpayerFile,
  updateTaxpayerFile,
  listModifications,
} from "../../data/registry";
import { assignTaxNumber } from "../../data/notifications_api";
import { headDeleteTaxpayer } from "../../data/news";
import { useAuth } from "../../context/AuthContext";
import { uploadPhotos } from "../../data/storage";
import { openDirections } from "../../data/directions";
import { Taxpayer, TaxpayerModification } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime, formatCoords } from "../../utils";
import SecureImage from "../../components/SecureImage";

type R = RouteProp<{ params: { id: number } }, "params">;

export default function TaxpayerFileScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<any>();
  const { profile } = useAuth();
  const id = route.params.id;
  const canDelete = profile?.role === "office_head" || profile?.role === "admin";

  const [tp, setTp] = useState<Taxpayer | null>(null);
  const [mods, setMods] = useState<TaxpayerModification[]>([]);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [taxInput, setTaxInput] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "ملف الممول" });
  }, [navigation]);

  const load = useCallback(async () => {
    const file = await getTaxpayerFile(id);
    setTp(file);
    if (file?.latitude != null && file?.longitude != null) {
      setCoords({ lat: file.latitude, lng: file.longitude, acc: null });
    }
    setMods(await listModifications(id));
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function saveLocation() {
    if (!coords) {
      Alert.alert("لا يوجد موقع", "التقط الموقع أولًا.");
      return;
    }
    try {
      await updateTaxpayerFile(id, { latitude: coords.lat, longitude: coords.lng });
      Alert.alert("تم", "تم حفظ الموقع الجغرافي.");
      load();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر حفظ الموقع.");
    }
  }

  async function savePhotos() {
    if (pendingPhotos.length === 0 || !tp) return;
    try {
      const uploaded = await uploadPhotos(pendingPhotos);
      await updateTaxpayerFile(id, { photos: [...(tp.photos ?? []), ...uploaded] });
      setPendingPhotos([]);
      Alert.alert("تم", "تم رفع الصور.");
      load();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر رفع الصور.");
    }
  }

  async function finalize() {
    if (!taxInput.trim()) {
      Alert.alert("مطلوب", "أدخل الرقم الضريبي.");
      return;
    }
    try {
      // عبر RPC: يتحقق من عدم التكرار، يربط حساب الممول، ويرسل له إشعار الاعتماد
      await assignTaxNumber(id, taxInput.trim());
      setTaxInput("");
      Alert.alert("تم", "تم استكمال التسجيل ودمج الممول بالنظام.");
      load();
    } catch (e: any) {
      Alert.alert("تعذّر الاعتماد", e?.message ?? "حاول مجددًا.");
    }
  }

  function confirmDelete() {
    Alert.alert("حذف الملف", "حذف ملف الممول نهائيًا؟ سيُسجَّل الحذف في سجل الملفات المحذوفة.", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await headDeleteTaxpayer(id, "حذف من شاشة ملف الممول");
            navigation.goBack();
          } catch (e: any) {
            Alert.alert("تعذّر الحذف", e?.message ?? "حاول مجددًا.");
          }
        },
      },
    ]);
  }

  if (!tp) {
    return <SafeAreaView style={styles.container}><Text style={styles.loading}>جارٍ التحميل…</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{tp.name || "بدون اسم"}</Text>
          <View style={[styles.badge, { backgroundColor: tp.status === "مسجل" ? colors.primary : colors.warning }]}>
            <Text style={styles.badgeText}>{tp.status}</Text>
          </View>
        </View>

        {!!tp.tax_number && <Info icon="pricetag" label="الرقم الضريبي" value={tp.tax_number} highlight />}
        {!!tp.national_id && <Info icon="card" label="الرقم القومي" value={tp.national_id} />}
        {!!tp.activity && <Info icon="briefcase" label="النشاط" value={tp.activity} />}
        {!!tp.address && <Info icon="location" label="العنوان" value={tp.address} />}
        {!!tp.legal_entity && <Info icon="business" label="الكيان القانوني" value={tp.legal_entity} />}
        {!!tp.phone && <Info icon="call" label="الهاتف" value={tp.phone} />}
        {!!tp.start_date && <Info icon="calendar" label="بداية النشاط" value={tp.start_date} />}
        {!!tp.last_accounting && <Info icon="calculator" label="آخر محاسبة" value={tp.last_accounting} />}
        {!!tp.summary && <Info icon="reader" label="ملخص المعاينة" value={tp.summary} />}
        <Info icon="navigate" label="الموقع" value={formatCoords(tp.latitude, tp.longitude)} />
        <Info icon="time" label="تاريخ التسجيل" value={formatDateTime(tp.created_at)} />

        {tp.latitude != null && (
          <TouchableOpacity style={styles.dirBtn} onPress={() => openDirections(tp.latitude!, tp.longitude!)}>
            <Ionicons name="navigate" size={18} color={colors.white} />
            <Text style={styles.dirText}>خط السير إلى موقع النشاط</Text>
          </TouchableOpacity>
        )}

        {/* المرحلة 2: استكمال التسجيل بالرقم الضريبي */}
        {!tp.tax_number && (
          <View style={styles.stage2}>
            <Text style={styles.stage2Title}>استكمال التسجيل (المرحلة 2)</Text>
            <Text style={styles.stage2Desc}>أدخل الرقم الضريبي لدمج الممول بالنظام.</Text>
            <TextInput style={styles.input} placeholder="الرقم الضريبي" placeholderTextColor={colors.muted} value={taxInput} onChangeText={setTaxInput} />
            <TouchableOpacity style={styles.finalizeBtn} onPress={finalize}>
              <Ionicons name="checkmark-done" size={18} color={colors.white} />
              <Text style={styles.finalizeText}>إنهاء التسجيل</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* الموقع الجغرافي */}
        <Text style={styles.section}>الموقع الجغرافي</Text>
        <LocationCard coords={coords} onChange={setCoords} />
        <TouchableOpacity style={styles.saveLoc} onPress={saveLocation}>
          <Ionicons name="save-outline" size={16} color={colors.primary} />
          <Text style={styles.saveLocText}>حفظ الموقع</Text>
        </TouchableOpacity>

        {/* الصور والمرفقات */}
        <Text style={styles.section}>الصور والمرفقات</Text>
        {(tp.photos?.length ?? 0) > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
            {tp.photos!.map((url) => (
              <SecureImage key={url} uri={url} style={styles.photo} />
            ))}
          </ScrollView>
        )}
        <PhotoPicker
          existing={[]}
          pending={pendingPhotos}
          onAddPending={(uris) => setPendingPhotos((p) => [...p, ...uris])}
          onRemoveExisting={() => {}}
          onRemovePending={(uri) => setPendingPhotos((p) => p.filter((u) => u !== uri))}
        />
        {pendingPhotos.length > 0 && (
          <TouchableOpacity style={styles.saveLoc} onPress={savePhotos}>
            <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
            <Text style={styles.saveLocText}>رفع الصور</Text>
          </TouchableOpacity>
        )}

        {/* التعديلات والإضافات */}
        <View style={styles.modHead}>
          <Text style={styles.section}>التعديلات والإضافات ({mods.length})</Text>
          <TouchableOpacity style={styles.addMod} onPress={() => navigation.navigate("ModificationForm", { taxpayerId: id })}>
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.addModText}>إضافة</Text>
          </TouchableOpacity>
        </View>
        {mods.length === 0 ? (
          <Text style={styles.none}>لا توجد تعديلات.</Text>
        ) : (
          mods.map((m) => (
            <View key={m.id} style={styles.modCard}>
              <View style={styles.modTop}>
                <Text style={styles.modType}>{m.type}</Text>
                <Text style={styles.modDate}>{m.mod_date || formatDateTime(m.created_at)}</Text>
              </View>
              {!!m.activity && <Text style={styles.modLine}>النشاط: {m.activity}</Text>}
              {!!m.address && <Text style={styles.modLine}>العنوان: {m.address}</Text>}
              {m.latitude != null && <Text style={styles.modLine}>الموقع: {formatCoords(m.latitude, m.longitude)}</Text>}
            </View>
          ))
        )}

        {canDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteText}>حذف الملف</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.info}>
      <View style={styles.infoLabel}>
        <Ionicons name={icon} size={15} color={colors.primary} />
        <Text style={styles.infoLabelText}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, highlight && { color: colors.primary, fontWeight: "800" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { textAlign: "center", marginTop: 40, color: colors.muted },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  titleRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  name: { flex: 1, fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "right" },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill, marginLeft: spacing.sm },
  badgeText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  info: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  infoLabel: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs },
  infoLabelText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  infoValue: { fontSize: 16, color: colors.text, textAlign: "right", marginTop: 4 },
  stage2: { backgroundColor: "#FEF3C7", borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md },
  stage2Title: { fontSize: 15, fontWeight: "800", color: "#92400E", textAlign: "right" },
  stage2Desc: { fontSize: 13, color: "#92400E", textAlign: "right", marginTop: 2, marginBottom: spacing.sm },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, fontSize: 15, color: colors.text, textAlign: "right", marginBottom: spacing.sm },
  finalizeBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.md },
  finalizeText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  section: { fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "right", marginTop: spacing.lg, marginBottom: spacing.sm },
  saveLoc: { flexDirection: "row-reverse", alignItems: "center", alignSelf: "flex-start", gap: spacing.xs, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, marginTop: spacing.sm },
  saveLocText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  dirBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: "#2563EB", paddingVertical: spacing.md, borderRadius: radius.md, marginTop: spacing.sm },
  dirText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  photo: { width: 110, height: 110, borderRadius: radius.md, marginLeft: spacing.sm, backgroundColor: colors.border },
  modHead: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  addMod: { flexDirection: "row-reverse", alignItems: "center", gap: 2, backgroundColor: colors.warning, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, marginTop: spacing.lg },
  addModText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  none: { color: colors.muted, fontSize: 14, textAlign: "right", marginBottom: spacing.sm },
  modCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderRightWidth: 4, borderRightColor: colors.warning, ...shadow },
  modTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modType: { fontSize: 15, fontWeight: "800", color: colors.text },
  modDate: { fontSize: 12, color: colors.muted },
  modLine: { fontSize: 13, color: colors.text, textAlign: "right", marginTop: 2 },
  deleteBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, marginTop: spacing.xl, paddingVertical: spacing.md },
  deleteText: { color: colors.danger, fontWeight: "700", fontSize: 15 },
});
