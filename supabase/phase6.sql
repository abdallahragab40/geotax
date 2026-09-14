-- ============================================================
--  المرحلة 6: استيراد البيانات + ربط الممول + الأعمدة الجديدة + التحديث اللحظي
--  شغّل هذا الملف مرة واحدة، ثم شغّل seed_taxpayers.sql لإدخال الـ200 ممول
-- ============================================================

-- 1) أعمدة جديدة في سجل الممولين
alter table public.taxpayers add column if not exists legal_entity text default '';
alter table public.taxpayers add column if not exists phone text default '';
alter table public.taxpayers add column if not exists last_accounting text default '';
alter table public.taxpayers add column if not exists source text default 'survey';   -- imported / survey / request
alter table public.taxpayers add column if not exists registered boolean default false; -- له حساب مستخدم؟
alter table public.taxpayers add column if not exists user_id uuid references public.profiles(id);
alter table public.taxpayers add column if not exists summary text default '';          -- ملخص المعاينة
alter table public.taxpayers add column if not exists photos text[] default '{}';        -- مرفقات

-- 2) الممول يرى ملفه (بمطابقة الرقم الضريبي أو ربط الحساب)
drop policy if exists taxpayers_select on public.taxpayers;
create policy taxpayers_select on public.taxpayers for select
  using (public.is_staff() or tax_number = public.my_tax_number() or user_id = auth.uid());

-- الممول يحدّث ملفه الخاص (الموقع/الصور فقط من التطبيق)
drop policy if exists taxpayers_update_own on public.taxpayers;
create policy taxpayers_update_own on public.taxpayers for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) ربط الممول بحسابه عند التسجيل (التحقق من وجود بياناته بالنظام)
create or replace function public.link_taxpayer(p_tax text, p_national text)
returns boolean language plpgsql security definer as $$
declare tp_id bigint;
begin
  select id into tp_id from public.taxpayers
    where tax_number = p_tax and national_id = p_national and user_id is null
    limit 1;
  if tp_id is null then
    return false;
  end if;
  update public.taxpayers set registered = true, user_id = auth.uid() where id = tp_id;
  update public.profiles set tax_number = p_tax where id = auth.uid();
  return true;
end;
$$;

-- 4) صور الشكاوى + السماح برفع صور للجمهور (bucket عام)
alter table public.complaints add column if not exists photos text[] default '{}';

drop policy if exists attachments_write on storage.objects;
create policy attachments_write on storage.objects for insert
  with check (bucket_id = 'attachments');

-- 5) التحديث اللحظي لسجل الممولين والتعديلات
alter publication supabase_realtime add table public.taxpayers;
alter publication supabase_realtime add table public.taxpayer_modifications;
