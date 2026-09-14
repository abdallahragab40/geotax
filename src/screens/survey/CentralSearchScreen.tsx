// البحث المركزي عن أي ممول على مستوى الجمهورية — بيانات محدودة
import React, { useLayoutEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  FlatList, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { centralSearch } from "../../data/survey";
import { CentralSearchResult } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";

export default function CentralSearchScreen() {
  const navigation = useNavigation<any>();
  const [tax, setTax] = useState("");
  const [results, setResults] = useState<CentralSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "البحث المركزي" });
  }, [navigation]);

  async function search() {
    if (!tax.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل رقم التسجيل الضريبي.");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      setResults(await centralSearch(tax));
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر البحث.");
    } finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.content}>
        <View style={styles.note}>
          <Ionicons name="information-circle" size={18} color={colors.muted} />
          <Text style={styles.noteText}>
            البحث على مستوى الجمهورية. لا يظهر الموقع الجغرافي ولا خط السير ولا يُسمح بالتعديل.
          </Text>
        </View>

        <Text style={styles.label}>رقم التسجيل الضريبي</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="مثال: 123456789"
            placeholderTextColor={colors.muted}
            value={tax}
            onChangeText={setTax}
            keyboardType="number-pad"
            maxLength={20}
          />
          <TouchableOpacity style={styles.btn} onPress={search} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.white} /> : (
              <><Ionicons name="search" size={18} color={colors.white} /><Text style={styles.btnText}>بحث</Text></>
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={results}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              {!!item.activity && <Row label="النشاط" value={item.activity} />}
              {!!item.start_date && <Row label="تاريخ بداية النشاط" value={item.start_date} />}
              {!!item.address && <Row label="العنوان" value={item.address} />}
              <Row label="المأمورية المختصة" value={`${item.office_name ?? "—"} ${item.office_code ? `(${item.office_code})` : ""}`} highlight />
            </View>
          )}
          ListEmptyComponent={
            searched && !loading ? <Text style={styles.empty}>لا توجد نتائج بهذا الرقم.</Text> : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fLabel}>{label}</Text>
      <Text style={[styles.fValue, highlight && { color: colors.primary, fontWeight: "800" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg },
  note: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.sm, backgroundColor: colors.primaryLight, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  noteText: { flex: 1, color: colors.primaryDark, fontSize: 13, textAlign: "right", lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs },
  row: { flexDirection: "row-reverse", gap: spacing.sm, marginBottom: spacing.lg },
  input: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, fontSize: 15, color: colors.text, textAlign: "right" },
  btn: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, borderRadius: radius.md, height: 48, ...shadow },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  list: { paddingBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  name: { fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "right", marginBottom: spacing.sm },
  field: { paddingVertical: 4 },
  fLabel: { fontSize: 12, color: colors.muted, textAlign: "right" },
  fValue: { fontSize: 14, color: colors.text, textAlign: "right", marginTop: 2 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 60, fontSize: 15 },
});
