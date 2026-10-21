// إشعارات الهاتف (Push): تسجيل رمز الجهاز في الملف الشخصي.
// الإرسال يتم من قاعدة البيانات تلقائيًا لكل إشعار جديد (phase15_features.sql).
// على أندرويد يتطلب ملف google-services.json + مفتاح FCM مرفوع على EAS؛
// بدونهما يتجاهل التطبيق التسجيل بهدوء وتبقى الإشعارات داخل التطبيق تعمل.
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { supabase } from "../lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function pushAvailable(): boolean {
  // Expo Go لا يدعم Push على أندرويد، والنسخة المستقلة تحتاج Firebase
  if (Constants.appOwnership === "expo") return false;
  if (Platform.OS === "android" && !Constants.expoConfig?.android?.googleServicesFile) return false;
  return Platform.OS === "android" || Platform.OS === "ios";
}

export async function registerForPush(userId: string): Promise<void> {
  if (!pushAvailable()) return;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "الإشعارات",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0E7C66",
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await supabase.from("profiles").update({ expo_push_token: token }).eq("id", userId);
  } catch {
    // فشل التسجيل (بدون إنترنت أو إعداد ناقص) لا يجب أن يعطّل التطبيق
  }
}

// عند تسجيل الخروج: إلغاء ربط الجهاز حتى لا تصل إشعارات الحساب لجهاز آخر
export async function unregisterPush(userId: string): Promise<void> {
  try {
    await supabase.from("profiles").update({ expo_push_token: null }).eq("id", userId);
  } catch {}
}
