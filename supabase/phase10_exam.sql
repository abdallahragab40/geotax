-- ============================================================
--  المرحلة 10: إدارة الفحص — المعاينات + طلبات الحضور + المواعيد + التوقفات
-- ============================================================

-- 1) حالة النشاط (للخريطة): نشط / توقف جزئي / توقف نهائي
alter table public.taxpayers add column if not exists activity_status text default 'active';
-- active / partial_stop / final_stop

-- 2) المعاينات (موقع الفحص يُحفظ مستقلًا عن موقع الحصر)
create table if not exists public.inspections (
  id bigint generated always as identity primary key,
  taxpayer_id bigint references public.taxpayers(id) on delete cascade,
  inspection_date text default '',
  start_time text default '',
  end_time text default '',
  notes text default '',
  result text default '',           -- نتيجة المعاينة
  exam_latitude double precision,   -- موقع الفحص الفعلي (مستقل عن موقع الحصر)
  exam_longitude double precision,
  photos text[] default '{}',
  documents text[] default '{}',
  office_id bigint references public.offices(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists idx_inspections_taxpayer on public.inspections (taxpayer_id);

-- 3) طلبات الحضور إلى المأمورية
create table if not exists public.attendance_requests (
  id bigint generated always as identity primary key,
  taxpayer_id bigint references public.taxpayers(id) on delete cascade,
  attend_date text default '',
  attend_time text default '',
  reason text default '',
  notes text default '',
  status text default 'مرسل',       -- مرسل / حضر / لم يحضر / مؤجل
  office_id bigint references public.offices(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists idx_attreq_taxpayer on public.attendance_requests (taxpayer_id);

-- 4) مواعيد المعاينة المسبقة
create table if not exists public.inspection_appointments (
  id bigint generated always as identity primary key,
  taxpayer_id bigint references public.taxpayers(id) on delete cascade,
  appointment_date text default '',
  appointment_time text default '',
  notes text default '',
  status text default 'مجدول',     -- مجدول / تم / مؤجل / ملغي
  office_id bigint references public.offices(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists idx_apts_taxpayer on public.inspection_appointments (taxpayer_id);

-- 5) إخطارات التوقف الجزئي
create table if not exists public.partial_stops (
  id bigint generated always as identity primary key,
  taxpayer_id bigint references public.taxpayers(id) on delete cascade,
  stop_date text default '',
  reason text default '',
  notes text default '',
  photos text[] default '{}',
  office_id bigint references public.offices(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists idx_pstop_taxpayer on public.partial_stops (taxpayer_id);

-- 6) إخطارات التوقف النهائي
create table if not exists public.final_stops (
  id bigint generated always as identity primary key,
  taxpayer_id bigint references public.taxpayers(id) on delete cascade,
  stop_date text default '',
  reason text default '',
  notes text default '',
  photos text[] default '{}',
  office_id bigint references public.offices(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists idx_fstop_taxpayer on public.final_stops (taxpayer_id);

-- 7) محفّزات تحديث حالة النشاط تلقائيًا
create or replace function public._set_partial_stop()
returns trigger language plpgsql as $$
begin
  update public.taxpayers set activity_status = 'partial_stop' where id = NEW.taxpayer_id;
  return NEW;
end; $$;

drop trigger if exists trg_partial_stop on public.partial_stops;
create trigger trg_partial_stop after insert on public.partial_stops
  for each row execute function public._set_partial_stop();

create or replace function public._set_final_stop()
returns trigger language plpgsql as $$
begin
  update public.taxpayers set activity_status = 'final_stop' where id = NEW.taxpayer_id;
  return NEW;
end; $$;

drop trigger if exists trg_final_stop on public.final_stops;
create trigger trg_final_stop after insert on public.final_stops
  for each row execute function public._set_final_stop();

-- 8) دالة الأدوار: من أدوار الفحص؟
create or replace function public.is_exam_staff()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid()
    and role in ('admin','office_head','exam_manager','exam_reviewer','examiner'));
$$;

-- 9) RLS
alter table public.inspections             enable row level security;
alter table public.attendance_requests     enable row level security;
alter table public.inspection_appointments enable row level security;
alter table public.partial_stops           enable row level security;
alter table public.final_stops             enable row level security;

-- المعاينات: تفاصيل الفحص ترى لأدوار الفحص فقط (الموقع الفعلي للمعاينة)
-- + الممول يعرف فقط أنّ هناك معاينة، لكن لا يرى الموقع — سنُخفي عبر سياسة كاملة هنا
drop policy if exists inspections_select on public.inspections;
create policy inspections_select on public.inspections for select using (
  public.is_admin()
  or (public.is_exam_staff() and (office_id is null or office_id = public.my_office_id()))
);
drop policy if exists inspections_write on public.inspections;
create policy inspections_write on public.inspections for all
  using (public.is_exam_staff()) with check (public.is_exam_staff());

-- طلبات الحضور والمواعيد: الموظف داخل مأموريته + الممول صاحب الملف
drop policy if exists attreq_select on public.attendance_requests;
create policy attreq_select on public.attendance_requests for select using (
  public.is_admin()
  or (public.is_staff() and (office_id is null or office_id = public.my_office_id()))
  or taxpayer_id in (select id from public.taxpayers where user_id = auth.uid())
);
drop policy if exists attreq_write on public.attendance_requests;
create policy attreq_write on public.attendance_requests for all
  using (public.is_exam_staff()) with check (public.is_exam_staff());

drop policy if exists apts_select on public.inspection_appointments;
create policy apts_select on public.inspection_appointments for select using (
  public.is_admin()
  or (public.is_staff() and (office_id is null or office_id = public.my_office_id()))
  or taxpayer_id in (select id from public.taxpayers where user_id = auth.uid())
);
drop policy if exists apts_write on public.inspection_appointments;
create policy apts_write on public.inspection_appointments for all
  using (public.is_exam_staff()) with check (public.is_exam_staff());

-- التوقفات: نفس منطق السماح بالقراءة (الممول يرى توقفاته)
drop policy if exists pstop_select on public.partial_stops;
create policy pstop_select on public.partial_stops for select using (
  public.is_admin()
  or (public.is_staff() and (office_id is null or office_id = public.my_office_id()))
  or taxpayer_id in (select id from public.taxpayers where user_id = auth.uid())
);
drop policy if exists pstop_write on public.partial_stops;
create policy pstop_write on public.partial_stops for all
  using (public.is_exam_staff()) with check (public.is_exam_staff());

drop policy if exists fstop_select on public.final_stops;
create policy fstop_select on public.final_stops for select using (
  public.is_admin()
  or (public.is_staff() and (office_id is null or office_id = public.my_office_id()))
  or taxpayer_id in (select id from public.taxpayers where user_id = auth.uid())
);
drop policy if exists fstop_write on public.final_stops;
create policy fstop_write on public.final_stops for all
  using (public.is_exam_staff()) with check (public.is_exam_staff());

-- 10) Realtime
alter publication supabase_realtime add table public.inspections;
alter publication supabase_realtime add table public.attendance_requests;
alter publication supabase_realtime add table public.inspection_appointments;
alter publication supabase_realtime add table public.partial_stops;
alter publication supabase_realtime add table public.final_stops;
