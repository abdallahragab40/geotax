-- ============================================================
--  المرحلة 14: تقوية الأمان قبل النشر على المتجر
--  شغّل هذا الملف مرة واحدة من Supabase → SQL Editor (بعد كل المراحل السابقة)
--  آمن لإعادة التشغيل (idempotent).
--
--  يغلق الثغرات التالية:
--   1) أي مستخدم كان يستطيع ترقية نفسه إلى admin بتعديل عمود role في ملفه
--   2) admin_assign_office_role كانت تسمح لرئيس المأمورية/مدير الحاسب بمنح أي دور (حتى admin) لأي مستخدم
--   3) admin_create_employee كانت تقبل أي مستخدم هدف (يمكن خفض صلاحية الأدمن أو نقل موظف من مأمورية أخرى)
--   4) register_as_employee برمز ثابت منشور في المستودع = باب خلفي لصلاحية موظف
--   5) الممول كان يستطيع تغيير tax_number في ملفه فيقرأ ملف ممول آخر
--   6) أي موظف كان يكتب/يحذف ممولي أي مأمورية أخرى، والكل يرى ممولي الجميع في الملفات الشخصية
--   7) أي شخص كان يستطيع إدخال إشعارات وسجلات عمليات مزيفة
--   8) حالة "موقوف" لم تكن مطبّقة إطلاقًا
--   9) الدوال الحساسة (البحث المركزي...) كانت متاحة لغير المسجّلين (anon)
--  ويضيف:
--   - admin_reset_password: إعادة تعيين كلمة مرور موظف ضمن الهرم الإداري
--   - delete_my_account: حذف الحساب من داخل التطبيق (متطلب إلزامي في Google Play و App Store)
--   - taxpayer_can_register / request_taxpayer_file: إصلاح تسجيل الممول الجديد
--   - تعبئة office_id تلقائيًا لكل السجلات الجديدة
-- ============================================================

-- ============================================================
-- (1) دوال الصلاحيات — تأخذ حالة الحساب (نشط/موقوف) في الاعتبار
-- ============================================================
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and coalesce(status, 'active') = 'active');
$$;

create or replace function public.is_staff()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid()
    and coalesce(status, 'active') = 'active'
    and role in (
      'admin','office_head','it_manager',
      'survey_manager','survey_reviewer','surveyor',
      'exam_manager','exam_reviewer','examiner','employee'
    ));
$$;

create or replace function public.is_exam_staff()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid()
    and coalesce(status, 'active') = 'active'
    and role in ('admin','office_head','exam_manager','exam_reviewer','examiner'));
$$;

-- هل يحق للمستخدم الوصول لسجلات هذه المأمورية؟
-- (السجلات القديمة بدون مأمورية تبقى متاحة للموظفين حتى تُصنَّف)
create or replace function public.can_access_office(target_office bigint)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_admin()
    or (public.is_staff() and (target_office is null or target_office = public.my_office_id()));
$$;

-- هل يحق للمستخدم الحالي إدارة حساب الهدف؟ (الهرم: أدمن ← رئيس مأمورية ← مدير حاسب ← الموظفون)
create or replace function public.can_manage_user(target uuid)
returns boolean language plpgsql security definer stable set search_path = public as $$
declare me record; t record;
begin
  select role, office_id into me from public.profiles
    where id = auth.uid() and coalesce(status, 'active') = 'active';
  select role, office_id into t from public.profiles where id = target;
  if me.role is null or t.role is null or target = auth.uid() then
    return false;
  end if;
  if me.role = 'admin' then
    return t.role <> 'admin';
  end if;
  if me.office_id is null or t.office_id is distinct from me.office_id then
    return false;
  end if;
  if me.role = 'office_head' then
    return t.role in ('it_manager','survey_manager','survey_reviewer','surveyor',
                      'exam_manager','exam_reviewer','examiner');
  end if;
  if me.role = 'it_manager' then
    return t.role in ('survey_manager','survey_reviewer','surveyor',
                      'exam_manager','exam_reviewer','examiner','taxpayer');
  end if;
  return false;
end$$;

-- ============================================================
-- (2) حماية الأعمدة الحساسة في profiles
--   العميل (anon/authenticated) لا يستطيع تعديل الدور/المأمورية/الرقم الضريبي/الحالة...
--   التعديل يتم فقط عبر دوال security definer الموثوقة.
-- ============================================================
create or replace function public._protect_profile_columns()
returns trigger language plpgsql as $$
begin
  -- داخل دوال security definer يكون current_user مالك الدالة (postgres) → مسموح
  if current_user not in ('anon', 'authenticated') then
    return NEW;
  end if;

  if TG_OP = 'INSERT' then
    -- التسجيل الذاتي: ممول فقط وبدون أي حقول امتياز
    NEW.role := 'taxpayer';
    NEW.tax_number := null;
    NEW.status := 'active';
    NEW.must_change_password := false;
    NEW.employee_number := null;
    return NEW;
  end if;

  if NEW.role is distinct from OLD.role
     or NEW.office_id is distinct from OLD.office_id
     or NEW.tax_number is distinct from OLD.tax_number
     or NEW.status is distinct from OLD.status
     or NEW.must_change_password is distinct from OLD.must_change_password
     or NEW.employee_number is distinct from OLD.employee_number
     or NEW.national_id is distinct from OLD.national_id then
    raise exception 'غير مسموح بتعديل هذه البيانات من التطبيق';
  end if;
  return NEW;
end$$;

drop trigger if exists trg_protect_profile_columns on public.profiles;
create trigger trg_protect_profile_columns
  before insert or update on public.profiles
  for each row execute function public._protect_profile_columns();

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid() and role = 'taxpayer');

-- كل مستخدم يعدّل ملفه فقط (تعديلات الإدارة تتم عبر RPC)
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- القراءة:
--  - كل مستخدم يرى ملفه
--  - الأدمن يرى الكل
--  - الموظف يرى ملفات مأموريته + الإدارة العليا (للمراسلة)
--  - الممول يرى موظفي مأموريته فقط (للمراسلة) — ولا يرى بيانات ممولين آخرين
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or public.is_admin()
  or (public.is_staff() and office_id = public.my_office_id())
  or (public.is_staff() and role = 'admin')
  or (role not in ('taxpayer','complainant')
      and office_id is not null and office_id = public.my_office_id())
);

-- ربط الممولين الحاليين بمأمورية ملفهم (لازم للمراسلة ورؤية موظفي المأمورية)
update public.profiles p
   set office_id = t.office_id
  from public.taxpayers t
 where t.user_id = p.id and p.role = 'taxpayer'
   and p.office_id is null and t.office_id is not null;

-- ============================================================
-- (3) إزالة الدوال الخطرة / غير المستخدمة
-- ============================================================
drop function if exists public.admin_assign_office_role(uuid, bigint, text, text);
drop function if exists public.register_as_employee(text, text);
delete from public.app_config where key = 'employee_code';

-- admin_set_role: للأدمن فقط ولا تمنح إلا أدوارًا صالحة
create or replace function public.admin_set_role(target uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'غير مصرّح: يتطلب صلاحية مدير';
  end if;
  if new_role not in ('admin','office_head','it_manager','survey_manager','survey_reviewer',
                      'surveyor','exam_manager','exam_reviewer','examiner','taxpayer') then
    raise exception 'دور غير صالح';
  end if;
  update public.profiles set role = new_role where id = target;
end$$;

-- ============================================================
-- (4) إنشاء الموظفين: الهدف يجب أن يكون حسابًا جديدًا تم إنشاؤه للتو بالبريد الداخلي
-- ============================================================
create or replace function public.admin_create_employee(
  p_target uuid,
  p_role text,
  p_office_id bigint,
  p_emp_number text default null
) returns void
language plpgsql security definer set search_path = public, auth
as $$
declare
  my_role text;
  my_office bigint;
  t record;
  t_email text;
begin
  select role, office_id into my_role, my_office
    from public.profiles where id = auth.uid() and coalesce(status, 'active') = 'active';
  if my_role is null then
    raise exception 'غير مصرّح';
  end if;

  -- التحقق من الحساب الهدف: جديد، بدون دور، وبريده داخلي
  select role, office_id, tax_number, created_at into t from public.profiles where id = p_target;
  select email into t_email from auth.users where id = p_target;
  if t.role is distinct from 'taxpayer' or t.office_id is not null or t.tax_number is not null
     or t.created_at < now() - interval '15 minutes'
     or t_email is null or t_email not like 'emp%@office%.geotax.local'
     or exists (select 1 from public.taxpayers where user_id = p_target) then
    raise exception 'الحساب المستهدف غير صالح لإنشاء موظف';
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
        must_change_password = true,
        status = 'active'
    where id = p_target;
end$$;

-- ============================================================
-- (5) إدارة الحسابات ضمن الهرم الإداري فقط
-- ============================================================
create or replace function public.admin_set_user_status(target uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_user(target) then
    raise exception 'غير مصرّح';
  end if;
  if p_status not in ('active','suspended') then raise exception 'حالة غير صالحة'; end if;
  update public.profiles set status = p_status where id = target;
end$$;

create or replace function public.admin_request_password_reset(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_user(target) then
    raise exception 'غير مصرّح';
  end if;
  update public.profiles set must_change_password = true where id = target;
end$$;

-- إعادة تعيين كلمة مرور فعلية (لمن نسي كلمة مروره) + إجبار تغييرها عند الدخول
create or replace function public.admin_reset_password(target uuid, new_password text)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.can_manage_user(target) then
    raise exception 'غير مصرّح';
  end if;
  if length(coalesce(new_password, '')) < 8 then
    raise exception 'كلمة المرور يجب ألا تقل عن 8 أحرف';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = target;
  update public.profiles set must_change_password = true where id = target;
end$$;

create or replace function public.change_my_password(new_password text)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;
  if length(coalesce(new_password, '')) < 8 then
    raise exception 'كلمة المرور يجب ألا تقل عن 8 أحرف';
  end if;
  if new_password in ('12345678', '123456789', '1234567890', '00000000', '11111111') then
    raise exception 'كلمة المرور سهلة التخمين، اختر كلمة أقوى';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = auth.uid();
  update public.profiles set must_change_password = false where id = auth.uid();
end$$;

create or replace function public.head_delete_taxpayer(target_id bigint, p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare row_data jsonb; office bigint;
begin
  select to_jsonb(t.*), t.office_id into row_data, office from public.taxpayers t where id = target_id;
  if row_data is null then raise exception 'الملف غير موجود'; end if;
  if not (public.is_admin() or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'office_head'
        and coalesce(status, 'active') = 'active'
        and (office is null or office_id = office))) then
    raise exception 'غير مصرّح';
  end if;
  insert into public.deletion_log (entity_type, entity_id, entity_snapshot, office_id, reason, deleted_by)
    values ('taxpayer', target_id, row_data, office, coalesce(p_reason, ''), auth.uid());
  delete from public.taxpayers where id = target_id;
end$$;

-- ============================================================
-- (6) تسجيل الممولين
-- ============================================================
-- يُستدعى قبل إنشاء الحساب حتى لا تُنشأ حسابات يتيمة تحجز رقم الممول
create or replace function public.taxpayer_can_register(p_tax text, p_national text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.taxpayers
    where tax_number = trim(p_tax) and national_id = trim(p_national) and user_id is null);
$$;

create or replace function public.link_taxpayer(p_tax text, p_national text)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare tp record;
begin
  if auth.uid() is null then return false; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'taxpayer') then
    return false;
  end if;
  -- البريد المشتق يجب أن يطابق الرقم الضريبي المطلوب ربطه
  if (select email from auth.users where id = auth.uid()) is distinct from 'tax' || trim(p_tax) || '@taxpayer.tax' then
    return false;
  end if;
  select id, office_id into tp from public.taxpayers
    where tax_number = trim(p_tax) and national_id = trim(p_national) and user_id is null
    limit 1;
  if tp.id is null then
    return false;
  end if;
  update public.taxpayers set registered = true, user_id = auth.uid() where id = tp.id;
  update public.profiles
     set tax_number = trim(p_tax), office_id = coalesce(office_id, tp.office_id)
   where id = auth.uid();
  return true;
end$$;

-- ممول جديد: إنشاء طلب فتح ملف معلّق في المأمورية المختارة
-- (كان التطبيق يحاول الإدخال مباشرة فيُرفض بصمت بسبب RLS فلا يصل الطلب للمأمورية)
create or replace function public.request_taxpayer_file(p_office bigint)
returns void language plpgsql security definer set search_path = public as $$
declare me record;
begin
  select id, role, full_name, national_id, phone into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'taxpayer' then
    raise exception 'غير مصرّح';
  end if;
  if not exists (select 1 from public.offices where id = p_office and status = 'active') then
    raise exception 'المأمورية غير متاحة';
  end if;
  if exists (select 1 from public.taxpayers where user_id = auth.uid()) then
    return;
  end if;
  insert into public.taxpayers (name, national_id, phone, office_id, user_id, source, status, registered)
  values (coalesce(me.full_name, ''), coalesce(me.national_id, ''), coalesce(me.phone, ''),
          p_office, auth.uid(), 'self_signup', 'طلب فتح ملف', false);
  update public.profiles set office_id = coalesce(office_id, p_office) where id = auth.uid();
end$$;

-- اعتماد ملف + رقم تسجيل ضريبي: داخل المأمورية فقط، بدون تكرار،
-- وتوحيد بريد الدخول ليصبح الدخول برقم التسجيل الضريبي ممكنًا
create or replace function public.assign_tax_number(p_taxpayer bigint, p_tax text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid; v_office bigint; v_tax text := trim(coalesce(p_tax, '')); v_email text;
begin
  if not public.is_staff() then raise exception 'غير مصرّح'; end if;
  if v_tax !~ '^[0-9-]{3,20}$' then raise exception 'رقم التسجيل الضريبي غير صالح'; end if;

  select office_id into v_office from public.taxpayers where id = p_taxpayer;
  if not found then raise exception 'الملف غير موجود'; end if;
  if not public.can_access_office(v_office) then raise exception 'الملف خارج اختصاص مأموريتك'; end if;
  if exists (select 1 from public.taxpayers where tax_number = v_tax and id <> p_taxpayer) then
    raise exception 'رقم التسجيل الضريبي مستخدم لملف آخر';
  end if;

  update public.taxpayers
     set tax_number = v_tax, status = 'مسجل', registered = (user_id is not null)
   where id = p_taxpayer
   returning user_id into uid;

  if uid is not null then
    update public.profiles set tax_number = v_tax where id = uid;
    v_email := 'tax' || v_tax || '@taxpayer.tax';
    if not exists (select 1 from auth.users where email = v_email) then
      update auth.users set email = v_email, updated_at = now() where id = uid;
      update auth.identities
         set identity_data = identity_data || jsonb_build_object('email', v_email), updated_at = now()
       where user_id = uid and provider = 'email';
    end if;
    insert into public.notifications (user_id, title, body, kind, link_type, link_id)
      values (uid, 'تم اعتماد ملفك الضريبي',
              'رقم التسجيل الضريبي: ' || v_tax || ' — استخدمه مع كلمة مرورك لتسجيل الدخول.',
              'file_approved', 'taxpayer', p_taxpayer);
  end if;
end$$;

-- حذف الحساب من داخل التطبيق (للممولين) — متطلب متاجر التطبيقات
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); r text;
begin
  if uid is null then raise exception 'يجب تسجيل الدخول أولاً'; end if;
  select role into r from public.profiles where id = uid;
  if r is not null and r not in ('taxpayer', 'complainant') then
    raise exception 'حسابات الموظفين تُلغى عن طريق مدير الحاسب الآلي بالمأمورية';
  end if;
  -- طلب فتح ملف لم يُعتمد بعد يُحذف، والملفات المعتمدة تبقى لدى المأمورية بدون ربط بالحساب
  delete from public.taxpayers where user_id = uid and source = 'self_signup' and tax_number is null;
  update public.taxpayers set user_id = null, registered = false where user_id = uid;
  update public.requests set applicant_id = null where applicant_id = uid;
  delete from public.notifications where user_id = uid;
  delete from public.messages where sender_id = uid or receiver_id = uid;
  update public.audit_log set user_id = null where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end$$;

-- ============================================================
-- (7) دوال القراءة الحساسة: للموظفين فقط
-- ============================================================
create or replace function public.central_search(p_tax text)
returns table (name text, activity text, start_date text, address text, office_name text, office_code text)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'غير مصرّح'; end if;
  return query
    select t.name, t.activity, t.start_date, t.address, o.name, o.code
      from public.taxpayers t
      left join public.offices o on o.id = t.office_id
     where t.tax_number = trim(p_tax)
     limit 5;
end$$;

create or replace function public.taxpayer_opener(p_taxpayer bigint)
returns table (opener_name text, opened_at timestamptz)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'غير مصرّح'; end if;
  return query
    select p.full_name, t.created_at
      from public.taxpayers t
      left join public.profiles p on p.id = t.created_by
     where t.id = p_taxpayer and public.can_access_office(t.office_id);
end$$;

create or replace function public.get_push_token(target uuid)
returns text language sql security definer stable set search_path = public as $$
  select expo_push_token from public.profiles where id = target and public.is_staff();
$$;

-- ============================================================
-- (8) الإشعارات وسجل العمليات: لا إدخال مباشر من العميل
--     (المحفّزات تصبح security definer لتكتب بنفسها)
-- ============================================================
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('_notify_new_message','_notify_new_task','_notify_request_update',
                         '_notify_attendance','_notify_appointment',
                         '_audit_taxpayers','_audit_tasks','_audit_requests','_audit_inspections',
                         '_audit_branches','_audit_warehouses','_set_partial_stop','_set_final_stop')
  loop
    execute format('alter function %s security definer set search_path = public', f.sig);
  end loop;
end$$;

drop policy if exists notifs_insert on public.notifications;
drop policy if exists audit_insert on public.audit_log;
drop policy if exists deletion_log_insert on public.deletion_log;

-- ============================================================
-- (9) تعبئة office_id تلقائيًا للسجلات الجديدة
-- ============================================================
create or replace function public._default_office_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.office_id is null then
    NEW.office_id := public.my_office_id();
  end if;
  return NEW;
end$$;

create or replace function public._default_office_from_taxpayer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.office_id is null then
    select office_id into NEW.office_id from public.taxpayers where id = NEW.taxpayer_id;
  end if;
  if NEW.office_id is null then
    NEW.office_id := public.my_office_id();
  end if;
  return NEW;
end$$;

do $$
declare t text;
begin
  foreach t in array array['taxpayers','requests','tasks'] loop
    execute format('drop trigger if exists trg_default_office on public.%I', t);
    execute format('create trigger trg_default_office before insert on public.%I
                    for each row execute function public._default_office_id()', t);
  end loop;
  foreach t in array array['taxpayer_modifications','branches','warehouses','sub_activities',
                           'inspections','attendance_requests','inspection_appointments',
                           'partial_stops','final_stops'] loop
    execute format('drop trigger if exists trg_default_office on public.%I', t);
    execute format('create trigger trg_default_office before insert on public.%I
                    for each row execute function public._default_office_from_taxpayer()', t);
  end loop;
end$$;

-- ============================================================
-- (10) سياسات الكتابة محصورة في مأمورية الموظف
-- ============================================================
-- الممولون
drop policy if exists taxpayers_write on public.taxpayers;
drop policy if exists taxpayers_update_own on public.taxpayers;
drop policy if exists taxpayers_insert on public.taxpayers;
drop policy if exists taxpayers_update on public.taxpayers;
drop policy if exists taxpayers_delete on public.taxpayers;
create policy taxpayers_insert on public.taxpayers for insert
  with check (public.is_staff() and public.can_access_office(office_id));
create policy taxpayers_update on public.taxpayers for update
  using (public.is_staff() and public.can_access_office(office_id))
  with check (public.is_staff() and public.can_access_office(office_id));
-- الحذف عبر head_delete_taxpayer (يُسجَّل في سجل الحذف) أو للأدمن
create policy taxpayers_delete on public.taxpayers for delete
  using (public.is_admin());

-- التعديلات والفروع والمخازن والأنشطة الفرعية
do $$
declare t text; pol text;
begin
  foreach t in array array['taxpayer_modifications','branches','warehouses','sub_activities'] loop
    pol := case t when 'taxpayer_modifications' then 'mods_write'
                  when 'sub_activities' then 'sub_acts_write'
                  else t || '_write' end;
    execute format('drop policy if exists %I on public.%I', pol, t);
    execute format('create policy %I on public.%I for all
      using (public.is_staff() and public.can_access_office(office_id))
      with check (public.is_staff() and public.can_access_office(office_id))', pol, t);
  end loop;
end$$;

-- جداول الفحص
do $$
declare t text; pol text;
begin
  foreach t in array array['inspections','attendance_requests','inspection_appointments',
                           'partial_stops','final_stops'] loop
    pol := case t when 'inspections' then 'inspections_write'
                  when 'attendance_requests' then 'attreq_write'
                  when 'inspection_appointments' then 'apts_write'
                  when 'partial_stops' then 'pstop_write'
                  else 'fstop_write' end;
    execute format('drop policy if exists %I on public.%I', pol, t);
    execute format('create policy %I on public.%I for all
      using (public.is_exam_staff() and public.can_access_office(office_id))
      with check (public.is_exam_staff() and public.can_access_office(office_id))', pol, t);
  end loop;
end$$;

-- الطلبات
drop policy if exists requests_select on public.requests;
create policy requests_select on public.requests for select
  using (applicant_id = auth.uid() or public.can_access_office(office_id));
drop policy if exists requests_insert on public.requests;
create policy requests_insert on public.requests for insert
  with check (applicant_id = auth.uid() or (public.is_staff() and public.can_access_office(office_id)));
drop policy if exists requests_update on public.requests;
create policy requests_update on public.requests for update
  using (public.can_access_office(office_id))
  with check (public.can_access_office(office_id));

-- الشكاوى (الإدخال متاح للجمهور، القراءة والمعالجة لموظفي المأمورية)
drop policy if exists complaints_select on public.complaints;
create policy complaints_select on public.complaints for select
  using (public.can_access_office(office_id));
drop policy if exists complaints_update on public.complaints;
create policy complaints_update on public.complaints for update
  using (public.can_access_office(office_id))
  with check (public.can_access_office(office_id));
drop policy if exists complaints_insert on public.complaints;
create policy complaints_insert on public.complaints for insert with check (
  status = 'جديد'
  and length(coalesce(details, '')) <= 5000
  and coalesce(array_length(photos, 1), 0) <= 10
);

-- المهام: الإسناد لموظف داخل نفس المأمورية فقط
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert with check (
  public.is_staff() and assigned_by = auth.uid()
  and (public.is_admin() or assigned_to is null or exists (
    select 1 from public.profiles p where p.id = assigned_to and p.office_id = public.my_office_id()))
);

-- ============================================================
-- (11) منع تكرار رقم التسجيل الضريبي
-- ============================================================
do $$
begin
  create unique index if not exists uq_taxpayers_tax_number
    on public.taxpayers (tax_number) where tax_number is not null and tax_number <> '';
exception when unique_violation then
  raise notice 'توجد أرقام تسجيل ضريبي مكررة — راجعها ثم أعد تشغيل هذا الجزء';
end$$;

-- ============================================================
-- (12) التخزين: حد للحجم ولأنواع الملفات
-- ============================================================
update storage.buckets
   set file_size_limit = 10485760,  -- 10 ميجابايت
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
 where id = 'attachments';

-- ============================================================
-- (13) صلاحيات تنفيذ الدوال: سحبها من غير المسجّلين
-- ============================================================
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('admin_create_employee','admin_set_role','admin_set_user_status',
                         'admin_request_password_reset','admin_reset_password','admin_set_office_status',
                         'change_my_password','mark_password_changed','head_delete_taxpayer',
                         'link_taxpayer','request_taxpayer_file','assign_tax_number','delete_my_account',
                         'central_search','taxpayer_opener','get_push_token','log_operation',
                         'mark_notification_read','mark_all_notifications_read')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end$$;

grant execute on function public.taxpayer_can_register(text, text) to anon, authenticated;

-- ============================================================
-- تحقق سريع
-- ============================================================
select
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'profiles') as profile_policies,
  (select count(*) from pg_trigger where tgname = 'trg_protect_profile_columns') as protect_trigger,
  (select count(*) from pg_trigger where tgname = 'trg_default_office') as office_triggers;
