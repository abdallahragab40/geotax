-- ============================================================
--  رؤساء المأموريات (14) + إنشاء حسابات الدخول
--  كلمة المرور الافتراضية لكل واحد: 12345 (يُجبر على تغييرها أول دخول)
--  الإيميل المشتق: emp{رقم الحاسب}@office{كود المأمورية}.geotax.local
-- ============================================================

-- يتطلّب وجود extension للتشفير
create extension if not exists pgcrypto;

do $$
declare
  v_user_id uuid;
  v_email text;
  v_office_id bigint;
  v_office_code text;
  r record;
begin

  -- مدحت سعيد — مغاغة — رقم 223
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'مغاغة' limit 1;
  if v_office_id is not null then
    v_email := 'emp223@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;

  -- طارق عبد العزيز — بني مزار — رقم 957
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'بني مزار' limit 1;
  if v_office_id is not null then
    v_email := 'emp957@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;

  -- طارق غنيم — سمالوط — رقم 902
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'سمالوط' limit 1;
  if v_office_id is not null then
    v_email := 'emp902@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;

  -- خالد غنيم — المنيا — رقم 703
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'المنيا' limit 1;
  if v_office_id is not null then
    v_email := 'emp703@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;

  -- رشدي راضي — ملوي — رقم 497
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'ملوي' limit 1;
  if v_office_id is not null then
    v_email := 'emp497@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;

  -- عادل الجارحي — الفيوم — رقم 471
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'الفيوم' limit 1;
  if v_office_id is not null then
    v_email := 'emp471@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;

  -- عصام حسن — سنورس — رقم 279
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'سنورس' limit 1;
  if v_office_id is not null then
    v_email := 'emp279@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;

  -- جمال عبد العزيز — طامية — رقم 758
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'طامية' limit 1;
  if v_office_id is not null then
    v_email := 'emp758@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;

  -- أيمن راضي — بني سويف — رقم 723
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'بني سويف' limit 1;
  if v_office_id is not null then
    v_email := 'emp723@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;

  -- شريف منصور — الواسطى — رقم 943
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'الواسطى' limit 1;
  if v_office_id is not null then
    v_email := 'emp943@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;

  -- رشدي حسن — ببا — رقم 447
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'ببا' limit 1;
  if v_office_id is not null then
    v_email := 'emp447@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;

  -- أشرف سعيد — أسيوط — رقم 332
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'أسيوط' limit 1;
  if v_office_id is not null then
    v_email := 'emp332@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;

  -- ممدوح سعيد — ديروط — رقم 949
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'ديروط' limit 1;
  if v_office_id is not null then
    v_email := 'emp949@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;

  -- عصام سيد — منفلوط — رقم 603
  select id, code into v_office_id, v_office_code
    from public.offices where name = 'منفلوط' limit 1;
  if v_office_id is not null then
    v_email := 'emp603@office' || v_office_code || '.geotax.local';
    -- تخطّى إن كان الحساب موجودًا
    if not exists (select 1 from auth.users where email = v_email) then
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
    end if;
  end if;
end $$;
