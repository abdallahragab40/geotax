-- ============================================================
--  المراحل 3-4-5: الطلبات + الشكاوى + المراسلة الموسّعة
--  شغّل هذا الملف مرة واحدة في Supabase → SQL Editor
-- ============================================================

-- 1) الطلبات (Workflow)
create table if not exists public.requests (
  id bigint generated always as identity primary key,
  department text not null,            -- survey / examination / seizure
  type text not null,                  -- نوع الطلب
  applicant_id uuid references public.profiles(id),
  tax_number text default '',
  national_id text default '',
  phone text default '',
  name text default '',
  activity text default '',
  address text default '',
  start_date text default '',
  latitude double precision,
  longitude double precision,
  details text default '',
  status text default 'جديد',          -- جديد / قيد الدراسة / بموعد / منتهي / مرفوض
  appointment text default '',         -- موعد المعاينة/الزيارة/الحضور
  response text default '',            -- رد الموظف
  created_at timestamptz default now()
);
create index if not exists idx_requests_dept on public.requests (department, status);
create index if not exists idx_requests_applicant on public.requests (applicant_id);

alter table public.requests enable row level security;

drop policy if exists requests_select on public.requests;
create policy requests_select on public.requests for select
  using (public.is_staff() or applicant_id = auth.uid());

drop policy if exists requests_insert on public.requests;
create policy requests_insert on public.requests for insert
  with check (applicant_id = auth.uid() or public.is_staff());

drop policy if exists requests_update on public.requests;
create policy requests_update on public.requests for update
  using (public.is_staff());

-- 2) الشكاوى (عامة لكل الجمهور)
create table if not exists public.complaints (
  id bigint generated always as identity primary key,
  complainant_name text default '',
  complainant_national_id text default '',
  complainant_phone text default '',
  accused_name text default '',        -- المشكو في حقه
  activity text default '',
  address text default '',
  latitude double precision,
  longitude double precision,
  details text default '',
  status text default 'جديد',          -- جديد / قيد المراجعة / محوّل / منتهي
  created_at timestamptz default now()
);
alter table public.complaints enable row level security;

-- أي شخص (حتى بدون تسجيل دخول) يستطيع تقديم شكوى
drop policy if exists complaints_insert on public.complaints;
create policy complaints_insert on public.complaints for insert with check (true);

-- الموظفون فقط يرون الشكاوى ويعالجونها
drop policy if exists complaints_select on public.complaints;
create policy complaints_select on public.complaints for select using (public.is_staff());

drop policy if exists complaints_update on public.complaints;
create policy complaints_update on public.complaints for update using (public.is_staff());

-- 3) البث اللحظي للطلبات
alter publication supabase_realtime add table public.requests;
