// إعداد ديناميكي يقرأ المفاتيح من ملف .env ويبني فوق app.json
// (Expo يحمّل .env تلقائيًا إلى process.env)

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
  },
});
