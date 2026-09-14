-- ============================================================
--  المرحلة 1: نظام الأدوار (RBAC) وإدارة الموظفين
--  شغّل هذا الملف مرة واحدة في Supabase → SQL Editor
-- ============================================================

-- 1) توسيع الأدوار المسموح بها
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','surveyor','examiner','seizer','taxpayer','complainant','employee'));

-- 2) دوال الصلاحيات
-- مدير النظام
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- أي موظف داخلي (مدير أو مأمور)
create or replace function public.is_staff()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid()
    and role in ('admin','surveyor','examiner','seizer','employee'));
$$;

-- نُبقي is_employee متوافقة لكنها تعني الآن "أي موظف داخلي"
create or replace function public.is_employee()
returns boolean language sql security definer stable as $$
  select public.is_staff();
$$;

-- 3) المدير يعيّن دور أي مستخدم (لإضافة المأمورين)
create or replace function public.admin_set_role(target uuid, new_role text)
returns void language plpgsql security definer as $$
begin
  if not public.is_admin() then
    raise exception 'غير مصرّح: يتطلب صلاحية مدير';
  end if;
  if new_role not in ('admin','surveyor','examiner','seizer','taxpayer') then
    raise exception 'دور غير صالح';
  end if;
  update public.profiles set role = new_role where id = target;
end;
$$;

-- 4) السماح للممول برؤية ملفات الموظفين (للمراسلة)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or public.is_staff()
    or role in ('admin','surveyor','examiner','seizer','employee')
  );

-- ============================================================
--  ⚠️ ترقية حسابك الحالي إلى مدير
--  ضع بريد حسابك مكان القيمة ثم نفّذ:
-- ============================================================
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'بريدك-هنا');

-- أو (إن كان حسابك هو الموظف الوحيد المسجّل حاليًا):
update public.profiles set role = 'admin' where role = 'employee';
