// جرس الإشعارات في رأس الشاشة الرئيسية للموظف + عدد غير المقروء
import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { countUnreadNotifications } from "../data/notifications_api";
import { colors } from "../theme";

export default function NotificationBell() {
  const navigation = useNavigation<any>();
  const [unread, setUnread] = useState(0);

  useFocusEffect(useCallback(() => {
    countUnreadNotifications().then(setUnread).catch(() => {});
  }, []));

  return (
    <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={styles.wrap} hitSlop={8}>
      <Ionicons name="notifications-outline" size={30} color={colors.primary} />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 4 },
  badge: {
    position: "absolute", top: 0, left: 0, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
});
