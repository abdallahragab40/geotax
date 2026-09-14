-- ============================================================
-- المرحلة 13: إعادة الهيكلة الكاملة للصلاحيات + تنظيف + تحميل بيانات جديدة
-- يُشغّل مرة واحدة من Supabase SQL Editor
-- ============================================================

-- ============================================================
-- (1) تنظيف بيانات رؤساء المأموريات + المأموريات
-- (نُبقي على الـ1000 ممول كما طلب المستخدم)
-- ============================================================

-- حذف auth.users لرؤساء المأموريات
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

-- حذف بقية حسابات الموظفين الناقصة (it_manager / survey / exam) إن وُجدت
delete from public.profiles
  where role in ('office_head','it_manager','survey_manager','survey_reviewer','surveyor',
                  'exam_manager','exam_reviewer','examiner','employee');

-- تصفير كل FK إلى offices قبل الحذف (لتجنب CASCADE الذي يمسح الصفوف)
update public.profiles set office_id = null where office_id is not null;
update public.taxpayers set office_id = null where office_id is not null;
update public.surveys set office_id = null where office_id is not null;
update public.examinations set office_id = null where office_id is not null;
update public.requests set office_id = null where office_id is not null;
update public.complaints set office_id = null where office_id is not null;
update public.taxpayer_modifications set office_id = null where office_id is not null;

-- delete بدلًا من truncate cascade (أقل خطرًا)
delete from public.offices;
alter sequence public.offices_id_seq restart with 1;

-- ============================================================
-- (2) RLS الكامل: السماح للأدمن بإدارة المأموريات (insert/update/delete)
-- ============================================================
alter table public.offices enable row level security;
drop policy if exists offices_public_read on public.offices;
create policy offices_public_read on public.offices for select using (true);

drop policy if exists offices_admin_modify on public.offices;
create policy offices_admin_modify on public.offices for all
  using (public.is_admin()) with check (public.is_admin());

grant select on public.offices to anon, authenticated;
grant insert, update, delete on public.offices to authenticated;

-- ============================================================
-- (3) RLS على profiles: office_head لا يرى office_heads أخرى
-- ============================================================
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or public.is_admin()
  or office_id = public.my_office_id()
);

-- ============================================================
-- (4) RPC جديد: admin_create_employee — يفرض الهرم الإداري
--   - admin → office_head (مع p_office_id إجباري)
--   - office_head → it_manager (في مأموريته)
--   - it_manager → باقي الموظفين (في مأموريته)
-- ============================================================
create or replace function public.admin_create_employee(
  p_target uuid,
  p_role text,
  p_office_id bigint,
  p_emp_number text default null
) returns void
language plpgsql security definer
as $$
declare
  my_role text;
  my_office bigint;
begin
  select role, office_id into my_role, my_office
    from public.profiles where id = auth.uid();
  if my_role is null then
    raise exception 'غير مصرّح';
  end if;

  if my_role = 'admin' then
    if p_role <> 'office_head' then
      raise exception 'الإدارة العليا تضيف رؤساء المأموريات فقط';
    end if;
    if p_office_id is null then
      raise exception 'يجب اختيار المأمورية';
    end if;
  elsif my_role = 'office_head' then
    if p_role <> 'it_manager' then
      raise exception 'رئيس المأمورية يضيف مدير الحاسب فقط';
    end if;
    p_office_id := my_office;
  elsif my_role = 'it_manager' then
    if p_role not in ('survey_manager','survey_reviewer','surveyor',
                      'exam_manager','exam_reviewer','examiner') then
      raise exception 'مدير الحاسب يضيف موظفي المأمورية فقط';
    end if;
    p_office_id := my_office;
  else
    raise exception 'لا تملك صلاحية إضافة موظفين';
  end if;

  update public.profiles
    set role = p_role,
        office_id = p_office_id,
        employee_number = coalesce(p_emp_number, employee_number),
        must_change_password = true
    where id = p_target;
end$$;

grant execute on function public.admin_create_employee(uuid, text, bigint, text) to authenticated;

-- ============================================================
-- (5) الدالة المساعدة لإنشاء office_head بكل حقول auth صحيحة
-- ============================================================
create or replace function public._create_office_head(
  p_email text,
  p_password text,
  p_full_name text,
  p_office_code text,
  p_emp_number text
) returns uuid
language plpgsql
set search_path = public, auth, extensions
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
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    'authenticated', 'authenticated',
    now(), now(),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), new_uid,
    jsonb_build_object('sub', new_uid::text, 'email', p_email, 'email_verified', true),
    'email', new_uid::text,
    now(), now(), now()
  );

  insert into public.profiles (id, role, full_name, office_id, employee_number, must_change_password, status)
  values (new_uid, 'office_head', p_full_name, office_uid, p_emp_number, true, 'active');

  return new_uid;
end$$;

-- ============================================================
-- (6) تحميل المأموريات (20)
-- ============================================================
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

-- ============================================================
-- (7) إنشاء رؤساء المأموريات الـ20 (بأرقام الحاسب الحقيقية من ر.xlsx)
-- كلمة المرور الموحّدة: 12345678
-- ============================================================
select public._create_office_head('emp1998507@office101.geotax.local', '12345678', 'أحمد ممدوح حسن حجازي', '101', '1998507');
select public._create_office_head('emp3221945@office102.geotax.local', '12345678', 'محمود سيد محمد الشافعي', '102', '3221945');
select public._create_office_head('emp9668379@office103.geotax.local', '12345678', 'محمد حسن ممدوح الخولي', '103', '9668379');
select public._create_office_head('emp1759683@office104.geotax.local', '12345678', 'مصطفى فتحي ممدوح صقر', '104', '1759683');
select public._create_office_head('emp1807783@office105.geotax.local', '12345678', 'سامح عبد العزيز حسن عمران', '105', '1807783');
select public._create_office_head('emp2665018@office201.geotax.local', '12345678', 'شريف محمد محمد عمران', '201', '2665018');
select public._create_office_head('emp2971337@office202.geotax.local', '12345678', 'خالد علي فتحي عمران', '202', '2971337');
select public._create_office_head('emp6170272@office203.geotax.local', '12345678', 'عمرو أحمد جمال الخطيب', '203', '6170272');
select public._create_office_head('emp5472724@office301.geotax.local', '12345678', 'طارق سليمان محمد الخولي', '301', '5472724');
select public._create_office_head('emp1738876@office302.geotax.local', '12345678', 'هاني ممدوح عبد العزيز عبد الرحمن', '302', '1738876');
select public._create_office_head('emp4738320@office303.geotax.local', '12345678', 'عادل عبد العزيز عبد العزيز المنياوي', '303', '4738320');
select public._create_office_head('emp3022810@office401.geotax.local', '12345678', 'أيمن محمد ممدوح غنيم', '401', '3022810');
select public._create_office_head('emp4084108@office402.geotax.local', '12345678', 'إبراهيم أحمد حسن عمران', '402', '4084108');
select public._create_office_head('emp6906577@office403.geotax.local', '12345678', 'عصام حسن حسن صقر', '403', '6906577');
select public._create_office_head('emp7113858@office501.geotax.local', '12345678', 'مجدي سيد محمود منصور', '501', '7113858');
select public._create_office_head('emp6006569@office502.geotax.local', '12345678', 'ياسر أحمد صلاح الشافعي', '502', '6006569');
select public._create_office_head('emp5889450@office601.geotax.local', '12345678', 'تامر سليمان جمال المنياوي', '601', '5889450');
select public._create_office_head('emp1816102@office602.geotax.local', '12345678', 'أشرف محمد أحمد غنيم', '602', '1816102');
select public._create_office_head('emp3084030@office701.geotax.local', '12345678', 'كريم فتحي جمال الخولي', '701', '3084030');
select public._create_office_head('emp4447386@office702.geotax.local', '12345678', 'سعيد جمال حسن الخطيب', '702', '4447386');

-- ============================================================
-- (8) تنظيف الدالة المساعدة وعرض التحقق
-- ============================================================
drop function public._create_office_head(text, text, text, text, text);

select
  (select count(*) from public.offices) as offices,
  (select count(*) from auth.users where email like 'emp%@office%.geotax.local') as heads_auth,
  (select count(*) from public.profiles where role = 'office_head') as heads_profiles,
  (select count(*) from public.taxpayers) as taxpayers_kept;
