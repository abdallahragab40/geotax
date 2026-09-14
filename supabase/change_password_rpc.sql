-- ============================================================
-- RPC لتغيير كلمة المرور دون استخدام Supabase Auth API
-- تتجنب أي webhooks/triggers قد تُعلّق طلب updateUser
-- ============================================================

create or replace function public.change_my_password(new_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;
  if length(new_password) < 6 then
    raise exception 'كلمة المرور يجب ألا تقل عن 6 أحرف';
  end if;

  update auth.users
    set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
        updated_at = now()
    where id = auth.uid();

  update public.profiles
    set must_change_password = false
    where id = auth.uid();
end$$;

grant execute on function public.change_my_password(text) to authenticated;
