-- ============================================================
-- إصلاح كلمات مرور رؤساء المأموريات
-- يحذف الحسابات الناقصة ويعيد إنشاءها بطريقة متوافقة مع Supabase Auth
-- كلمة المرور الجديدة لكل الحسابات: 12345678
-- ============================================================

-- 1) حذف الحسابات المعطوبة
do $$
declare u record;
begin
  for u in select id from auth.users where email like 'emp%@office%.geotax.local'
  loop
    delete from public.profiles where id = u.id;
    delete from auth.identities where user_id = u.id;
    delete from auth.users where id = u.id;
  end loop;
end$$;

-- 2) دالة مساعدة لإنشاء office_head صحيح
create or replace function public._create_office_head(
  p_email text,
  p_password text,
  p_full_name text,
  p_office_code text,
  p_emp_number text
) returns uuid
language plpgsql
as $$
declare
  new_uid uuid := gen_random_uuid();
  office_uid bigint;
begin
  select id into office_uid from public.offices where code = p_office_code;
  if office_uid is null then
    raise notice 'تخطّي %: المأمورية % غير موجودة', p_email, p_office_code;
    return null;
  end if;

  -- إدراج المستخدم في auth.users بكل الحقول المطلوبة
  insert into auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, created_at, updated_at,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    new_uid,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    'authenticated', 'authenticated',
    now(), now(),
    '', '', '', '', '', '', '', ''
  );

  -- إدراج identity record (عمود email في auth.identities محسوب تلقائيًا من identity_data)
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), new_uid,
    jsonb_build_object('sub', new_uid::text, 'email', p_email, 'email_verified', true),
    'email', new_uid::text,
    now(), now(), now()
  );

  -- إدراج profile
  insert into public.profiles (id, role, full_name, office_id, employee_number, must_change_password, status)
  values (new_uid, 'office_head', p_full_name, office_uid, p_emp_number, true, 'active');

  return new_uid;
end$$;

-- 3) إنشاء الـ14 رئيس مأمورية
select public._create_office_head('emp223@office101.geotax.local', '12345678', 'مدحت سعيد',     '101', '223');
select public._create_office_head('emp224@office102.geotax.local', '12345678', 'سامي عبد الفتاح', '102', '224');
select public._create_office_head('emp225@office103.geotax.local', '12345678', 'محمد رضا',       '103', '225');
select public._create_office_head('emp226@office104.geotax.local', '12345678', 'أحمد فاروق',     '104', '226');
select public._create_office_head('emp227@office105.geotax.local', '12345678', 'كريم منصور',     '105', '227');
select public._create_office_head('emp228@office201.geotax.local', '12345678', 'فؤاد إبراهيم',   '201', '228');
select public._create_office_head('emp229@office202.geotax.local', '12345678', 'يحيى الشريف',    '202', '229');
select public._create_office_head('emp230@office203.geotax.local', '12345678', 'هاني صبري',      '203', '230');
select public._create_office_head('emp231@office301.geotax.local', '12345678', 'رمضان حسين',     '301', '231');
select public._create_office_head('emp232@office302.geotax.local', '12345678', 'طارق عيسى',      '302', '232');
select public._create_office_head('emp233@office303.geotax.local', '12345678', 'علاء الدين',     '303', '233');
select public._create_office_head('emp234@office401.geotax.local', '12345678', 'وائل عبد العزيز','401', '234');
select public._create_office_head('emp235@office402.geotax.local', '12345678', 'مجدي صلاح',      '402', '235');
select public._create_office_head('emp236@office403.geotax.local', '12345678', 'حسام الدين',     '403', '236');

-- 4) تنظيف الدالة المساعدة
drop function public._create_office_head(text, text, text, text, text);

-- 5) التحقق من النتيجة
select
  (select count(*) from auth.users where email like 'emp%@office%.geotax.local') as auth_users,
  (select count(*) from public.profiles where role = 'office_head') as profiles_heads;
