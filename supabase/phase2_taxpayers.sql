-- ============================================================
--  المرحلة 2: سجل الممولين + الحصر الميداني + التعديلات
--  شغّل هذا الملف مرة واحدة في Supabase → SQL Editor
-- ============================================================

-- 1) سجل الممولين (السجل المركزي لكل الممولين)
create table if not exists public.taxpayers (
  id bigint generated always as identity primary key,
  tax_number text,                 -- يُملأ في المرحلة 2 من الحصر
  name text default '',            -- اسم النشاط / صاحب النشاط
  national_id text default '',
  activity text default '',        -- النشاط
  address text default '',
  start_date text default '',      -- بداية النشاط
  latitude double precision,
  longitude double precision,
  status text default 'قيد الحصر', -- قيد الحصر / مسجل
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists idx_taxpayers_tax_number on public.taxpayers (tax_number);

-- 2) التعديلات والإضافات على ملف الممول
create table if not exists public.taxpayer_modifications (
  id bigint generated always as identity primary key,
  taxpayer_id bigint references public.taxpayers(id) on delete cascade,
  type text not null,              -- تغيير عنوان / إضافة فرع / إضافة مخزن / إضافة نشاط فرعي
  mod_date text default '',        -- تاريخ التعديل
  address text default '',
  activity text default '',        -- نوع النشاط
  latitude double precision,
  longitude double precision,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists idx_mods_taxpayer on public.taxpayer_modifications (taxpayer_id);

-- 3) الصلاحيات (RLS)
alter table public.taxpayers enable row level security;
alter table public.taxpayer_modifications enable row level security;

-- الموظف: كل الصلاحيات. الممول: قراءة ملفه فقط (بمطابقة الرقم الضريبي)
drop policy if exists taxpayers_select on public.taxpayers;
create policy taxpayers_select on public.taxpayers for select
  using (public.is_staff() or tax_number = public.my_tax_number());

drop policy if exists taxpayers_write on public.taxpayers;
create policy taxpayers_write on public.taxpayers for all
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists mods_select on public.taxpayer_modifications;
create policy mods_select on public.taxpayer_modifications for select
  using (
    public.is_staff()
    or taxpayer_id in (select id from public.taxpayers where tax_number = public.my_tax_number())
  );

drop policy if exists mods_write on public.taxpayer_modifications;
create policy mods_write on public.taxpayer_modifications for all
  using (public.is_staff()) with check (public.is_staff());
