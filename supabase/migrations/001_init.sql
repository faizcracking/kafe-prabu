-- =====================================================================
-- KAFE PRABU - Migrasi database lengkap
-- Jalankan SEKALI di Supabase: SQL Editor > New query > paste > Run
-- =====================================================================
create extension if not exists pgcrypto;

-- Fungsi otomatis mengisi kolom updated_at
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- ROLES ----------
create table public.roles (
  code text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
insert into public.roles (code, name, description) values
  ('admin', 'Admin IT', 'Akses penuh ke seluruh sistem'),
  ('kasir', 'Kasir', 'Mengelola pesanan masuk dan konfirmasi pembayaran'),
  ('dapur', 'Dapur', 'Memproses pesanan yang sudah dibayar')
on conflict (code) do nothing;

-- ---------- PROFILES (1 baris per akun Supabase Auth; password TIDAK disimpan di sini) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null references public.roles (code),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- MEJA ----------
create table public.tables (
  id bigint generated always as identity primary key,
  number int not null unique check (number > 0),
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- KATEGORI & PRODUK ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete restrict,
  name text not null,
  description text,
  price int not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);

-- ---------- PENGATURAN KAFE (selalu hanya 1 baris, id = 1) ----------
create table public.cafe_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'KAFE PRABU',
  logo_url text,
  address text,
  whatsapp text,
  qris_url text,
  tax_percent numeric(5,2) not null default 10 check (tax_percent between 0 and 100),
  service_percent numeric(5,2) not null default 5 check (service_percent between 0 and 100),
  updated_at timestamptz not null default now()
);
insert into public.cafe_settings (id) values (1) on conflict (id) do nothing;

-- ---------- PESANAN ----------
create sequence public.order_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  token uuid not null default gen_random_uuid(),          -- kunci rahasia pelanggan untuk melacak pesanan
  idempotency_key text unique,                             -- mencegah pesanan ganda akibat klik berulang
  table_id bigint references public.tables (id) on delete set null,
  table_number int not null,
  customer_name text,
  status text not null default 'baru'
    check (status in ('baru','menunggu_diproses','dimasak','siap','selesai','dibatalkan')),
  payment_method text not null check (payment_method in ('tunai','qris')),
  payment_status text not null default 'menunggu'
    check (payment_status in ('menunggu','lunas','dibatalkan')),
  subtotal int not null default 0,
  tax int not null default 0,
  service_fee int not null default 0,
  total int not null default 0,
  allow_kitchen_override boolean not null default false,  -- izin admin: masuk dapur sebelum bayar
  cancel_reason text,
  cancelled_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_payment_status_idx on public.orders (payment_status);

create or replace function public.set_order_number() returns trigger
language plpgsql as $$
begin
  if new.order_number is null then
    new.order_number := 'PRB-' || to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD') || '-'
                        || lpad(nextval('public.order_number_seq')::text, 4, '0');
  end if;
  return new;
end $$;
create trigger orders_set_number before insert on public.orders
  for each row execute function public.set_order_number();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,            -- salinan nama & harga saat dipesan
  unit_price int not null,
  quantity int not null check (quantity > 0),
  note text,
  subtotal int not null,
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  method text not null check (method in ('tunai','qris')),
  amount int not null,
  status text not null default 'menunggu' check (status in ('menunggu','lunas','dibatalkan')),
  confirmed_by uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger updated_at
create trigger t_profiles_u before update on public.profiles for each row execute function public.set_updated_at();
create trigger t_tables_u before update on public.tables for each row execute function public.set_updated_at();
create trigger t_categories_u before update on public.categories for each row execute function public.set_updated_at();
create trigger t_products_u before update on public.products for each row execute function public.set_updated_at();
create trigger t_settings_u before update on public.cafe_settings for each row execute function public.set_updated_at();
create trigger t_orders_u before update on public.orders for each row execute function public.set_updated_at();
create trigger t_payments_u before update on public.payments for each row execute function public.set_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY
-- Catatan: pelanggan TIDAK membaca/menulis tabel orders langsung.
-- Pesanan dibuat & dilacak lewat API server (service role) yang memvalidasi harga dan token.
-- =====================================================================
create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;
grant execute on function public.app_role() to anon, authenticated;

alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.tables enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.cafe_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;

-- Roles & profiles
create policy roles_read on public.roles for select to authenticated using (true);
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.app_role() = 'admin');
create policy profiles_admin_write on public.profiles for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- Data publik (dibaca pelanggan tanpa login): meja, kategori, produk, pengaturan
create policy tables_read on public.tables for select to anon, authenticated using (true);
create policy tables_admin on public.tables for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy categories_admin on public.categories for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
create policy products_read on public.products for select to anon, authenticated using (true);
create policy products_admin on public.products for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
create policy settings_read on public.cafe_settings for select to anon, authenticated using (true);
create policy settings_admin on public.cafe_settings for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- Pesanan: admin & kasir melihat semua; dapur hanya pesanan yang sudah masuk antrean produksi
create policy orders_staff_read on public.orders for select to authenticated using (
  public.app_role() in ('admin','kasir')
  or (public.app_role() = 'dapur' and status in ('menunggu_diproses','dimasak','siap','selesai'))
);
create policy order_items_staff_read on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_items.order_id)  -- ikut aturan RLS orders
);
create policy payments_staff_read on public.payments for select to authenticated
  using (public.app_role() in ('admin','kasir'));
-- Semua perubahan pesanan (insert/update) dilakukan lewat API server, jadi tidak ada policy tulis untuk klien.

-- =====================================================================
-- STORAGE (foto menu, logo, gambar QRIS)
-- =====================================================================
insert into storage.buckets (id, name, public) values ('cafe-assets', 'cafe-assets', true)
on conflict (id) do nothing;
create policy cafe_assets_read on storage.objects for select using (bucket_id = 'cafe-assets');
create policy cafe_assets_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'cafe-assets' and public.app_role() = 'admin')
  with check (bucket_id = 'cafe-assets' and public.app_role() = 'admin');

-- =====================================================================
-- REALTIME
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['orders','order_items','products'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
