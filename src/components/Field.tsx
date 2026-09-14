// مكوّنات إدخال مشتركة: حقل نصي/رقمي + اختيار الحالة
import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme";
import { FieldType } from "../data/departments";

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  type?: FieldType;
}) {
  const multiline = type === "multiline";
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={type === "number" ? "numeric" : "default"}
      />
    </View>
  );
}

export function StatusChips({
  options,
  colorsMap,
  value,
  onChange,
}: {
  options: string[];
  colorsMap: Record<string, string>;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((s) => {
        const active = value === s;
        const c = colorsMap[s] ?? colors.primary;
        return (
          <TouchableOpacity
            key={s}
            style={[styles.chip, active && { backgroundColor: c, borderColor: c }]}
            onPress={() => onChange(s)}
          >
            <Text style={[styles.chipText, active && { color: colors.white }]}>{s}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: spacing.md },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    textAlign: "right",
    minHeight: 46,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { color: colors.text, fontWeight: "700", fontSize: 13 },
});
