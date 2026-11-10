-- =====================================================================
-- DATA AWAL (SEED) - terpisah dari migrasi. Jalankan SETELAH 001_init.sql.
-- Aman dijalankan ulang (tidak membuat data ganda). Boleh diubah/dihapus dari dashboard admin.
-- =====================================================================

-- 25 meja
insert into public.tables (number, label)
select n, 'Meja ' || n from generate_series(1, 25) as n
on conflict (number) do nothing;

-- Kategori
insert into public.categories (name, sort_order) values
  ('Kopi', 1), ('Non-Kopi', 2), ('Makanan Berat', 3), ('Camilan', 4), ('Dessert', 5)
on conflict (name) do nothing;

-- Produk contoh (hanya diisi kalau tabel products masih kosong). Foto diunggah lewat Admin > Menu.
insert into public.products (category_id, name, description, price)
select c.id, v.name, v.descr, v.price
from (values
  ('Kopi', 'Espresso', 'Double shot espresso dengan crema pekat.', 22000),
  ('Kopi', 'Americano', 'Espresso dengan air panas, bersih dan tegas.', 25000),
  ('Kopi', 'Caffe Latte', 'Espresso dengan susu steamed yang lembut.', 30000),
  ('Kopi', 'Cappuccino', 'Espresso, susu, dan foam tebal.', 30000),
  ('Kopi', 'Kopi Susu Prabu', 'Signature: kopi susu gula aren khas Kafe Prabu.', 28000),
  ('Non-Kopi', 'Matcha Latte', 'Matcha premium dengan susu segar.', 32000),
  ('Non-Kopi', 'Chocolate Signature', 'Cokelat pekat dengan topping krim.', 30000),
  ('Non-Kopi', 'Lemon Tea', 'Teh segar dengan perasan lemon.', 20000),
  ('Makanan Berat', 'Nasi Goreng Prabu', 'Nasi goreng spesial dengan telur dan ayam suwir.', 38000),
  ('Makanan Berat', 'Mie Goreng Spesial', 'Mie goreng bumbu rempah, telur, dan sayuran.', 35000),
  ('Makanan Berat', 'Chicken Katsu Rice', 'Ayam katsu renyah dengan saus dan nasi hangat.', 42000),
  ('Camilan', 'French Fries', 'Kentang goreng renyah dengan saus pilihan.', 22000),
  ('Camilan', 'Pisang Goreng Keju', 'Pisang goreng dengan keju dan susu kental.', 20000),
  ('Dessert', 'Tiramisu Cake', 'Kue tiramisu lembut dengan taburan kakao.', 38000),
  ('Dessert', 'Croissant Butter', 'Croissant butter panggang hangat.', 25000)
) as v(cat, name, descr, price)
join public.categories c on c.name = v.cat
where not exists (select 1 from public.products);
