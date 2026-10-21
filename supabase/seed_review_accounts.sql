-- ============================================================
--  حسابات تجريبية لمراجعي Google Play / App Store
--  شغّله بعد phase15_features.sql. آمن لإعادة التشغيل (يعيد توليد كلمات المرور).
--
--  ينشئ مأمورية تجريبية "غير نشطة" (لا تظهر للجمهور في قوائم المأموريات)
--  وبها بيانات وهمية فقط، حتى لا يرى المراجع بيانات ممولين حقيقيين:
--   - موظف: مأمور حصر
--   - ممول: مرتبط بملف تجريبي
--  النتيجة: جدول بيانات الدخول → ضعها في Play Console → App access
--
--  دخول الموظف في التطبيق: اختر "الإدارة العليا (مركزي)" ثم اكتب البريد الكامل.
-- ============================================================

drop table if exists _review_accounts;
create temp table _review_accounts (account text, login text, password text);

do $$
declare
  v_office bigint;
  v_staff uuid;
  v_tp uuid;
  v_file bigint;
  staff_email text := 'emp900001@office999.geotax.local';
  tp_tax text := '999000001';
  tp_email text := 'tax999000001@taxpayer.tax';
  staff_pwd text := 'Rv' || substr(md5(random()::text), 1, 8);
  tp_pwd text := 'Rv' || substr(md5(random()::text), 1, 8);
begin
  insert into public.offices (code, name, governorate, status)
  values ('999', 'مأمورية تجريبية (للمراجعة)', 'تجريبي', 'inactive')
  on conflict (code) do update set status = 'inactive'
  returning id into v_office;

  -- حذف الحسابات التجريبية السابقة وإعادة إنشائها
  delete from public.taxpayers where office_id = v_office and source = 'review_demo';
  delete from auth.users where email in (staff_email, tp_email);

  -- الموظف
  v_staff := gen_random_uuid();
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values (v_staff, '00000000-0000-0000-0000-000000000000', staff_email,
    extensions.crypt(staff_pwd, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', '', '');
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_staff,
    jsonb_build_object('sub', v_staff::text, 'email', staff_email, 'email_verified', true),
    'email', v_staff::text, now(), now(), now());
  insert into public.profiles (id, role, full_name, office_id, employee_number, must_change_password, status)
  values (v_staff, 'surveyor', 'حساب مراجعة — مأمور حصر', v_office, '900001', false, 'active');

  -- الممول
  v_tp := gen_random_uuid();
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values (v_tp, '00000000-0000-0000-0000-000000000000', tp_email,
    extensions.crypt(tp_pwd, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', '', '');
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_tp,
    jsonb_build_object('sub', v_tp::text, 'email', tp_email, 'email_verified', true),
    'email', v_tp::text, now(), now(), now());
  insert into public.profiles (id, role, full_name, national_id, phone, tax_number, office_id, status)
  values (v_tp, 'taxpayer', 'ممول تجريبي للمراجعة', '29001010000000', '01000000000', tp_tax, v_office, 'active');

  -- ملفات تجريبية في المأمورية
  insert into public.taxpayers (name, national_id, tax_number, activity, address, start_date,
    office_id, source, status, registered, user_id, latitude, longitude)
  values ('ممول تجريبي للمراجعة', '29001010000000', tp_tax, 'تجارة أدوات مكتبية',
    'شارع التحرير، القاهرة', '2020-01-01', v_office, 'review_demo', 'مسجل', true, v_tp, 30.0444, 31.2357)
  returning id into v_file;
  insert into public.taxpayers (name, national_id, activity, address, office_id, source, status, latitude, longitude)
  values ('منشأة تجريبية (قيد الحصر)', '28505050000000', 'مطعم', 'شارع رمسيس، القاهرة',
          v_office, 'review_demo', 'قيد الحصر', 30.0626, 31.2497);

  insert into _review_accounts values
    ('موظف (مأمور حصر)', staff_email, staff_pwd),
    ('ممول', 'رقم التسجيل الضريبي: ' || tp_tax, tp_pwd);
end$$;

select * from _review_accounts;
