-- ============================================================
--  ملف شامل: مسح + إضافة المأموريات (20) + رؤساء المأموريات (14)
--  شغّل هذا الملف في Supabase SQL Editor دفعة واحدة
--  (الممولون في ملف منفصل seed_taxpayers_v2.sql)
-- ============================================================

create extension if not exists pgcrypto;

-- =============== 1) مسح البيانات السابقة (آمن) ===============
-- حذف حسابات رؤساء المأموريات السابقة (إعادة تشغيل آمنة)
delete from auth.users where email like 'emp%@office%.geotax.local';
-- مسح المأموريات (سيُعاد إنشاؤها)
truncate table public.offices restart identity cascade;

-- =============== 2) إضافة المأموريات (20) ===============
insert into public.offices (code, name, governorate, status) values
('101','مغاغة','المنيا','active'),
('102','بني مزار','المنيا','active'),
('103','سمالوط','المنيا','active'),
('104','المنيا أول','المنيا','active'),
('105','ملوي','المنيا','active'),
('201','بندر الفيوم','الفيوم','active'),
('202','سنورس','الفيوم','active'),
('203','طامية','الفيوم','active'),
('301','بندر بني سويف','بني سويف','active'),
('302','الواسطى','بني سويف','active'),
('303','ببا','بني سويف','active'),
('401','أسيوط أول','أسيوط','active'),
('402','ديروط','أسيوط','active'),
('403','منفلوط','أسيوط','active'),
('501','قسم أول طنطا','الغربية','active'),
('502','المحلة الكبرى','الغربية','active'),
('601','بنها','القليوبية','active'),
('602','شبرا الخيمة','القليوبية','active'),
('701','مصر الجديدة','القاهرة','active'),
('702','مدينة نصر أول','القاهرة','active');

-- =============== 3) رؤساء المأموريات (14) ===============
-- كلمة المرور الافتراضية: 12345 (يُجبر على تغييرها)
do $$
declare
  v_user_id uuid;
  v_email text;
  v_office_id bigint;
  v_office_code text;
begin

  -- مدحت سعيد — مأمورية: مغاغة (كود 101) — رقم حاسب 223
  v_office_id := (select id from public.offices where code = '101');
  v_office_code := '101';
  v_email := 'emp223@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'مدحت سعيد', '223', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );

  -- طارق عبد العزيز — مأمورية: بني مزار (كود 102) — رقم حاسب 957
  v_office_id := (select id from public.offices where code = '102');
  v_office_code := '102';
  v_email := 'emp957@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'طارق عبد العزيز', '957', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );

  -- طارق غنيم — مأمورية: سمالوط (كود 103) — رقم حاسب 902
  v_office_id := (select id from public.offices where code = '103');
  v_office_code := '103';
  v_email := 'emp902@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'طارق غنيم', '902', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );

  -- خالد غنيم — مأمورية: المنيا أول (كود 104) — رقم حاسب 703
  v_office_id := (select id from public.offices where code = '104');
  v_office_code := '104';
  v_email := 'emp703@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'خالد غنيم', '703', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );

  -- رشدي راضي — مأمورية: ملوي (كود 105) — رقم حاسب 497
  v_office_id := (select id from public.offices where code = '105');
  v_office_code := '105';
  v_email := 'emp497@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'رشدي راضي', '497', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );

  -- عادل الجارحي — مأمورية: بندر الفيوم (كود 201) — رقم حاسب 471
  v_office_id := (select id from public.offices where code = '201');
  v_office_code := '201';
  v_email := 'emp471@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'عادل الجارحي', '471', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );

  -- عصام حسن — مأمورية: سنورس (كود 202) — رقم حاسب 279
  v_office_id := (select id from public.offices where code = '202');
  v_office_code := '202';
  v_email := 'emp279@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'عصام حسن', '279', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );

  -- جمال عبد العزيز — مأمورية: طامية (كود 203) — رقم حاسب 758
  v_office_id := (select id from public.offices where code = '203');
  v_office_code := '203';
  v_email := 'emp758@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'جمال عبد العزيز', '758', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );

  -- أيمن راضي — مأمورية: بندر بني سويف (كود 301) — رقم حاسب 723
  v_office_id := (select id from public.offices where code = '301');
  v_office_code := '301';
  v_email := 'emp723@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'أيمن راضي', '723', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );

  -- شريف منصور — مأمورية: الواسطى (كود 302) — رقم حاسب 943
  v_office_id := (select id from public.offices where code = '302');
  v_office_code := '302';
  v_email := 'emp943@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'شريف منصور', '943', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );

  -- رشدي حسن — مأمورية: ببا (كود 303) — رقم حاسب 447
  v_office_id := (select id from public.offices where code = '303');
  v_office_code := '303';
  v_email := 'emp447@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'رشدي حسن', '447', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );

  -- أشرف سعيد — مأمورية: أسيوط أول (كود 401) — رقم حاسب 332
  v_office_id := (select id from public.offices where code = '401');
  v_office_code := '401';
  v_email := 'emp332@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'أشرف سعيد', '332', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );

  -- ممدوح سعيد — مأمورية: ديروط (كود 402) — رقم حاسب 949
  v_office_id := (select id from public.offices where code = '402');
  v_office_code := '402';
  v_email := 'emp949@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'ممدوح سعيد', '949', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );

  -- عصام سيد — مأمورية: منفلوط (كود 403) — رقم حاسب 603
  v_office_id := (select id from public.offices where code = '403');
  v_office_code := '403';
  v_email := 'emp603@office' || v_office_code || '.geotax.local';
  v_user_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('12345', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text,
    now(), now(), now()
  );
  insert into public.profiles (
    id, role, full_name, employee_number, office_id,
    must_change_password, status, position_title, email
  ) values (
    v_user_id, 'office_head', 'عصام سيد', '603', v_office_id,
    true, 'active', 'رئيس مأمورية', v_email
  );
end $$;

-- =============== ✅ تم! ===============
-- الخطوة التالية: شغّل seed_taxpayers_v2.sql لإضافة 1000 ممول
