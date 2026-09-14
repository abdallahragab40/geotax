// عميل Supabase: المصادقة + قاعدة البيانات + التخزين + البث اللحظي
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// قيم بديلة آمنة حتى لا يتعطّل التطبيق عند بدء التشغيل لو غابت المفاتيح
// (في تلك الحالة تظهر شاشة "لم يُضبط Supabase" بدل الإغلاق)
const url = SUPABASE_URL || "https://placeholder.supabase.co";
const key = SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
