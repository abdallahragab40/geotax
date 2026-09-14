// اختيار/التقاط الصور وعرض مصغّراتها
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors, radius, spacing } from "../theme";

// الصور المعروضة: روابط محفوظة (سحابية) + صور جديدة محلية
export default function PhotoPicker({
  existing,
  pending,
  onAddPending,
  onRemoveExisting,
  onRemovePending,
}: {
  existing: string[];
  pending: string[];
  onAddPending: (uris: string[]) => void;
  onRemoveExisting: (url: string) => void;
  onRemovePending: (uri: string) => void;
}) {
  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("إذن الكاميرا مرفوض", "فعّل إذن الكاميرا من الإعدادات.");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!r.canceled && r.assets?.[0]) onAddPending([r.assets[0].uri]);
  }

  async function pickPhoto() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      allowsMultipleSelection: true,
    });
    if (!r.canceled && r.assets?.length) onAddPending(r.assets.map((a) => a.uri));
  }

  return (
    <View>
      <Text style={styles.label}>الصور</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={takePhoto}>
          <Ionicons name="camera" size={18} color={colors.primary} />
          <Text style={styles.btnText}>كاميرا</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={pickPhoto}>
          <Ionicons name="images" size={18} color={colors.primary} />
          <Text style={styles.btnText}>من المعرض</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbs}>
        {existing.map((url) => (
          <Thumb key={`e${url}`} uri={url} onRemove={() => onRemoveExisting(url)} />
        ))}
        {pending.map((uri) => (
          <Thumb key={`p${uri}`} uri={uri} onRemove={() => onRemovePending(uri)} />
        ))}
        {existing.length === 0 && pending.length === 0 && (
          <Text style={styles.none}>لا توجد صور بعد</Text>
        )}
      </ScrollView>
    </View>
  );
}

function Thumb({ uri, onRemove }: { uri: string; onRemove: () => void }) {
  return (
    <View style={styles.thumb}>
      <Image source={{ uri }} style={styles.img} />
      <TouchableOpacity style={styles.remove} onPress={onRemove}>
        <Ionicons name="close" size={14} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right", marginBottom: spacing.xs },
  actions: { flexDirection: "row-reverse", gap: spacing.md, marginBottom: spacing.md },
  btn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  btnText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  thumbs: { marginBottom: spacing.lg },
  thumb: { marginLeft: spacing.sm, position: "relative" },
  img: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.border },
  remove: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  none: { color: colors.muted, fontSize: 13, paddingVertical: spacing.lg },
});
