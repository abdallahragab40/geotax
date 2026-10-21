// شاشة المحادثة (بين الموظف والممول) مع تحديث لحظي وإشعار
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { getMessagesWith, sendMessage, markRead } from "../../data/api";
import { useAuth } from "../../context/AuthContext";
import { Message } from "../../types";
import { colors, radius, spacing } from "../../theme";
import { formatDateTime } from "../../utils";

type ChatRoute = RouteProp<{ params: { otherId: string; name: string } }, "params">;

export default function ChatScreen() {
  const route = useRoute<ChatRoute>();
  const navigation = useNavigation<any>();
  const { profile } = useAuth();
  const { otherId, name } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: name || "محادثة" });
  }, [navigation, name]);

  const reload = useCallback(async () => {
    const msgs = await getMessagesWith(otherId);
    setMessages(msgs);
    await markRead(otherId);
  }, [otherId]);

  useEffect(() => {
    reload();
    // اشتراك لحظي على الرسائل الجديدة
    const channel = supabase
      .channel(`chat-${otherId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          if (
            (m.sender_id === otherId && m.receiver_id === profile?.id) ||
            (m.sender_id === profile?.id && m.receiver_id === otherId)
          ) {
            setMessages((prev) =>
              prev.some((x) => x.id === m.id) ? prev : [...prev, m]
            );
            if (m.receiver_id === profile?.id) markRead(otherId);
          }
        }
      )
      .subscribe();

    // تحديث دوري احتياطي (في حال تعطّل البث اللحظي)
    const poll = setInterval(() => {
      getMessagesWith(otherId)
        .then((msgs) => {
          setMessages((prev) => (msgs.length !== prev.length ? msgs : prev));
        })
        .catch(() => {});
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [otherId, profile?.id, reload]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText("");
    try {
      const msg = await sendMessage(otherId, body);
      setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
    } catch (e: any) {
      setText(body); // إعادة النص عند الفشل
      Alert.alert("تعذّر إرسال الرسالة", e?.message ?? "تحقق من الاتصال وحاول مجددًا.");
    }
  }

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.sender_id === profile?.id;
    return (
      <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowOther]}>
        <View style={[styles.bubble, mine ? styles.mine : styles.other]}>
          <Text style={[styles.body, mine && { color: colors.white }]}>{item.body}</Text>
          <Text style={[styles.time, mine && { color: "#D1FAE5" }]}>
            {formatDateTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="اكتب رسالة…"
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send}>
            <Ionicons name="send" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.sm },
  bubbleRow: { flexDirection: "row", marginBottom: spacing.xs },
  rowMine: { justifyContent: "flex-start" },
  rowOther: { justifyContent: "flex-end" },
  bubble: { maxWidth: "80%", borderRadius: radius.lg, padding: spacing.md },
  mine: { backgroundColor: colors.primary, borderBottomLeftRadius: 4 },
  other: { backgroundColor: colors.surface, borderBottomRightRadius: 4 },
  body: { fontSize: 15, color: colors.text, textAlign: "right" },
  time: { fontSize: 10, color: colors.muted, marginTop: 4, textAlign: "left" },
  inputRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 120,
    fontSize: 15,
    color: colors.text,
    textAlign: "right",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
