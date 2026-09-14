-- ============================================================
--  المرحلة 12: سجل العمليات (Audit Log) + دالة عامة لتسجيل العمليات
-- ============================================================

-- 1) جدول سجل العمليات
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id),
  user_name text default '',
  employee_number text default '',
  office_id bigint references public.offices(id),
  operation text not null,         -- نوع العملية (Arabic label)
  entity_type text default '',     -- اسم الجدول/الكيان
  entity_id bigint,
  details jsonb,
  ip_address text default '',
  device text default '',
  created_at timestamptz default now()
);
create index if not exists idx_audit_user on public.audit_log (user_id, created_at desc);
create index if not exists idx_audit_office on public.audit_log (office_id, created_at desc);

alter table public.audit_log enable row level security;

-- يقرأها الأدمن (كل شيء) ورئيس المأمورية/مدير الحاسب (داخل مأموريته)
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select using (
  public.is_admin()
  or (exists (select 1 from public.profiles where id = auth.uid()
                and role in ('office_head','it_manager'))
      and (office_id is null or office_id = public.my_office_id()))
);
drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log for insert with check (true);

-- 2) دالة آمنة لتسجيل عملية من جانب التطبيق
create or replace function public.log_operation(
  p_operation text,
  p_entity_type text default '',
  p_entity_id bigint default null,
  p_details jsonb default null,
  p_device text default ''
) returns void language plpgsql security definer as $$
declare p record;
begin
  select full_name, employee_number, office_id into p
    from public.profiles where id = auth.uid();
  insert into public.audit_log
    (user_id, user_name, employee_number, office_id, operation, entity_type, entity_id, details, device)
  values
    (auth.uid(), coalesce(p.full_name,''), coalesce(p.employee_number,''),
     p.office_id, p_operation, p_entity_type, p_entity_id, p_details, coalesce(p_device,''));
end; $$;

-- 3) محفّز عام: يسجّل العمليات الأساسية تلقائيًا
create or replace function public._audit_taxpayers()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_log (user_id, operation, entity_type, entity_id, office_id, details)
    values (auth.uid(), 'فتح ملف ممول', 'taxpayer', NEW.id, NEW.office_id,
            jsonb_build_object('name', NEW.name, 'tax_number', NEW.tax_number));
  elsif TG_OP = 'UPDATE' and NEW.tax_number is distinct from OLD.tax_number then
    insert into public.audit_log (user_id, operation, entity_type, entity_id, office_id, details)
    values (auth.uid(), 'اعتماد رقم ضريبي', 'taxpayer', NEW.id, NEW.office_id,
            jsonb_build_object('old', OLD.tax_number, 'new', NEW.tax_number));
  elsif TG_OP = 'DELETE' then
    insert into public.audit_log (user_id, operation, entity_type, entity_id, office_id, details)
    values (auth.uid(), 'حذف ملف ممول', 'taxpayer', OLD.id, OLD.office_id,
            jsonb_build_object('name', OLD.name, 'tax_number', OLD.tax_number));
  end if;
  return coalesce(NEW, OLD);
end; $$;

drop trigger if exists trg_audit_taxpayers on public.taxpayers;
create trigger trg_audit_taxpayers after insert or update or delete on public.taxpayers
  for each row execute function public._audit_taxpayers();

create or replace function public._audit_tasks()
returns trigger language plpgsql as $$
begin
  insert into public.audit_log (user_id, operation, entity_type, entity_id, office_id, details)
  values (auth.uid(), 'إسناد مهمة', 'task', NEW.id, NEW.office_id,
          jsonb_build_object('priority', NEW.priority, 'count', coalesce(array_length(NEW.taxpayer_ids,1),0)));
  return NEW;
end; $$;
drop trigger if exists trg_audit_tasks on public.tasks;
create trigger trg_audit_tasks after insert on public.tasks
  for each row execute function public._audit_tasks();

create or replace function public._audit_requests()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_log (user_id, operation, entity_type, entity_id, office_id, details)
    values (auth.uid(), 'إرسال طلب', 'request', NEW.id, NEW.office_id,
            jsonb_build_object('type', NEW.type, 'dept', NEW.department));
  elsif TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status then
    insert into public.audit_log (user_id, operation, entity_type, entity_id, office_id, details)
    values (auth.uid(),
            case NEW.status when 'معتمد' then 'اعتماد طلب' when 'مرفوض' then 'رفض طلب' else 'تحديث طلب' end,
            'request', NEW.id, NEW.office_id,
            jsonb_build_object('type', NEW.type, 'status', NEW.status));
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_audit_requests on public.requests;
create trigger trg_audit_requests after insert or update on public.requests
  for each row execute function public._audit_requests();

create or replace function public._audit_inspections()
returns trigger language plpgsql as $$
begin
  insert into public.audit_log (user_id, operation, entity_type, entity_id, office_id, details)
  values (auth.uid(), 'تنفيذ معاينة', 'inspection', NEW.id, NEW.office_id,
          jsonb_build_object('taxpayer', NEW.taxpayer_id, 'date', NEW.inspection_date));
  return NEW;
end; $$;
drop trigger if exists trg_audit_inspections on public.inspections;
create trigger trg_audit_inspections after insert on public.inspections
  for each row execute function public._audit_inspections();

create or replace function public._audit_branches()
returns trigger language plpgsql as $$
begin
  insert into public.audit_log (user_id, operation, entity_type, entity_id, office_id, details)
  values (auth.uid(), 'إضافة فرع', 'branch', NEW.id, NEW.office_id,
          jsonb_build_object('taxpayer', NEW.taxpayer_id));
  return NEW;
end; $$;
drop trigger if exists trg_audit_branches on public.branches;
create trigger trg_audit_branches after insert on public.branches
  for each row execute function public._audit_branches();

create or replace function public._audit_warehouses()
returns trigger language plpgsql as $$
begin
  insert into public.audit_log (user_id, operation, entity_type, entity_id, office_id, details)
  values (auth.uid(), 'إضافة مخزن', 'warehouse', NEW.id, NEW.office_id,
          jsonb_build_object('taxpayer', NEW.taxpayer_id));
  return NEW;
end; $$;
drop trigger if exists trg_audit_warehouses on public.warehouses;
create trigger trg_audit_warehouses after insert on public.warehouses
  for each row execute function public._audit_warehouses();

-- Realtime
alter publication supabase_realtime add table public.audit_log;
