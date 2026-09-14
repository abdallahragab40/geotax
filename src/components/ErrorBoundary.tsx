// حاجز أخطاء: يعرض الخطأ على الشاشة بدل إغلاق التطبيق صامتًا
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors } from "../theme";

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // يمكن تسجيله لاحقًا
    console.error("App error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>حدث خطأ في التطبيق</Text>
          <Text style={styles.msg}>{this.state.error.message}</Text>
          <Text style={styles.stack}>{this.state.error.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: colors.background },
  title: { fontSize: 18, fontWeight: "800", color: colors.danger, textAlign: "center", marginBottom: 12 },
  msg: { fontSize: 14, color: colors.text, textAlign: "center", marginBottom: 12 },
  stack: { fontSize: 11, color: colors.muted, textAlign: "left" },
});
