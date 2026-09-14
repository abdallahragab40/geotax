-- ============================================================
--  المرحلة 7: نظام المأموريات + الأدوار الجديدة + الدخول برقم الحاسب
--  شغّل هذا الملف ثم seed_offices.sql ثم seed_taxpayers_v2.sql
-- ============================================================

-- 1) جدول المأموريات
create table if not exists public.offices (
  id bigint generated always as identity primary key,
  code text unique not null,
  name text not null,
  governorate text default '',
  region text default '',
  status text default 'active',  -- active / inactive
  created_at timestamptz default now()
);
create index if not exists idx_offices_code on public.offices (code);

-- السماح للجميع (حتى بدون تسجيل دخول) بقراءة قائمة المأموريات — مطلوب لشاشة الدخول
alter table public.offices enable row level security;
drop policy if exists offices_public_read on public.offices;
create policy offices_public_read on public.offices for select using (true);
grant select on public.offices to anon, authenticated;

-- 2) توسيع أدوار profiles (إضافة الأدوار الجديدة)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in (
  'admin',                                       -- الإدارة العليا
  'office_head',                                 -- رئيس المأمورية
  'it_manager',                                  -- مدير الحاسب الآلي
  'survey_manager','survey_reviewer','surveyor', -- إدارة الحصر
  'exam_manager','exam_reviewer','examiner',     -- إدارة الفحص
  'seizer',                                      -- (مُستبعد لكن نتركه للتوافق)
  'employee',                                    -- قديم — للتوافق
  'taxpayer','complainant'
));

-- 3) أعمدة جديدة على profiles
alter table public.profiles add column if not exists office_id bigint references public.offices(id);
alter table public.profiles add column if not exists employee_number text;
alter table public.profiles add column if not exists must_change_password boolean default false;
create index if not exists idx_profiles_office on public.profiles (office_id);
create index if not exists idx_profiles_empnum on public.profiles (employee_number);

-- 4) إضافة office_id إلى كل الجداول المتاحة
alter table public.taxpayers add column if not exists office_id bigint references public.offices(id);
alter table public.surveys add column if not exists office_id bigint references public.offices(id);
alter table public.examinations add column if not exists office_id bigint references public.offices(id);
alter table public.requests add column if not exists office_id bigint references public.offices(id);
alter table public.complaints add column if not exists office_id bigint references public.offices(id);
alter table public.taxpayer_modifications add column if not exists office_id bigint references public.offices(id);

-- 5) دوال الصلاحيات الموسّعة
create or replace function public.my_office_id()
returns bigint language sql security definer stable as $$
  select office_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in (
    'admin','office_head','it_manager',
    'survey_manager','survey_reviewer','surveyor',
    'exam_manager','exam_reviewer','examiner','employee'
  ));
$$;

-- يحدد إن كان المستخدم في نفس المأمورية كصلاحية رؤية
create or replace function public.same_office(target_office bigint)
returns boolean language sql security definer stable as $$
  select target_office is not null and target_office = public.my_office_id();
$$;

-- 6) إعادة كتابة سياسات RLS الأساسية لتشمل المأمورية
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or public.is_admin()
  or (public.is_staff() and (office_id is null or office_id = public.my_office_id()))
  or role = 'office_head'           -- الكل يرى رؤساء المأموريات للمراسلة
);

-- الممولين: الأدمن الكل، الموظف داخل مأموريته، الممول لملفه
drop policy if exists taxpayers_select on public.taxpayers;
create policy taxpayers_select on public.taxpayers for select using (
  public.is_admin()
  or (public.is_staff() and (office_id is null or office_id = public.my_office_id()))
  or user_id = auth.uid()
  or tax_number = public.my_tax_number()
);

-- (نُبقي سياسات الكتابة على ما هي عليه لـ is_staff — تعمل تلقائيًا)

-- 7) RPC لتغيير كلمة المرور (بعد أول دخول) — تُحدّث الـ flag
create or replace function public.mark_password_changed()
returns void language sql security definer as $$
  update public.profiles set must_change_password = false where id = auth.uid();
$$;

-- 8) RPC للإدارة العليا/مدير الحاسب: تعيين مأمورية ودور لمستخدم
create or replace function public.admin_assign_office_role(
  target uuid, p_office bigint, p_role text, p_emp_number text default null
)
returns void language plpgsql security definer as $$
begin
  if not (public.is_admin() or exists(
    select 1 from public.profiles where id = auth.uid()
      and role in ('office_head','it_manager') and office_id = p_office
  )) then
    raise exception 'غير مصرّح';
  end if;
  update public.profiles
    set office_id = p_office,
        role = p_role,
        employee_number = coalesce(p_emp_number, employee_number)
    where id = target;
end;
$$;
