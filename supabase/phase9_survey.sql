-- ============================================================
--  المرحلة 9: إدارة الحصر — الفروع/المخازن/الأنشطة الفرعية/المهام
-- ============================================================

-- 1) الفروع
create table if not exists public.branches (
  id bigint generated always as identity primary key,
  taxpayer_id bigint references public.taxpayers(id) on delete cascade,
  name text default '',
  address text default '',
  latitude double precision,
  longitude double precision,
  photos text[] default '{}',
  office_id bigint references public.offices(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists idx_branches_taxpayer on public.branches (taxpayer_id);

-- 2) المخازن
create table if not exists public.warehouses (
  id bigint generated always as identity primary key,
  taxpayer_id bigint references public.taxpayers(id) on delete cascade,
  address text default '',
  latitude double precision,
  longitude double precision,
  photos text[] default '{}',
  office_id bigint references public.offices(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists idx_warehouses_taxpayer on public.warehouses (taxpayer_id);

-- 3) الأنشطة الفرعية
create table if not exists public.sub_activities (
  id bigint generated always as identity primary key,
  taxpayer_id bigint references public.taxpayers(id) on delete cascade,
  name text default '',
  description text default '',
  office_id bigint references public.offices(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists idx_sub_acts_taxpayer on public.sub_activities (taxpayer_id);

-- 4) المهام (إسناد من المراجع إلى المأمور + خط السير)
create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  task_type text not null default 'survey',  -- survey / exam
  office_id bigint references public.offices(id),
  assigned_by uuid references public.profiles(id),    -- المراجع
  assigned_to uuid references public.profiles(id),    -- المأمور
  taxpayer_ids bigint[] default '{}',         -- ترتيب الزيارة (خط السير)
  priority text default 'عادية',              -- عاجلة / مرتفعة / عادية / منخفضة
  due_date text default '',
  status text default 'جديدة',                -- جديدة / قيد التنفيذ / تم التنفيذ / مؤجلة / ملغاة
  started_at timestamptz,
  completed_at timestamptz,
  notes text default '',
  photos text[] default '{}',
  created_at timestamptz default now()
);
create index if not exists idx_tasks_assigned_to on public.tasks (assigned_to, status);
create index if not exists idx_tasks_office on public.tasks (office_id, created_at desc);

-- 5) RLS — كل ما سبق ضمن المأمورية
alter table public.branches      enable row level security;
alter table public.warehouses    enable row level security;
alter table public.sub_activities enable row level security;
alter table public.tasks          enable row level security;

-- الموظف داخل مأموريته (أو الأدمن) — والممول يرى التابعة لملفه
drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches for select using (
  public.is_admin()
  or (public.is_staff() and (office_id is null or office_id = public.my_office_id()))
  or taxpayer_id in (select id from public.taxpayers where user_id = auth.uid())
);
drop policy if exists branches_write on public.branches;
create policy branches_write on public.branches for all
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists warehouses_select on public.warehouses;
create policy warehouses_select on public.warehouses for select using (
  public.is_admin()
  or (public.is_staff() and (office_id is null or office_id = public.my_office_id()))
  or taxpayer_id in (select id from public.taxpayers where user_id = auth.uid())
);
drop policy if exists warehouses_write on public.warehouses;
create policy warehouses_write on public.warehouses for all
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists sub_acts_select on public.sub_activities;
create policy sub_acts_select on public.sub_activities for select using (
  public.is_admin()
  or (public.is_staff() and (office_id is null or office_id = public.my_office_id()))
  or taxpayer_id in (select id from public.taxpayers where user_id = auth.uid())
);
drop policy if exists sub_acts_write on public.sub_activities;
create policy sub_acts_write on public.sub_activities for all
  using (public.is_staff()) with check (public.is_staff());

-- المهام: المُسنَد إليه أو المُسند أو الأدمن أو رؤساء/مديري المأمورية
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select using (
  public.is_admin()
  or assigned_to = auth.uid()
  or assigned_by = auth.uid()
  or (public.is_staff() and office_id = public.my_office_id()
      and exists (select 1 from public.profiles where id = auth.uid()
                    and role in ('office_head','survey_manager','survey_reviewer','exam_manager','exam_reviewer')))
);
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert with check (
  public.is_staff() and assigned_by = auth.uid()
);
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update using (
  public.is_admin()
  or assigned_to = auth.uid()
  or assigned_by = auth.uid()
);

-- 6) RPC: البحث المركزي — معلومات محدودة عن ممول على مستوى الجمهورية
-- لا يُعيد الموقع الجغرافي، فقط البيانات العامة
create or replace function public.central_search(p_tax text)
returns table (
  name text,
  activity text,
  start_date text,
  address text,
  office_name text,
  office_code text
) language sql security definer stable as $$
  select t.name, t.activity, t.start_date, t.address,
         o.name as office_name, o.code as office_code
  from public.taxpayers t
  left join public.offices o on o.id = t.office_id
  where t.tax_number = p_tax
  limit 5;
$$;

-- 7) RPC: من فتح الملف وتاريخ/وقت الفتح
create or replace function public.taxpayer_opener(p_taxpayer bigint)
returns table (opener_name text, opened_at timestamptz)
language sql security definer stable as $$
  select p.full_name, t.created_at
  from public.taxpayers t
  left join public.profiles p on p.id = t.created_by
  where t.id = p_taxpayer;
$$;

-- 8) Realtime
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.branches;
alter publication supabase_realtime add table public.warehouses;
alter publication supabase_realtime add table public.sub_activities;
