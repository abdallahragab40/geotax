// قائمة المراسلات لدى الموظف (كل الممولين)
import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { buildConversations, listStaff, listTaxpayers } from "../../data/api";
import { getAllowedContacts } from "../../data/messaging_hierarchy";
import { useAuth } from "../../context/AuthContext";
import { Conversation, ROLE_LABELS } from "../../types";
import { colors, radius, spacing, shadow } from "../../theme";
import { formatDateTime } from "../../utils";

export default function ConversationsScreen() {
  const navigation = useNavigation<any>();
  const { profile } = useAuth();
  const [items, setItems] = useState<Conversation[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      (async () => {
        try {
          const [taxpayers, staff] = await Promise.all([listTaxpayers(), listStaff()]);
          const all = [...staff, ...taxpayers];
          const allowed = getAllowedContacts(profile, all);
          setItems(await buildConversations(profile.id, allowed));
        } catch {}
      })();
    }, [profile])
  );

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("Chat", { otherId: item.profile.id, name: item.profile.full_name })
      }
    >
      <View style={styles.avatar}>
        <Ionicons name="person" size={22} color={colors.white} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>
          {item.profile.full_name || "بدون اسم"}
          <Text style={styles.roleTag}>  ({ROLE_LABELS[item.profile.role] ?? item.profile.role})</Text>
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {item.lastMessage?.body || "لا توجد رسائل بعد"}
        </Text>
      </View>
      <View style={styles.meta}>
        {item.lastMessage && (
          <Text style={styles.time}>{formatDateTime(item.lastMessage.created_at)}</Text>
        )}
        {item.unread > 0 && (
          <View style={styles.unread}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.profile.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={56} color={colors.border} />
            <Text style={styles.emptyText}>لا يوجد ممولون مسجّلون بعد.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadow,
  },
  avatar: { width: 46, height: 46, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "right" },
  roleTag: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  preview: { fontSize: 13, color: colors.muted, textAlign: "right", marginTop: 2 },
  meta: { alignItems: "center", gap: 4 },
  time: { fontSize: 11, color: colors.muted },
  unread: { backgroundColor: colors.primary, borderRadius: radius.pill, minWidth: 22, height: 22, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  unreadText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { color: colors.muted, marginTop: spacing.md, fontSize: 15 },
});
