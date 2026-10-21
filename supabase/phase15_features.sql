-- ============================================================
--  المرحلة 15: خصائص ما قبل النشر
--  شغّله بعد phase14_security_hardening.sql — آمن لإعادة التشغيل.
--
--   1) استعادة كلمة مرور الممول عبر طلب يعالجه مدير الحاسب بالمأمورية
--   2) إشعارات الهاتف (Push) تلقائيًا لكل إشعار جديد عبر Expo Push + pg_net
--   3) ملخص المحادثات من الخادم (بدل تحميل كل الرسائل)
--   4) حماية نموذج الشكاوى العام من الإغراق (حدود يومية + تحقق من البيانات)
--   5) الأخبار: النشر للجميع للإدارة العليا فقط، وغيرها داخل مأموريته
--   6) جداول الإدارات القديمة (surveys/examinations/seizures) محصورة بالمأمورية
--   7) الصور والمرفقات: مساحة تخزين خاصة (لا تُفتح إلا بروابط مؤقتة للموظفين)
-- ============================================================

-- ============================================================
-- (1) طلبات استعادة كلمة المرور
-- ============================================================
create table if not exists public.password_reset_requests (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  office_id bigint references public.offices(id),
  full_name text default '',
  national_id text default '',
  phone text default '',
  tax_number text,
  status text not null default 'new',  -- new / done / rejected
  handled_by uuid references public.profiles(id),
  handled_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_pwreset_office on public.password_reset_requests (office_id, status, created_at desc);

alter table public.password_reset_requests enable row level security;
-- القراءة: الأدمن، ومدير الحاسب/رئيس المأمورية داخل مأموريته. لا كتابة مباشرة (RPC فقط)
drop policy if exists pwreset_select on public.password_reset_requests;
create policy pwreset_select on public.password_reset_requests for select using (
  public.is_admin()
  or exists (select 1 from public.profiles
              where id = auth.uid() and role in ('it_manager','office_head')
                and coalesce(status, 'active') = 'active'
                and office_id = password_reset_requests.office_id)
);

-- يُستدعى من شاشة الدخول بدون تسجيل: الرقم القومي + الهاتف المسجّلان بالحساب
-- لا يكشف إن كانت البيانات صحيحة أم لا (لمنع التخمين)
create or replace function public.request_password_reset(p_national text, p_phone text)
returns void language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select id, office_id, full_name, national_id, phone, tax_number into p
    from public.profiles
   where role = 'taxpayer' and national_id = trim(p_national) and phone = trim(p_phone)
   limit 1;
  if p.id is null then return; end if;
  if exists (select 1 from public.password_reset_requests where user_id = p.id and status = 'new') then
    return;
  end if;
  if (select count(*) from public.password_reset_requests
       where user_id = p.id and created_at > now() - interval '1 day') >= 3 then
    return;
  end if;

  insert into public.password_reset_requests (user_id, office_id, full_name, national_id, phone, tax_number)
  values (p.id, p.office_id, coalesce(p.full_name, ''), coalesce(p.national_id, ''), coalesce(p.phone, ''), p.tax_number);

  insert into public.notifications (user_id, title, body, kind, link_type)
  select id, 'طلب استعادة كلمة مرور', coalesce(p.full_name, '') || ' — ' || coalesce(p.phone, ''),
         'password_reset', 'password_reset'
    from public.profiles
   where role = 'it_manager' and coalesce(status, 'active') = 'active'
     and office_id is not distinct from p.office_id;
end$$;

-- مدير الحاسب يعالج الطلب: يتصل بالممول للتحقق ثم يعيّن كلمة مؤقتة (أو يرفض)
create or replace function public.resolve_password_reset(p_request bigint, p_new_password text default null, p_reject boolean default false)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
declare r record;
begin
  select * into r from public.password_reset_requests where id = p_request;
  if r.id is null or r.status <> 'new' then
    raise exception 'الطلب غير موجود أو تمت معالجته';
  end if;
  if not (public.is_admin() or exists (
      select 1 from public.profiles where id = auth.uid() and role in ('it_manager','office_head')
        and coalesce(status, 'active') = 'active' and office_id is not distinct from r.office_id)) then
    raise exception 'غير مصرّح';
  end if;
  if not p_reject then
    if length(coalesce(p_new_password, '')) < 8 then
      raise exception 'كلمة المرور يجب ألا تقل عن 8 أحرف';
    end if;
    update auth.users
       set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')), updated_at = now()
     where id = r.user_id;
    update public.profiles set must_change_password = true where id = r.user_id;
  end if;
  update public.password_reset_requests
     set status = case when p_reject then 'rejected' else 'done' end,
         handled_by = auth.uid(), handled_at = now()
   where id = p_request;
end$$;

-- ============================================================
-- (2) إشعارات الهاتف: كل صف في notifications يُرسل Push لصاحب الحساب
--     يتطلب تفعيل pg_net (Database → Extensions) + إعداد FCM للتطبيق على EAS
-- ============================================================
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net غير متاح — فعّله من Database → Extensions لإرسال إشعارات الهاتف';
end$$;

create or replace function public._push_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare tok text;
begin
  select expo_push_token into tok from public.profiles where id = NEW.user_id;
  if tok is null or tok = '' then
    return NEW;
  end if;
  begin
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := jsonb_build_object(
        'to', tok,
        'title', NEW.title,
        'body', NEW.body,
        'sound', 'default',
        'channelId', 'default',
        'data', jsonb_build_object('kind', NEW.kind, 'link_type', NEW.link_type, 'link_id', NEW.link_id)
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  exception when others then
    -- فشل الإرسال لا يجب أن يمنع حفظ الإشعار داخل التطبيق
    null;
  end;
  return NEW;
end$$;

drop trigger if exists trg_push_notification on public.notifications;
create trigger trg_push_notification after insert on public.notifications
  for each row execute function public._push_notification();

-- ============================================================
-- (3) ملخص المحادثات: آخر رسالة + عدد غير المقروء لكل طرف
-- ============================================================
create index if not exists idx_messages_receiver_unread on public.messages (receiver_id, read);

create or replace function public.my_conversation_summaries()
returns table (other_id uuid, last_body text, last_at timestamptz, last_sender uuid, unread int)
language sql security definer stable set search_path = public as $$
  with mine as (
    select case when sender_id = auth.uid() then receiver_id else sender_id end as other_id,
           body, created_at, sender_id, receiver_id, read
      from public.messages
     where sender_id = auth.uid() or receiver_id = auth.uid()
  ),
  unread as (
    select other_id, count(*)::int as n from mine
     where receiver_id = auth.uid() and not read
     group by other_id
  )
  select distinct on (m.other_id) m.other_id, m.body, m.created_at, m.sender_id, coalesce(u.n, 0)
    from mine m left join unread u on u.other_id = m.other_id
   order by m.other_id, m.created_at desc;
$$;

-- ============================================================
-- (4) الشكاوى العامة: تحقق + حدود يومية
-- ============================================================
create or replace function public._complaint_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(NEW.complainant_national_id, '') !~ '^[0-9]{14}$' then
    raise exception 'الرقم القومي يجب أن يتكون من 14 رقمًا';
  end if;
  if coalesce(NEW.complainant_phone, '') !~ '^01[0-9]{9}$' then
    raise exception 'رقم الهاتف غير صحيح';
  end if;
  if NEW.office_id is null or not exists (select 1 from public.offices where id = NEW.office_id) then
    raise exception 'اختر المأمورية المختصة';
  end if;
  if (select count(*) from public.complaints
       where (complainant_national_id = NEW.complainant_national_id or complainant_phone = NEW.complainant_phone)
         and created_at > now() - interval '1 day') >= 3 then
    raise exception 'تم تجاوز الحد المسموح من الشكاوى اليوم، حاول غدًا';
  end if;
  -- حماية عامة من الإغراق الآلي
  if (select count(*) from public.complaints where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'الخدمة مشغولة حاليًا، حاول بعد قليل';
  end if;
  return NEW;
end$$;

drop trigger if exists trg_complaint_guard on public.complaints;
create trigger trg_complaint_guard before insert on public.complaints
  for each row execute function public._complaint_guard();

-- ============================================================
-- (5) الأخبار
-- ============================================================
drop policy if exists news_select on public.news;
create policy news_select on public.news for select using (
  public.is_admin()
  or (audience = 'all' and office_id is null)
  or (audience = 'office' and office_id = public.my_office_id())
  or (audience = 'role'
      and target_role = (select role from public.profiles where id = auth.uid())
      and (office_id is null or office_id = public.my_office_id()))
);

drop policy if exists news_write on public.news;
create policy news_write on public.news for all using (
  public.is_admin()
  or (office_id = public.my_office_id() and exists (
        select 1 from public.profiles where id = auth.uid()
           and role in ('office_head','it_manager') and coalesce(status, 'active') = 'active'))
) with check (
  public.is_admin()
  or (audience in ('office','role') and office_id = public.my_office_id() and exists (
        select 1 from public.profiles where id = auth.uid()
           and role in ('office_head','it_manager') and coalesce(status, 'active') = 'active'))
);

-- ============================================================
-- (6) جداول الإدارات القديمة: محصورة بالمأمورية
-- ============================================================
alter table public.seizures add column if not exists office_id bigint references public.offices(id);

do $$
declare t text;
begin
  foreach t in array array['surveys','examinations','seizures'] loop
    execute format('drop trigger if exists trg_default_office on public.%I', t);
    execute format('create trigger trg_default_office before insert on public.%I
                    for each row execute function public._default_office_id()', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select using (
                      public.can_access_office(office_id) or tax_number = public.my_tax_number())', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format('create policy %I on public.%I for all
                      using (public.is_staff() and public.can_access_office(office_id))
                      with check (public.is_staff() and public.can_access_office(office_id))', t || '_write', t);
  end loop;
end$$;

-- ============================================================
-- (7) التخزين الخاص: الصور لا تُفتح إلا للموظفين وبروابط مؤقتة
--     (التطبيق يحوّل الروابط القديمة تلقائيًا إلى روابط موقّعة)
-- ============================================================
update storage.buckets set public = false where id = 'attachments';

drop policy if exists attachments_read on storage.objects;
create policy attachments_read on storage.objects for select
  using (bucket_id = 'attachments' and public.is_staff());

-- ============================================================
-- صلاحيات التنفيذ
-- ============================================================
revoke execute on function public.resolve_password_reset(bigint, text, boolean) from public, anon;
grant execute on function public.resolve_password_reset(bigint, text, boolean) to authenticated;
revoke execute on function public.my_conversation_summaries() from public, anon;
grant execute on function public.my_conversation_summaries() to authenticated;
grant execute on function public.request_password_reset(text, text) to anon, authenticated;
