// قراءة إعدادات الاتصال من مصدرين لضمان توفرها في كل البيئات:
// 1) متغيّرات البيئة EXPO_PUBLIC_ (تُحقن في الكود وقت البناء)
// 2) قيم extra في إعداد التطبيق (تُخبز في الحزمة المستقلة)
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  privacyPolicyUrl?: string;
};

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || "";
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || "";

// هل تم ضبط إعدادات Supabase؟
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// مزوّد بلاطات الخريطة: OpenStreetMap افتراضيًا (مناسب للاستخدام المحدود فقط).
// للإنتاج يُفضّل مزوّد بمفتاح مثل MapTiler أو Stadia:
// EXPO_PUBLIC_MAP_TILE_URL=https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=YOUR_KEY
export const MAP_TILE_URL =
  process.env.EXPO_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const MAP_ATTRIBUTION =
  process.env.EXPO_PUBLIC_MAP_ATTRIBUTION || "&copy; OpenStreetMap contributors";

// رابط سياسة الخصوصية (مطلوب لنشر التطبيق على المتاجر)
export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || extra.privacyPolicyUrl || "";
