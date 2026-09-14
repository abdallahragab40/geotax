-- ============================================================
--  مخطط قاعدة بيانات تطبيق إدارات الضرائب (Supabase / PostgreSQL)
--  شغّل هذا الملف مرة واحدة في: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ---------- 1) جدول الملفات الشخصية (المستخدمون) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('employee', 'taxpayer')),
  full_name text default '',
  national_id text,
  phone text,
  tax_number text,            -- رقم التسجيل الضريبي (للممول، لربط ملفه)
  expo_push_token text,       -- رمز جهاز الممول/الموظف لإرسال الإشعارات
  created_at timestamptz default now()
);

-- ---------- 2) إدارة الحصر ----------
create table if not exists public.surveys (
  id bigint generated always as identity primary key,
  tax_number text not null,
  name text default '',
  address text default '',
  sub_activities text default '',
  notes text default '',
  status text default 'قيد المتابعة',
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  photos text[] default '{}',          -- مسارات الصور في Storage
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ---------- 3) إدارة الفحص ----------
create table if not exists public.examinations (
  id bigint generated always as identity primary key,
  tax_number text not null,
  name text default '',                -- اسم النشاط/الممول
  file_number text default '',         -- رقم الملف
  exam_years text default '',          -- سنوات الفحص
  revenue numeric default 0,           -- الإيراد
  net_profit numeric default 0,        -- صافي الربح / الوعاء
  tax_due numeric default 0,           -- الضريبة المستحقة
  status text default 'قيد الفحص',     -- قيد الفحص / انتهى / محال للطعن
  notes text default '',
  photos text[] default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ---------- 4) إدارة الحجز ----------
create table if not exists public.seizures (
  id bigint generated always as identity primary key,
  tax_number text not null,
  name text default '',                -- اسم النشاط/الممول
  decision_number text default '',     -- رقم قرار الحجز
  amount numeric default 0,            -- المبلغ المحجوز من أجله
  seized_items text default '',        -- الأصناف المحجوزة
  seizure_date text default '',        -- تاريخ الحجز
  status text default 'محجوز',         -- محجوز / مرفوع / مُباع بالمزاد
  notes text default '',
  latitude double precision,
  longitude double precision,
  photos text[] default '{}',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ---------- 5) الرسائل ----------
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade,
  body text not null,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_messages_pair on public.messages (sender_id, receiver_id, created_at);

-- ============================================================
--  دوال مساعدة للصلاحيات
-- ============================================================
create or replace function public.is_employee()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'employee'
  );
$$;

create or replace function public.my_tax_number()
returns text language sql security definer stable as $$
  select tax_number from public.profiles where id = auth.uid();
$$;

-- ---- إعدادات سرّية (يقرأها فقط دوال security definer) ----
create table if not exists public.app_config (
  key text primary key,
  value text
);
-- ⚠️ غيّر القيمة إلى رمز سرّي خاص بمكتبك
insert into public.app_config (key, value)
  values ('employee_code', 'TAX-OFFICE-2025')
  on conflict (key) do nothing;
alter table public.app_config enable row level security;
-- لا توجد سياسات => لا يصل إليه أي عميل (فقط الدوال أدناه)

-- تسجيل المستخدم الحالي كموظف بعد التحقق من الرمز السرّي
create or replace function public.register_as_employee(code text, full_name text)
returns void language plpgsql security definer as $$
declare expected text;
begin
  select value into expected from public.app_config where key = 'employee_code';
  if expected is null or code <> expected then
    raise exception 'رمز الموظف غير صحيح';
  end if;
  insert into public.profiles (id, role, full_name)
  values (auth.uid(), 'employee', full_name)
  on conflict (id) do update set role = 'employee', full_name = excluded.full_name;
end;
$$;

-- ============================================================
--  تفعيل Row Level Security + السياسات
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.surveys        enable row level security;
alter table public.examinations   enable row level security;
alter table public.seizures       enable row level security;
alter table public.messages       enable row level security;

-- ---- profiles ----
-- الجميع يرى ملفه؛ الموظف يرى الكل؛ والكل يرى ملف الموظف (للمراسلة)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_employee() or role = 'employee');

-- العملاء يستطيعون تسجيل أنفسهم كممولين فقط (منع رفع الصلاحية لموظف مباشرة)
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid() and role = 'taxpayer');

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_employee());

-- ---- دالة عامة لسياسات الإدارات الثلاث ----
-- الموظف: كل الصلاحيات. الممول: قراءة سجلاته فقط (بمطابقة رقم التسجيل الضريبي).
do $$
declare t text;
begin
  foreach t in array array['surveys','examinations','seizures'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s;', t);
    execute format($f$create policy %1$s_select on public.%1$s for select
      using (public.is_employee() or tax_number = public.my_tax_number());$f$, t);

    execute format('drop policy if exists %1$s_write on public.%1$s;', t);
    execute format($f$create policy %1$s_write on public.%1$s for all
      using (public.is_employee()) with check (public.is_employee());$f$, t);
  end loop;
end $$;

-- ---- messages ----
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert
  with check (sender_id = auth.uid());

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update
  using (receiver_id = auth.uid());

-- ============================================================
--  دالة جلب رمز إشعار الطرف الآخر (لإرسال الإشعارات بين المستخدمين)
-- ============================================================
create or replace function public.get_push_token(target uuid)
returns text language sql security definer stable as $$
  select expo_push_token from public.profiles where id = target;
$$;

-- ============================================================
--  تفعيل البث اللحظي (Realtime) للرسائل
-- ============================================================
alter publication supabase_realtime add table public.messages;

-- ============================================================
--  Storage: مجلد صور المعاينات (شغّل مرة واحدة)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

drop policy if exists attachments_read on storage.objects;
create policy attachments_read on storage.objects for select
  using (bucket_id = 'attachments');

drop policy if exists attachments_write on storage.objects;
create policy attachments_write on storage.objects for insert
  with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

drop policy if exists attachments_delete on storage.objects;
create policy attachments_delete on storage.objects for delete
  using (bucket_id = 'attachments' and public.is_employee());
