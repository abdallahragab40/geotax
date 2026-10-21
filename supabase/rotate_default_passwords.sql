-- ============================================================
--  ⚠️ تدوير كلمات المرور الافتراضية (شغّله مرة واحدة قبل النشر)
--
--  كلمة المرور الافتراضية 12345678 وأرقام الحاسب منشورة في ملفات المستودع.
--  أي حساب ما زال يستخدمها يمكن لأي شخص الدخول إليه وتعيين كلمة مرور جديدة والاستيلاء عليه.
--
--  هذا السكربت:
--   - يبحث عن كل حساب ما زالت كلمة مروره إحدى القيم الافتراضية
--   - يعيّن له كلمة مرور مؤقتة عشوائية + يُجبره على تغييرها عند الدخول
--   - يعرض جدولًا بالحسابات وكلمات المرور الجديدة → سلّمها لأصحابها بشكل سري
--     (لن تظهر مرة أخرى بعد إغلاق النتيجة)
-- ============================================================

drop table if exists _rotated;
create temp table _rotated (email text, full_name text, office text, temp_password text);

do $$
declare
  u record;
  pwd text;
begin
  for u in
    select au.id, au.email, p.full_name, o.name as office
      from auth.users au
      join public.profiles p on p.id = au.id
      left join public.offices o on o.id = p.office_id
     where p.role <> 'taxpayer'
       and (au.encrypted_password = extensions.crypt('12345678', au.encrypted_password)
         or au.encrypted_password = extensions.crypt('12345', au.encrypted_password)
         or au.encrypted_password = extensions.crypt('123456', au.encrypted_password))
  loop
    pwd := substr(translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/=lIO0', 'xyzabcd'), 1, 10);
    update auth.users
       set encrypted_password = extensions.crypt(pwd, extensions.gen_salt('bf')), updated_at = now()
     where id = u.id;
    update public.profiles set must_change_password = true where id = u.id;
    insert into _rotated values (u.email, u.full_name, u.office, pwd);
  end loop;
end$$;

select * from _rotated order by office, email;
