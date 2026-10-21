-- ============================================================
--  المرحلة 16: متابعة الشكاوى وطلبات فتح الملفات + توجيه الشكاوى + تفعيل حسابات الممولين
--  شغّله بعد phase15_features.sql — آمن لإعادة التشغيل (idempotent).
--  إضافات فقط: لا يحذف أي بيانات ولا يغيّر قيمًا موجودة (يملأ الأعمدة الجديدة فقط).
--
--   1) رقم شكوى فريد + متابعة الشكوى بدون تسجيل (رقم الشكوى + الموبايل)
--   2) توجيه الشكوى لمأمور الحصر بالمأمورية، والتصعيد لرئيس المأمورية (مع سجل العمليات)
--      + مدة التأخير قابلة للضبط لكل مأمورية (الافتراضي 3 أيام)
--   3) رقم طلب فتح ملف + حالة الطلب + متابعته بدون تسجيل
--   4) تفعيل حساب الممول صاحب الملف برمز تُصدره المأمورية (بدل الربط الفوري)
-- ============================================================

-- ============================================================
-- (0) أدوات مشتركة
-- ============================================================
-- رقم عشوائي من 8 خانات بمولّد آمن (لا يمكن توقّعه)
create or replace function public._random_digits(n int)
returns text language sql volatile set search_path = public, extensions as $$
  select lpad(((('x' || encode(extensions.gen_random_bytes(6), 'hex'))::bit(48)::bigint)
               % (10::bigint ^ n)::bigint)::text, n, '0');
$$;

-- محاولات المتابعة الخاطئة (حماية من التخمين) — لا يُقرأ من التطبيق
create table if not exists public.tracking_attempts (
  id bigint generated always as identity primary key,
  kind text not null,          -- complaint / file_request
  code text not null,
  created_at timestamptz default now()
);
create index if not exists idx_tracking_attempts on public.tracking_attempts (kind, code, created_at desc);
alter table public.tracking_attempts enable row level security;

create or replace function public._tracking_blocked(p_kind text, p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select (select count(*) from public.tracking_attempts
           where kind = p_kind and code = p_code and created_at > now() - interval '1 hour') >= 10
      or (select count(*) from public.tracking_attempts
           where created_at > now() - interval '1 minute') >= 60;
$$;

-- ============================================================
-- (1) الشكاوى: أعمدة جديدة
-- ============================================================
alter table public.complaints add column if not exists tracking_code text;
alter table public.complaints add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
alter table public.complaints add column if not exists escalated boolean not null default false;
alter table public.complaints add column if not exists escalated_at timestamptz;
alter table public.complaints add column if not exists escalated_by uuid references public.profiles(id) on delete set null;
alter table public.complaints add column if not exists escalation_note text default '';
alter table public.complaints add column if not exists official_reply text default '';
alter table public.complaints add column if not exists replied_at timestamptz;
alter table public.complaints add column if not exists updated_at timestamptz;

-- مدة التأخير قبل ظهور الشكوى لرئيس المأمورية (بالأيام)
alter table public.offices add column if not exists complaint_overdue_days int not null default 3;

-- أرقام للشكاوى القديمة (عمود جديد فقط)
update public.complaints
   set tracking_code = 'C-' || public._random_digits(8)
 where tracking_code is null;
update public.complaints set updated_at = created_at where updated_at is null;
alter table public.complaints alter column updated_at set default now();

create unique index if not exists uq_complaints_tracking_code on public.complaints (tracking_code);
create index if not exists idx_complaints_assigned on public.complaints (assigned_to, created_at desc);
create index if not exists idx_complaints_office_status on public.complaints (office_id, status, created_at);

-- الحالات النهائية (لا تُحسب متأخرة)
create or replace function public._complaint_is_closed(p_status text)
returns boolean language sql immutable as $$
  select p_status in ('منتهي', 'محوّل', 'مرفوض');
$$;

-- ============================================================
-- (2) التوجيه التلقائي عند الإدخال: مأمور الحصر الأقل حملًا في المأمورية
-- ============================================================
create or replace function public._complaint_route()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_surveyor uuid;
begin
  if NEW.tracking_code is null then
    loop
      NEW.tracking_code := 'C-' || public._random_digits(8);
      exit when not exists (select 1 from public.complaints where tracking_code = NEW.tracking_code);
    end loop;
  end if;
  NEW.updated_at := now();
  NEW.escalated := false;
  NEW.official_reply := '';

  if NEW.assigned_to is null and NEW.office_id is not null then
    select p.id into v_surveyor
      from public.profiles p
     where p.role = 'surveyor' and coalesce(p.status, 'active') = 'active'
       and p.office_id = NEW.office_id
     order by (select count(*) from public.complaints c
                where c.assigned_to = p.id and not public._complaint_is_closed(c.status)),
              random()
     limit 1;
    NEW.assigned_to := v_surveyor;
  end if;

  -- لا يوجد مأمور حصر نشط بالمأمورية → تُرفع مباشرة لرئيس المأمورية حتى لا تضيع
  if NEW.assigned_to is null then
    NEW.escalated := true;
    NEW.escalated_at := now();
    NEW.escalation_note := 'لا يوجد مأمور حصر نشط بالمأمورية';
  end if;
  return NEW;
end$$;

drop trigger if exists trg_complaint_route on public.complaints;
create trigger trg_complaint_route before insert on public.complaints
  for each row execute function public._complaint_route();

-- إشعار المسؤول بعد الإدخال
create or replace function public._complaint_notify_new()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.assigned_to is not null then
    insert into public.notifications (user_id, title, body, kind, link_type, link_id)
    values (NEW.assigned_to, 'شكوى جديدة واردة إليك',
            'رقم ' || NEW.tracking_code || ' — ضد: ' || coalesce(NULLIF(NEW.accused_name, ''), 'غير محدد'),
            'complaint', 'complaint', NEW.id);
  else
    insert into public.notifications (user_id, title, body, kind, link_type, link_id)
    select id, 'شكوى بدون مأمور حصر مختص',
           'رقم ' || NEW.tracking_code || ' — لا يوجد مأمور حصر نشط بالمأمورية',
           'complaint', 'complaint', NEW.id
      from public.profiles
     where role = 'office_head' and coalesce(status, 'active') = 'active'
       and office_id is not distinct from NEW.office_id;
  end if;
  return NEW;
end$$;

drop trigger if exists trg_complaint_notify_new on public.complaints;
create trigger trg_complaint_notify_new after insert on public.complaints
  for each row execute function public._complaint_notify_new();

-- عند التعديل: تحديث وقت آخر تعديل، وحماية رقم الشكوى وحقول التوجيه/التصعيد من التعديل المباشر
create or replace function public._complaint_before_update()
returns trigger language plpgsql as $$
begin
  NEW.tracking_code := OLD.tracking_code;
  if current_user in ('anon', 'authenticated') then
    NEW.assigned_to := OLD.assigned_to;
    NEW.escalated := OLD.escalated;
    NEW.escalated_at := OLD.escalated_at;
    NEW.escalated_by := OLD.escalated_by;
    NEW.escalation_note := OLD.escalation_note;
  end if;
  if NEW.official_reply is distinct from OLD.official_reply then
    NEW.replied_at := now();
  end if;
  NEW.updated_at := now();
  return NEW;
end$$;

drop trigger if exists trg_complaint_before_update on public.complaints;
create trigger trg_complaint_before_update before update on public.complaints
  for each row execute function public._complaint_before_update();

-- ============================================================
-- (3) تقديم الشكوى (يُرجع رقم الشكوى) — متاح للجمهور
--     الإدخال المباشر القديم يبقى يعمل للإصدارات السابقة من التطبيق
-- ============================================================
create or replace function public.submit_complaint(
  p_office bigint,
  p_name text,
  p_national text,
  p_phone text,
  p_accused text,
  p_activity text default '',
  p_address text default '',
  p_lat double precision default null,
  p_lng double precision default null,
  p_details text default '',
  p_photos text[] default '{}'
) returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if length(coalesce(p_details, '')) > 5000 then raise exception 'تفاصيل الشكوى طويلة جدًا'; end if;
  if coalesce(array_length(p_photos, 1), 0) > 10 then raise exception 'الحد الأقصى 10 صور'; end if;
  if length(coalesce(p_name, '')) > 200 or length(coalesce(p_accused, '')) > 300 then
    raise exception 'بيانات غير صالحة';
  end if;
  insert into public.complaints
    (office_id, complainant_name, complainant_national_id, complainant_phone, accused_name,
     activity, address, latitude, longitude, details, photos, status)
  values
    (p_office, trim(coalesce(p_name, '')), trim(coalesce(p_national, '')), trim(coalesce(p_phone, '')),
     trim(coalesce(p_accused, '')), trim(coalesce(p_activity, '')), trim(coalesce(p_address, '')),
     p_lat, p_lng, trim(coalesce(p_details, '')), coalesce(p_photos, '{}'), 'جديد')
  returning tracking_code into v_code;
  return v_code;
end$$;

-- ============================================================
-- (4) متابعة الشكوى (بدون تسجيل): رقم الشكوى + الموبايل
--     يُرجع الحالة والجهة الحالية وآخر تحديث والرد الرسمي فقط
-- ============================================================
create or replace function public.track_complaint(p_code text, p_phone text)
returns table (tracking_code text, status text, responsible text, office_name text,
               created_at timestamptz, updated_at timestamptz, official_reply text, replied_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_code text := upper(trim(coalesce(p_code, ''))); c record;
begin
  if v_code !~ '^C-' then v_code := 'C-' || v_code; end if;
  if public._tracking_blocked('complaint', v_code) then
    raise exception 'تم تجاوز عدد المحاولات المسموح، حاول بعد ساعة';
  end if;

  select cm.*, o.name as o_name into c
    from public.complaints cm
    left join public.offices o on o.id = cm.office_id
   where cm.tracking_code = v_code and cm.complainant_phone = trim(coalesce(p_phone, ''));

  if c.id is null then
    insert into public.tracking_attempts (kind, code) values ('complaint', v_code);
    return;
  end if;

  return query select
    c.tracking_code,
    c.status,
    case
      when public._complaint_is_closed(c.status) then 'مأمورية ' || coalesce(c.o_name, '')
      when c.escalated then 'رئيس المأمورية — مأمورية ' || coalesce(c.o_name, '')
      else 'مأمور الحصر المختص — مأمورية ' || coalesce(c.o_name, '')
    end,
    c.o_name,
    c.created_at,
    coalesce(c.updated_at, c.created_at),
    coalesce(c.official_reply, ''),
    c.replied_at;
end$$;

-- ============================================================
-- (5) صندوق الشكاوى حسب الدور (يحترم RLS — security invoker)
--   - مأمور الحصر: الشكاوى المسندة إليه + غير المسندة بمأموريته
--   - رئيس المأمورية: المصعّدة إليه + المتأخرة عن مدة المأمورية
--   - باقي الأدوار: كما كانت (كل ما تسمح به الصلاحيات)
-- ============================================================
create or replace function public.my_complaints_inbox()
returns setof public.complaints language sql stable set search_path = public as $$
  select c.*
    from public.complaints c
    left join public.offices o on o.id = c.office_id
   where case (select role from public.profiles where id = auth.uid())
           when 'surveyor' then
             c.assigned_to = auth.uid()
             or (c.assigned_to is null and not c.escalated and c.office_id = public.my_office_id())
           when 'office_head' then
             c.office_id = public.my_office_id()
             and (c.escalated
                  or (not public._complaint_is_closed(c.status)
                      and c.created_at < now() - make_interval(days => coalesce(o.complaint_overdue_days, 3))))
           else true
         end
   order by c.created_at desc;
$$;

-- ============================================================
-- (6) التصعيد لرئيس المأمورية (مأمور الحصر المختص) — يُسجَّل في سجل العمليات
-- ============================================================
create or replace function public.escalate_complaint(p_id bigint, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare c record; me record;
begin
  select * into c from public.complaints where id = p_id;
  if c.id is null then raise exception 'الشكوى غير موجودة'; end if;
  select id, role, office_id, full_name, employee_number into me
    from public.profiles where id = auth.uid() and coalesce(status, 'active') = 'active';
  if me.id is null or not (
       c.assigned_to = me.id
       or (me.role = 'surveyor' and c.assigned_to is null and me.office_id = c.office_id)) then
    raise exception 'غير مصرّح: التصعيد لمأمور الحصر المختص فقط';
  end if;
  if c.escalated then raise exception 'الشكوى مصعّدة بالفعل'; end if;
  if public._complaint_is_closed(c.status) then raise exception 'لا يمكن تصعيد شكوى مغلقة'; end if;

  update public.complaints
     set escalated = true, escalated_at = now(), escalated_by = me.id,
         escalation_note = left(trim(coalesce(p_note, '')), 1000),
         assigned_to = coalesce(assigned_to, me.id),
         status = case when status = 'جديد' then 'قيد المراجعة' else status end
   where id = p_id;

  insert into public.audit_log (user_id, user_name, employee_number, office_id, operation, entity_type, entity_id, details)
  values (me.id, coalesce(me.full_name, ''), coalesce(me.employee_number, ''), c.office_id,
          'تصعيد شكوى', 'complaint', p_id,
          jsonb_build_object('tracking_code', c.tracking_code, 'note', trim(coalesce(p_note, ''))));

  insert into public.notifications (user_id, title, body, kind, link_type, link_id)
  select id, 'شكوى مصعّدة إليك',
         'رقم ' || c.tracking_code || ' — من: ' || coalesce(me.full_name, 'مأمور الحصر'),
         'complaint', 'complaint', p_id
    from public.profiles
   where role = 'office_head' and coalesce(status, 'active') = 'active'
     and office_id is not distinct from c.office_id;
end$$;

-- ضبط مدة التأخير (رئيس المأمورية لمأموريته، أو الأدمن)
create or replace function public.set_complaint_overdue_days(p_days int, p_office bigint default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_office bigint := coalesce(p_office, public.my_office_id());
begin
  if p_days is null or p_days < 1 or p_days > 60 then
    raise exception 'المدة يجب أن تكون بين 1 و 60 يومًا';
  end if;
  if not (public.is_admin() or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'office_head'
        and coalesce(status, 'active') = 'active' and office_id = v_office)) then
    raise exception 'غير مصرّح';
  end if;
  update public.offices set complaint_overdue_days = p_days where id = v_office;
  perform public.log_operation('ضبط مدة تأخير الشكاوى', 'office', v_office,
                               jsonb_build_object('days', p_days));
end$$;

-- ============================================================
-- (7) طلبات فتح الملف: رقم الطلب + الحالة
-- ============================================================
alter table public.taxpayers add column if not exists request_code text;
alter table public.taxpayers add column if not exists request_status text;
alter table public.taxpayers add column if not exists request_note text default '';
alter table public.taxpayers add column if not exists request_updated_at timestamptz;

-- الطلبات القائمة (أعمدة جديدة فقط)
update public.taxpayers
   set request_code = 'F-' || public._random_digits(8),
       request_status = case when tax_number is null or tax_number = '' then 'تم الاستلام' else 'تم فتح الملف' end,
       request_updated_at = created_at
 where source = 'self_signup' and request_code is null;

create unique index if not exists uq_taxpayers_request_code on public.taxpayers (request_code);

-- (ليست security definer حتى يميّز current_user تعديلات التطبيق عن الدوال الموثوقة)
create or replace function public._file_request_before()
returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.source = 'self_signup' and NEW.request_code is null then
      loop
        NEW.request_code := 'F-' || public._random_digits(8);
        exit when not exists (select 1 from public.taxpayers where request_code = NEW.request_code);
      end loop;
      NEW.request_status := 'تم الاستلام';
      NEW.request_updated_at := now();
    end if;
    return NEW;
  end if;
  -- رقم الطلب وحالته تُعدَّل عبر set_file_request_status فقط (حتى يُبلَّغ الممول ويُسجَّل التعديل)
  if current_user in ('anon', 'authenticated') then
    NEW.request_code := OLD.request_code;
    NEW.request_status := OLD.request_status;
    NEW.request_note := OLD.request_note;
    NEW.request_updated_at := OLD.request_updated_at;
  end if;
  -- اعتماد الرقم الضريبي (assign_tax_number) = تم فتح الملف
  if OLD.request_code is not null
     and coalesce(NEW.tax_number, '') <> '' and coalesce(OLD.tax_number, '') = '' then
    NEW.request_status := 'تم فتح الملف';
    NEW.request_updated_at := now();
  end if;
  return NEW;
end$$;

drop trigger if exists trg_file_request_before on public.taxpayers;
create trigger trg_file_request_before before insert or update on public.taxpayers
  for each row execute function public._file_request_before();

-- الموظف يحدّث حالة الطلب (قيد المراجعة / مطلوب مستندات / مرفوض) ويُبلَّغ الممول
create or replace function public.set_file_request_status(p_taxpayer bigint, p_status text, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare t record;
begin
  if not public.is_staff() then raise exception 'غير مصرّح'; end if;
  if p_status not in ('قيد المراجعة', 'مطلوب مستندات', 'مرفوض') then
    raise exception 'حالة غير صالحة';
  end if;
  if p_status in ('مطلوب مستندات', 'مرفوض') and trim(coalesce(p_note, '')) = '' then
    raise exception 'اكتب السبب أو المستندات المطلوبة';
  end if;
  select id, office_id, user_id, request_code, request_status, tax_number into t
    from public.taxpayers where id = p_taxpayer;
  if t.id is null or t.request_code is null then raise exception 'لا يوجد طلب فتح ملف لهذا الممول'; end if;
  if not public.can_access_office(t.office_id) then raise exception 'الطلب خارج اختصاص مأموريتك'; end if;
  if coalesce(t.tax_number, '') <> '' then raise exception 'تم فتح الملف بالفعل'; end if;

  update public.taxpayers
     set request_status = p_status, request_note = left(trim(coalesce(p_note, '')), 1000),
         request_updated_at = now()
   where id = p_taxpayer;

  perform public.log_operation('تحديث طلب فتح ملف', 'taxpayer', p_taxpayer,
                               jsonb_build_object('code', t.request_code, 'status', p_status));

  if t.user_id is not null then
    insert into public.notifications (user_id, title, body, kind, link_type, link_id)
    values (t.user_id, 'تحديث على طلب فتح الملف',
            'الطلب ' || t.request_code || ': ' || p_status
              || case when trim(coalesce(p_note, '')) <> '' then ' — ' || trim(p_note) else '' end,
            case when p_status = 'مرفوض' then 'file_rejected' else 'request' end,
            'file_request', p_taxpayer);
  end if;
end$$;

-- متابعة طلب فتح الملف (بدون تسجيل): رقم الطلب + الموبايل
create or replace function public.track_file_request(p_code text, p_phone text)
returns table (request_code text, status text, note text, office_name text,
               tax_number text, created_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_code text := upper(trim(coalesce(p_code, ''))); t record;
begin
  if v_code !~ '^F-' then v_code := 'F-' || v_code; end if;
  if public._tracking_blocked('file_request', v_code) then
    raise exception 'تم تجاوز عدد المحاولات المسموح، حاول بعد ساعة';
  end if;

  select tp.*, o.name as o_name into t
    from public.taxpayers tp
    left join public.offices o on o.id = tp.office_id
   where tp.request_code = v_code and tp.phone = trim(coalesce(p_phone, ''));

  if t.id is null then
    insert into public.tracking_attempts (kind, code) values ('file_request', v_code);
    return;
  end if;

  return query select
    t.request_code,
    coalesce(t.request_status, 'تم الاستلام'),
    case when t.request_status in ('مطلوب مستندات', 'مرفوض') then coalesce(t.request_note, '') else '' end,
    t.o_name,
    case when coalesce(t.tax_number, '') <> '' then t.tax_number else null end,
    t.created_at,
    coalesce(t.request_updated_at, t.created_at);
end$$;

-- ملخص طلب فتح الملف للممول المسجّل دخوله (رقم الطلب وحالته)
create or replace function public.my_file_request()
returns table (request_code text, status text, note text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select request_code, coalesce(request_status, 'تم الاستلام'),
         case when request_status in ('مطلوب مستندات', 'مرفوض') then coalesce(request_note, '') else '' end,
         coalesce(request_updated_at, created_at)
    from public.taxpayers
   where user_id = auth.uid() and request_code is not null
   order by created_at desc
   limit 1;
$$;

-- ============================================================
-- (8) تفعيل حساب الممول صاحب الملف (عندي ملف وأريد إنشاء حساب)
--     الحساب يُنشأ «بانتظار التفعيل» ولا يُربط بالملف حتى يُدخل الممول رمزًا
--     يصدره له موظف المأمورية بعد التحقق من شخصيته (هاتفيًا أو حضوريًا)
-- ============================================================
create table if not exists public.taxpayer_activations (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  taxpayer_id bigint references public.taxpayers(id) on delete cascade,
  office_id bigint references public.offices(id),
  tax_number text not null,
  full_name text default '',
  national_id text default '',
  phone text default '',
  status text not null default 'pending',   -- pending / verified / rejected
  code_hash text,
  code_issued_at timestamptz,
  code_issued_by uuid references public.profiles(id) on delete set null,
  attempts int not null default 0,
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  reject_reason text default '',
  created_at timestamptz default now()
);
create index if not exists idx_activations_office on public.taxpayer_activations (office_id, status, created_at desc);
create unique index if not exists uq_activation_pending_user
  on public.taxpayer_activations (user_id) where status = 'pending';

alter table public.taxpayer_activations enable row level security;
-- القراءة لموظفي المأمورية فقط؛ الممول يقرأ حالته عبر my_activation_status. الكتابة عبر الدوال فقط
drop policy if exists activations_select on public.taxpayer_activations;
create policy activations_select on public.taxpayer_activations for select
  using (public.is_staff() and public.can_access_office(office_id));

-- يُستدعى بعد إنشاء الحساب: ينشئ طلب تفعيل معلّق ويُبلغ مأموري الحصر بالمأمورية
create or replace function public.request_account_activation(p_tax text, p_national text)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare tp record; me record; v_id bigint;
begin
  if auth.uid() is null then return false; end if;
  select id, role, full_name, national_id, phone, tax_number into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'taxpayer' or coalesce(me.tax_number, '') <> '' then return false; end if;
  -- البريد المشتق يجب أن يطابق الرقم الضريبي المطلوب ربطه
  if (select email from auth.users where id = auth.uid()) is distinct from 'tax' || trim(p_tax) || '@taxpayer.tax' then
    return false;
  end if;
  select id, office_id into tp from public.taxpayers
    where tax_number = trim(p_tax) and national_id = trim(p_national) and user_id is null
    limit 1;
  if tp.id is null then return false; end if;

  if exists (select 1 from public.taxpayer_activations where user_id = auth.uid() and status = 'pending') then
    return true;
  end if;

  insert into public.taxpayer_activations (user_id, taxpayer_id, office_id, tax_number, full_name, national_id, phone)
  values (auth.uid(), tp.id, tp.office_id, trim(p_tax), coalesce(me.full_name, ''),
          trim(p_national), coalesce(me.phone, ''))
  returning id into v_id;

  update public.profiles set office_id = coalesce(office_id, tp.office_id) where id = auth.uid();

  insert into public.notifications (user_id, title, body, kind, link_type, link_id)
  select id, 'طلب تفعيل حساب ممول',
         coalesce(me.full_name, '') || ' — رقم التسجيل ' || trim(p_tax) || ' — ' || coalesce(me.phone, ''),
         'activation', 'activation', v_id
    from public.profiles
   where role = 'surveyor' and coalesce(status, 'active') = 'active'
     and office_id is not distinct from tp.office_id;
  return true;
end$$;

-- حالة التفعيل للممول المسجّل دخوله
create or replace function public.my_activation_status()
returns table (status text, tax_number text, code_issued boolean, reject_reason text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select status, tax_number, code_hash is not null, coalesce(reject_reason, ''), created_at
    from public.taxpayer_activations
   where user_id = auth.uid()
   order by created_at desc
   limit 1;
$$;

-- الموظف يُصدر رمز تفعيل (6 أرقام، صالح 48 ساعة) — يُعرض له مرة واحدة ليبلغه للممول
create or replace function public.issue_activation_code(p_id bigint)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare a record; v_code text;
begin
  if not public.is_staff() then raise exception 'غير مصرّح'; end if;
  select * into a from public.taxpayer_activations where id = p_id;
  if a.id is null or a.status <> 'pending' then raise exception 'الطلب غير موجود أو تمت معالجته'; end if;
  if not public.can_access_office(a.office_id) then raise exception 'الطلب خارج اختصاص مأموريتك'; end if;

  v_code := public._random_digits(6);
  update public.taxpayer_activations
     set code_hash = extensions.crypt(v_code, extensions.gen_salt('bf')),
         code_issued_at = now(), code_issued_by = auth.uid(), attempts = 0
   where id = p_id;

  perform public.log_operation('إصدار رمز تفعيل حساب ممول', 'taxpayer', a.taxpayer_id,
                               jsonb_build_object('tax_number', a.tax_number));

  insert into public.notifications (user_id, title, body, kind, link_type)
  values (a.user_id, 'تم إصدار رمز تفعيل حسابك',
          'سيبلغك موظف المأمورية بالرمز. أدخله في التطبيق خلال 48 ساعة لإتمام التفعيل.',
          'general', 'activation');
  return v_code;
end$$;

-- الممول يُدخل الرمز → يُربط الحساب بالملف ويصبح ممولًا مسجَّلًا
create or replace function public.verify_account_activation(p_code text)
returns boolean language plpgsql security definer set search_path = public, auth, extensions as $$
declare a record; tp record;
begin
  if auth.uid() is null then return false; end if;
  select * into a from public.taxpayer_activations
   where user_id = auth.uid() and status = 'pending'
   order by created_at desc limit 1;
  if a.id is null then raise exception 'لا يوجد طلب تفعيل لحسابك'; end if;
  if a.code_hash is null then raise exception 'لم يُصدر رمز التفعيل بعد. تواصل مع مأموريتك.'; end if;
  if a.code_issued_at < now() - interval '48 hours' then
    raise exception 'انتهت صلاحية الرمز. اطلب رمزًا جديدًا من المأمورية.';
  end if;
  if a.attempts >= 5 then
    raise exception 'تم تجاوز عدد المحاولات. اطلب رمزًا جديدًا من المأمورية.';
  end if;
  if extensions.crypt(trim(coalesce(p_code, '')), a.code_hash) <> a.code_hash then
    update public.taxpayer_activations set attempts = attempts + 1 where id = a.id;
    return false;
  end if;

  select id, office_id, user_id into tp from public.taxpayers where id = a.taxpayer_id;
  if tp.id is null or tp.user_id is not null then
    raise exception 'الملف مرتبط بحساب آخر. تواصل مع مأموريتك.';
  end if;
  if (select email from auth.users where id = auth.uid()) is distinct from 'tax' || a.tax_number || '@taxpayer.tax' then
    raise exception 'بيانات الحساب غير مطابقة';
  end if;

  update public.taxpayers set registered = true, user_id = auth.uid() where id = tp.id;
  update public.profiles
     set tax_number = a.tax_number, office_id = coalesce(office_id, tp.office_id)
   where id = auth.uid();
  update public.taxpayer_activations
     set status = 'verified', handled_at = now(), code_hash = null
   where id = a.id;

  insert into public.audit_log (user_id, user_name, office_id, operation, entity_type, entity_id, details)
  values (auth.uid(), coalesce(a.full_name, ''), tp.office_id, 'تفعيل حساب ممول', 'taxpayer', tp.id,
          jsonb_build_object('tax_number', a.tax_number));
  insert into public.notifications (user_id, title, body, kind, link_type, link_id)
  values (auth.uid(), 'تم تفعيل حسابك', 'تم ربط حسابك بملفك الضريبي رقم ' || a.tax_number || '.',
          'file_approved', 'taxpayer', tp.id);
  return true;
end$$;

-- الموظف يرفض الطلب (انتحال/بيانات غير صحيحة) → يُحذف الحساب غير المفعّل ليُحرَّر رقم التسجيل لصاحبه
create or replace function public.reject_account_activation(p_id bigint, p_reason text default '')
returns void language plpgsql security definer set search_path = public, auth as $$
declare a record;
begin
  if not public.is_staff() then raise exception 'غير مصرّح'; end if;
  select * into a from public.taxpayer_activations where id = p_id;
  if a.id is null or a.status <> 'pending' then raise exception 'الطلب غير موجود أو تمت معالجته'; end if;
  if not public.can_access_office(a.office_id) then raise exception 'الطلب خارج اختصاص مأموريتك'; end if;

  update public.taxpayer_activations
     set status = 'rejected', handled_by = auth.uid(), handled_at = now(),
         reject_reason = left(trim(coalesce(p_reason, '')), 500), code_hash = null, user_id = null
   where id = p_id;

  perform public.log_operation('رفض تفعيل حساب ممول', 'taxpayer', a.taxpayer_id,
                               jsonb_build_object('tax_number', a.tax_number, 'reason', trim(coalesce(p_reason, ''))));

  -- حذف الحساب فقط إن كان ممولًا غير مرتبط بأي ملف
  if a.user_id is not null
     and exists (select 1 from public.profiles where id = a.user_id and role = 'taxpayer'
                   and coalesce(tax_number, '') = '')
     and not exists (select 1 from public.taxpayers where user_id = a.user_id) then
    delete from public.notifications where user_id = a.user_id;
    delete from public.messages where sender_id = a.user_id or receiver_id = a.user_id;
    update public.requests set applicant_id = null where applicant_id = a.user_id;
    update public.audit_log set user_id = null where user_id = a.user_id;
    delete from public.profiles where id = a.user_id;
    delete from auth.users where id = a.user_id;
  end if;
end$$;

-- الربط الفوري القديم كان يكفيه الرقم الضريبي + القومي (يمكن لأي شخص يعرفهما الاستيلاء على الملف).
-- أصبح ينشئ طلب تفعيل ولا يربط إلا بعد إدخال رمز المأمورية.
create or replace function public.link_taxpayer(p_tax text, p_national text)
returns boolean language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.request_account_activation(p_tax, p_national);
  return false;
end$$;

-- ============================================================
-- صلاحيات التنفيذ
-- ============================================================
revoke execute on function public._random_digits(int) from public, anon, authenticated;
revoke execute on function public._tracking_blocked(text, text) from public, anon, authenticated;

grant execute on function public.submit_complaint(bigint, text, text, text, text, text, text, double precision, double precision, text, text[]) to anon, authenticated;
grant execute on function public.track_complaint(text, text) to anon, authenticated;
grant execute on function public.track_file_request(text, text) to anon, authenticated;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('my_complaints_inbox','escalate_complaint','set_complaint_overdue_days',
                         'set_file_request_status','my_file_request',
                         'request_account_activation','my_activation_status','issue_activation_code',
                         'verify_account_activation','reject_account_activation','link_taxpayer')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end$$;

-- ============================================================
-- تحقق سريع
-- ============================================================
select
  (select count(*) from public.complaints where tracking_code is null) as complaints_without_code,
  (select count(*) from public.taxpayers where source = 'self_signup' and request_code is null) as requests_without_code,
  (select count(*) from pg_trigger where tgname in ('trg_complaint_route','trg_complaint_notify_new',
                                                    'trg_complaint_before_update','trg_file_request_before')) as new_triggers;
