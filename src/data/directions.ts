// فتح خط السير في تطبيق خرائط جوجل من موقع المأمور إلى موقع النشاط
import { Linking, Platform, Alert } from "react-native";

export async function openDirections(lat: number, lng: number) {
  // يفتح ملاحة جوجل (تحدّد نقطة البداية تلقائيًا من موقع الجهاز)
  const url = Platform.select({
    android: `google.navigation:q=${lat},${lng}`,
    ios: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  })!;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  try {
    const ok = await Linking.canOpenURL(url);
    await Linking.openURL(ok ? url : web);
  } catch {
    Alert.alert("تعذّر فتح الخرائط", "تأكد من تثبيت تطبيق خرائط جوجل.");
  }
}
