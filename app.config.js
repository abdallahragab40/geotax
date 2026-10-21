// إعداد ديناميكي يقرأ المفاتيح من ملف .env ويبني فوق app.json
// (Expo يحمّل .env تلقائيًا إلى process.env)
const fs = require("fs");
const path = require("path");

// ملف Firebase مطلوب لإشعارات الهاتف على أندرويد — يُضاف فقط إن وُجد
// (ضعه في جذر المشروع باسم google-services.json أو حدّد مساره في GOOGLE_SERVICES_JSON)
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || "./google-services.json";
const hasGoogleServices = fs.existsSync(path.resolve(__dirname, googleServicesFile));

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(hasGoogleServices ? { googleServicesFile } : {}),
  },
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
  },
});
