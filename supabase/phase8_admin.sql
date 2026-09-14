-- ============================================================
--  المرحلة 8: نظام الأخبار + سجل العمليات + حالة المستخدم
-- ============================================================

-- 1) حالة المستخدم (نشط/موقوف) + بيانات إضافية
alter table public.profiles add column if not exists status text default 'active'; -- active / suspended
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists position_title text default '';  -- الوظيفة
alter table public.profiles add column if not exists email text;  -- للعرض في الملف الشخصي

-- 2) جدول الأخبار
create table if not exists public.news (
  id bigint generated always as identity primary key,
  title text not null,
  content text not null default '',
  -- الفئة المستهدفة: all / office / role
  audience text not null default 'all',
  -- مأمورية محددة (إن وُجد فالخبر محصور بها)
  office_id bigint references public.offices(id),
  -- دور محدد (إن وُجد فالخبر محصور به)
  target_role text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists idx_news_audience on public.news (audience, office_id, target_role);
create index if not exists idx_news_created on public.news (created_at desc);

alter table public.news enable row level security;

-- يرى الخبر: الإدارة العليا الكل؛ الموظف داخل مأموريته + الأخبار العامة + التي تستهدف دوره؛ الممول الأخبار العامة + التي تستهدف ممولي مأموريته
drop policy if exists news_select on public.news;
create policy news_select on public.news for select using (
  public.is_admin()
  or audience = 'all'
  or (audience = 'office' and office_id = public.my_office_id())
  or (audience = 'role' and target_role = (select role from public.profiles where id = auth.uid()))
);

-- يضيف/يعدل/يحذف: الإدارة العليا، رؤساء المأموريات، مدراء الحاسب (في حدود مأموريتهم)
drop policy if exists news_write on public.news;
create policy news_write on public.news for all using (
  public.is_admin()
  or exists (
    select 1 from public.profiles
     where id = auth.uid()
       and role in ('office_head','it_manager')
       and (office_id is null or office_id = public.news.office_id or public.news.audience = 'all')
  )
) with check (
  public.is_admin()
  or exists (
    select 1 from public.profiles
     where id = auth.uid()
       and role in ('office_head','it_manager')
  )
);

-- 3) سجل الحذف (لرئيس المأمورية - سجل الملفات المحذوفة)
create table if not exists public.deletion_log (
  id bigint generated always as identity primary key,
  entity_type text not null,           -- taxpayer / survey / request ...
  entity_id bigint,
  entity_snapshot jsonb,                -- نسخة من السجل قبل الحذف
  office_id bigint references public.offices(id),
  reason text default '',
  deleted_by uuid references public.profiles(id),
  deleted_at timestamptz default now()
);
create index if not exists idx_deletion_log_office on public.deletion_log (office_id, deleted_at desc);

alter table public.deletion_log enable row level security;

drop policy if exists deletion_log_select on public.deletion_log;
create policy deletion_log_select on public.deletion_log for select using (
  public.is_admin()
  or (public.is_staff() and (office_id is null or office_id = public.my_office_id()))
);
drop policy if exists deletion_log_insert on public.deletion_log;
create policy deletion_log_insert on public.deletion_log for insert with check (public.is_staff());

-- 4) دالة لرئيس المأمورية: حذف ملف ممول وتسجيل العملية
create or replace function public.head_delete_taxpayer(target_id bigint, p_reason text default '')
returns void language plpgsql security definer as $$
declare row_data jsonb; office bigint;
begin
  if not exists (select 1 from public.profiles where id = auth.uid()
                  and role in ('office_head','admin')) then
    raise exception 'غير مصرّح';
  end if;
  select to_jsonb(t.*), t.office_id into row_data, office from public.taxpayers t where id = target_id;
  if row_data is null then raise exception 'الملف غير موجود'; end if;
  insert into public.deletion_log (entity_type, entity_id, entity_snapshot, office_id, reason, deleted_by)
    values ('taxpayer', target_id, row_data, office, p_reason, auth.uid());
  delete from public.taxpayers where id = target_id;
end;
$$;

-- 5) دالة لمدير الحاسب/الإدارة العليا: إيقاف وتفعيل الحسابات
create or replace function public.admin_set_user_status(target uuid, p_status text)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid()
                  and role in ('admin','office_head','it_manager')) then
    raise exception 'غير مصرّح';
  end if;
  if p_status not in ('active','suspended') then raise exception 'حالة غير صالحة'; end if;
  update public.profiles set status = p_status where id = target;
end;
$$;

-- 6) دالة لإعادة تعيين كلمة مرور موظف (لمدير الحاسب) — تُعيد الفلاج لإجبار التغيير
create or replace function public.admin_request_password_reset(target uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid()
                  and role in ('admin','office_head','it_manager')) then
    raise exception 'غير مصرّح';
  end if;
  -- نضع علم إجبار تغيير كلمة المرور؛ كلمة المرور الفعلية يجب أن يعيدها الأدمن من لوحة Supabase (الحفاظ على الأمان)
  update public.profiles set must_change_password = true where id = target;
end;
$$;

-- 7) تفعيل/إيقاف مأمورية
create or replace function public.admin_set_office_status(p_office bigint, p_status text)
returns void language plpgsql security definer as $$
begin
  if not public.is_admin() then raise exception 'غير مصرّح'; end if;
  if p_status not in ('active','inactive') then raise exception 'حالة غير صالحة'; end if;
  update public.offices set status = p_status where id = p_office;
end;
$$;

-- 8) تحديث Realtime
alter publication supabase_realtime add table public.news;
