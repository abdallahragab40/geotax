// تفاصيل سجل (عام) — يُستخدم للموظف (مع تعديل/حذف) وللممول (قراءة فقط)
import React, { useCallback, useLayoutEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { DEPARTMENTS, statusColor } from "../../data/departments";
import { getRecord, deleteRecord } from "../../data/api";
import { useAuth } from "../../context/AuthContext";
import { DeptRecord } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime, formatCoords } from "../../utils";
import LeafletMap from "../../components/LeafletMap";
import SecureImage from "../../components/SecureImage";

type DetailRoute = RouteProp<{ params: { deptKey: string; id: number } }, "params">;

export default function DepartmentDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<any>();
  const { profile } = useAuth();
  const readOnly = profile?.role === "taxpayer";

  const dept = DEPARTMENTS[route.params.deptKey];
  const id = route.params.id;
  const [rec, setRec] = useState<DeptRecord | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: dept.title });
  }, [navigation, dept]);

  useFocusEffect(
    useCallback(() => {
      getRecord(dept.table, id).then(setRec);
    }, [dept.table, id])
  );

  function confirmDelete() {
    Alert.alert("حذف السجل", "هل تريد الحذف نهائيًا؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          await deleteRecord(dept.table, id);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!rec) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>جارٍ التحميل…</Text>
      </SafeAreaView>
    );
  }

  const hasCoords = rec.latitude != null && rec.longitude != null;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{rec.name || "بدون اسم"}</Text>
          {!!rec.status && (
            <View style={[styles.badge, { backgroundColor: statusColor(dept, rec.status) }]}>
              <Text style={styles.badgeText}>{rec.status}</Text>
            </View>
          )}
        </View>

        {dept.fields.map((f) => {
          const val = rec[f.key];
          if (val == null || val === "" || val === 0) return null;
          return <InfoRow key={f.key} icon="ellipse" label={f.label} value={String(val)} />;
        })}

        {hasCoords && (
          <InfoRow icon="navigate" label="الموقع" value={formatCoords(rec.latitude!, rec.longitude!)} />
        )}
        <InfoRow icon="time" label="تاريخ الإضافة" value={formatDateTime(rec.created_at)} />

        {dept.hasPhotos && (rec.photos?.length ?? 0) > 0 && (
          <>
            <Text style={styles.section}>الصور ({rec.photos!.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {rec.photos!.map((url) => (
                <SecureImage key={url} uri={url} style={styles.photo} />
              ))}
            </ScrollView>
          </>
        )}

        {hasCoords && (
          <>
            <Text style={styles.section}>الموقع على الخريطة</Text>
            <View style={styles.miniMap}>
              <LeafletMap
                markers={[
                  {
                    id: rec.id,
                    lat: rec.latitude!,
                    lng: rec.longitude!,
                    title: rec.name || "سجل",
                    subtitle: rec.tax_number,
                    color: dept.color,
                  },
                ]}
              />
            </View>
          </>
        )}
      </ScrollView>

      {!readOnly && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: dept.color }]}
            onPress={() => navigation.navigate("DeptForm", { deptKey: dept.key, id })}
          >
            <Ionicons name="create-outline" size={20} color={colors.white} />
            <Text style={styles.btnText}>تعديل</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.danger }]} onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={20} color={colors.white} />
            <Text style={styles.btnText}>حذف</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabel}>
        <Ionicons name={icon} size={14} color={colors.primary} />
        <Text style={styles.infoLabelText}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { textAlign: "center", marginTop: 40, color: colors.muted },
  content: { padding: spacing.lg },
  titleRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  name: { flex: 1, fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "right" },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill, marginLeft: spacing.sm },
  badgeText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  infoRow: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow },
  infoLabel: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs },
  infoLabelText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  infoValue: { fontSize: 16, color: colors.text, textAlign: "right", marginTop: 4 },
  section: { fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "right", marginTop: spacing.lg, marginBottom: spacing.sm },
  photo: { width: 140, height: 140, borderRadius: radius.md, marginLeft: spacing.sm, backgroundColor: colors.border },
  miniMap: { height: 220, borderRadius: radius.md, overflow: "hidden", ...shadow },
  actions: { flexDirection: "row-reverse", gap: spacing.md, padding: spacing.lg },
  btn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    ...shadow,
  },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 15 },
});
