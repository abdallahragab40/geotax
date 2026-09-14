// قراءة إعدادات الاتصال من مصدرين لضمان توفرها في كل البيئات:
// 1) متغيّرات البيئة EXPO_PUBLIC_ (تُحقن في الكود وقت البناء)
// 2) قيم extra في إعداد التطبيق (تُخبز في الحزمة المستقلة)
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || "";
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || "";

// هل تم ضبط إعدادات Supabase؟
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
