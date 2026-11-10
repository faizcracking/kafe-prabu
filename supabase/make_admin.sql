-- ALTERNATIF membuat admin pertama lewat SQL (kalau tidak memakai `npm run create-admin`):
-- 1) Supabase > Authentication > Users > Add user (isi email + password, centang Auto Confirm)
-- 2) Ganti email di bawah, lalu jalankan di SQL Editor.
insert into public.profiles (id, full_name, role)
select id, 'Admin Prabu', 'admin' from auth.users where email = 'admin@kafeprabu.com'
on conflict (id) do update set role = 'admin', is_active = true;
