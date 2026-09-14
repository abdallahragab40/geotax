// مكوّن مشترك: البحث عن ممول بالرقم الضريبي → اختياره
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { Taxpayer } from "../types";
import { colors, radius, spacing } from "../theme";

export default function TaxpayerSearchPicker({
  taxpayer,
  onPick,
}: {
  taxpayer: Taxpayer | null;
  onPick: (t: Taxpayer | null) => void;
}) {
  const [tax, setTax] = useState("");
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!tax.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل رقم التسجيل.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("taxpayers").select("*").eq("tax_number", tax.trim()).maybeSingle();
      if (error) throw error;
      if (!data) Alert.alert("غير موجود", "لا يوجد ممول بهذا الرقم.");
      else onPick(data as Taxpayer);
    } catch (e: any) { Alert.alert("خطأ", e?.message ?? "تعذّر البحث."); }
    finally { setLoading(false); }
  }

  if (taxpayer) {
    return (
      <View style={styles.foundCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.foundName}>{taxpayer.name}</Text>
          <Text style={styles.foundMeta}>الرقم: {taxpayer.tax_number}</Text>
          {!!taxpayer.activity && <Text style={styles.foundMeta}>النشاط: {taxpayer.activity}</Text>}
          {!!taxpayer.address && <Text style={styles.foundMeta}>{taxpayer.address}</Text>}
        </View>
        <TouchableOpacity onPress={() => onPick(null)}>
          <Ionicons name="close-circle" size={24} color={colors.danger} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.label}>رقم التسجيل الضريبي *</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="ابحث عن ممول"
          placeholderTextColor={colors.muted}
          value={tax}
          onChangeText={setTax}
          keyboardType="number-pad"
        />
        <TouchableOpacity style={styles.btn} onPress={search} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Ionicons name="search" size={18} color={colors.white} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs },
  row: { flexDirection: "row-reverse", gap: spacing.sm, marginBottom: spacing.md },
  input: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, fontSize: 15, color: colors.text, textAlign: "right" },
  btn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, borderRadius: radius.md, alignItems: "center", justifyContent: "center", height: 48 },
  foundCard: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  foundName: { fontSize: 15, fontWeight: "800", color: colors.primaryDark, textAlign: "right" },
  foundMeta: { fontSize: 12, color: colors.text, textAlign: "right", marginTop: 1 },
});
