# دليل إعداد النظام السحابي (تنفّذه مرة واحدة)

التطبيق الآن متعدد المستخدمين ويحتاج خادمًا. اتبع هذه الخطوات ثم أرسل لي القيم المطلوبة.

---

## 1) إنشاء مشروع Supabase (مجاني)

1. ادخل على **https://supabase.com** → سجّل دخول (بحساب GitHub أو بريد).
2. اضغط **New project** → اختر اسمًا (مثل `taxes-app`) وكلمة مرور لقاعدة البيانات (احفظها).
3. انتظر دقيقتين حتى يجهز المشروع.

## 2) تشغيل مخطط قاعدة البيانات

1. من القائمة الجانبية: **SQL Editor** → **New query**.
2. شغّل الملفات التالية من مجلد `supabase/` **بهذا الترتيب** (انسخ محتوى كل ملف ← **Run**):
   1. `schema.sql`
   2. `phase1_roles.sql` → `phase2_taxpayers.sql` → `phase345.sql` → `phase6.sql`
   3. `phase7_offices.sql` → `phase8_admin.sql` → `phase9_survey.sql` → `phase10_exam.sql`
   4. `phase11_taxpayer.sql` → `phase12_audit.sql` → `phase13_v2_complete.sql` → `seed_taxpayers_v2.sql`
   5. `change_password_rpc.sql`
   6. **`phase14_security_hardening.sql`** (إلزامي قبل النشر — يغلق ثغرات الصلاحيات)
   7. **`phase15_features.sql`** (استعادة كلمة المرور، إشعارات الهاتف، حماية الشكاوى، التخزين الخاص)
   8. **`rotate_default_passwords.sql`** (إلزامي قبل النشر — احفظ نتيجته وسلّم كلمات المرور لأصحابها بشكل سري)
   9. `seed_review_accounts.sql` (حسابات مراجعي المتجر — انظر [STORE_RELEASE.md](STORE_RELEASE.md))
3. يجب أن تظهر "Success" بعد كل ملف.

## 3) الحصول على مفاتيح Supabase

1. **Project Settings** (الترس) → **API**.
2. انسخ القيمتين:
   - **Project URL** (مثل `https://abcd.supabase.co`)
   - **anon public** key (مفتاح طويل)

## 3.5) تعطيل تأكيد البريد (مهم جدًا)

لأن الممولين يسجّلون بالرقم القومي والهاتف (بدون بريد حقيقي):
1. **Authentication** → **Providers** (أو **Sign In / Providers**) → **Email**.
2. أوقف خيار **Confirm email** (Disable) واحفظ.

## 4) إنشاء حساب الموظف

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. أدخل بريدًا وكلمة مرور للموظف (مثال: `officer@tax.app` / كلمة مرور قوية). فعّل **Auto Confirm**.
3. انسخ **User UID** الظاهر بعد الإنشاء.
4. ارجع إلى **SQL Editor** ونفّذ (مع تبديل UID والاسم):
   ```sql
   insert into public.profiles (id, role, full_name)
   values ('ضع-UID-هنا', 'employee', 'اسم الموظف');
   ```

> الممولون لا تنشئ حساباتهم يدويًا — يسجّلون بأنفسهم داخل التطبيق بالرقم القومي ورقم الهاتف.

## 5) إدخال المفاتيح في المشروع

افتح ملف `.env` في جذر المشروع واملأ:
```
EXPO_PUBLIC_SUPABASE_URL=...        # من خطوة 3
EXPO_PUBLIC_SUPABASE_ANON_KEY=...   # من خطوة 3
```

> تنبيه أمني: المفتاح `anon` آمن للاستخدام في التطبيق (محمي بسياسات RLS). لكن لا تشارك كلمة مرور قاعدة البيانات أو مفتاح `service_role` أبدًا.
