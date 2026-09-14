-- ============================================================
--  ⚠️ مسح كل بيانات الاختبار (لا رجعة فيه)
--  يُبقي حسابات الأدمن والإعدادات. يحذف:
--   - كل سجلات الممولين والإدارات والطلبات والشكاوى والرسائل
--   - كل حسابات الممولين الذين سجّلوا للاختبار
--  استخدمه قبل تشغيل ملفات المرحلة 7 من جديد
-- ============================================================

-- 1) إفراغ جداول البيانات (CASCADE يحذف المرتبط تلقائيًا)
truncate table public.messages                 restart identity cascade;
truncate table public.complaints               restart identity cascade;
truncate table public.requests                 restart identity cascade;
truncate table public.taxpayer_modifications   restart identity cascade;
truncate table public.taxpayers                restart identity cascade;
truncate table public.surveys                  restart identity cascade;
truncate table public.examinations             restart identity cascade;

-- (إدارة الحجز مُستبعدة — احذف الجدول إن أردت لاحقًا)
-- drop table if exists public.seizures cascade;

-- 2) حذف حسابات الممولين الذين سجّلوا للاختبار (البريد المشتق ينتهي بـ taxpayer.tax)
--    سيُحذف ملفهم الشخصي تلقائيًا عبر CASCADE
delete from auth.users where email like '%@taxpayer.tax';

-- 3) (اختياري) لمسح المأموريات أيضًا لإعادة الاستيراد:
-- truncate table public.offices restart identity cascade;

-- 4) (اختياري) لحذف موظفين تجريبيين بريدهم ليس بريدك:
-- delete from auth.users where email <> 'بريد-الأدمن-هنا';
