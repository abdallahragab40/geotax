-- ============================================================
--  المرحلة 11: الممول + المراسلات + الإشعارات + الأرشيف
-- ============================================================

-- 1) تعزيز جدول الرسائل (عنوان + حالة + مرفقات)
alter table public.messages add column if not exists title text default '';
alter table public.messages add column if not exists attachments text[] default '{}';
alter table public.messages add column if not exists status text default 'new';
-- new / read / replied / closed

-- 2) جدول الإشعارات
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  kind text default 'general',
  -- message / task / request / appointment / attendance / file_approved / file_rejected / general
  link_type text default '',
  link_id bigint,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_notifs_user on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifs_select on public.notifications;
create policy notifs_select on public.notifications for select using (user_id = auth.uid());

drop policy if exists notifs_update on public.notifications;
create policy notifs_update on public.notifications for update using (user_id = auth.uid());

-- INSERT بدون قيود من الدوال الموثوقة + من النظام
drop policy if exists notifs_insert on public.notifications;
create policy notifs_insert on public.notifications for insert with check (true);

alter publication supabase_realtime add table public.notifications;

-- 3) محفّز إشعار للرسائل الواردة
create or replace function public._notify_new_message()
returns trigger language plpgsql as $$
declare sender_name text;
begin
  select full_name into sender_name from public.profiles where id = NEW.sender_id;
  insert into public.notifications (user_id, title, body, kind, link_type, link_id)
    values (NEW.receiver_id,
            'رسالة جديدة من ' || coalesce(sender_name,'موظف'),
            coalesce(NEW.title || ' — ', '') || left(NEW.body, 80),
            'message', 'message', NEW.id);
  return NEW;
end; $$;

drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message after insert on public.messages
  for each row execute function public._notify_new_message();

-- 4) محفّز إشعار للمهام المسندة
create or replace function public._notify_new_task()
returns trigger language plpgsql as $$
begin
  if NEW.assigned_to is not null then
    insert into public.notifications (user_id, title, body, kind, link_type, link_id)
      values (NEW.assigned_to,
              'مهمة جديدة #' || NEW.id,
              'تم إسناد مهمة بأولوية ' || coalesce(NEW.priority,'عادية'),
              'task', 'task', NEW.id);
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_notify_task on public.tasks;
create trigger trg_notify_task after insert on public.tasks
  for each row execute function public._notify_new_task();

-- 5) محفّز إشعار للرد على الطلب (تغيير الحالة)
create or replace function public._notify_request_update()
returns trigger language plpgsql as $$
declare title_text text;
begin
  if NEW.status <> coalesce(OLD.status,'') and NEW.applicant_id is not null then
    title_text := 'طلبك (' || NEW.type || ') — ' || NEW.status;
    insert into public.notifications (user_id, title, body, kind, link_type, link_id)
      values (NEW.applicant_id, title_text,
              coalesce(NEW.response, '')
                || case when NEW.appointment <> '' then ' — موعد: ' || NEW.appointment else '' end,
              'request', 'request', NEW.id);
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_notify_request_update on public.requests;
create trigger trg_notify_request_update after update on public.requests
  for each row execute function public._notify_request_update();

-- 6) محفّز إشعار لطلب الحضور والمواعيد
create or replace function public._notify_attendance()
returns trigger language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.taxpayers where id = NEW.taxpayer_id;
  if uid is not null then
    insert into public.notifications (user_id, title, body, kind, link_type, link_id)
      values (uid, 'طلب حضور للمأمورية',
              'تاريخ: ' || NEW.attend_date || coalesce(' • ' || NEW.reason, ''),
              'attendance', 'attendance', NEW.id);
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_notify_attendance on public.attendance_requests;
create trigger trg_notify_attendance after insert on public.attendance_requests
  for each row execute function public._notify_attendance();

create or replace function public._notify_appointment()
returns trigger language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.taxpayers where id = NEW.taxpayer_id;
  if uid is not null then
    insert into public.notifications (user_id, title, body, kind, link_type, link_id)
      values (uid, 'موعد معاينة',
              'تاريخ: ' || NEW.appointment_date || coalesce(' الساعة ' || NEW.appointment_time, ''),
              'appointment', 'appointment', NEW.id);
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_notify_appointment on public.inspection_appointments;
create trigger trg_notify_appointment after insert on public.inspection_appointments
  for each row execute function public._notify_appointment();

-- 7) RPC لإسناد رقم تسجيل ضريبي + ربط الحساب (بعد اعتماد ملف جديد)
create or replace function public.assign_tax_number(p_taxpayer bigint, p_tax text)
returns void language plpgsql security definer as $$
declare uid uuid;
begin
  if not public.is_staff() then raise exception 'غير مصرّح'; end if;
  update public.taxpayers
     set tax_number = p_tax, status = 'مسجل', registered = true
   where id = p_taxpayer
   returning user_id into uid;
  if uid is not null then
    update public.profiles set tax_number = p_tax where id = uid;
    insert into public.notifications (user_id, title, body, kind, link_type, link_id)
      values (uid, 'تم اعتماد ملفك الضريبي',
              'تم إنشاء رقم التسجيل الضريبي ' || p_tax || ' وربطه بحسابك.',
              'file_approved', 'taxpayer', p_taxpayer);
  end if;
end; $$;

-- 8) RPC لتعليم الإشعار كمقروء
create or replace function public.mark_notification_read(p_id bigint)
returns void language sql security definer as $$
  update public.notifications set read = true where id = p_id and user_id = auth.uid();
$$;
create or replace function public.mark_all_notifications_read()
returns void language sql security definer as $$
  update public.notifications set read = true where user_id = auth.uid() and read = false;
$$;
