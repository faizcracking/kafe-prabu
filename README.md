# KAFE PRABU — Dine-in QR Ordering System

Next.js 14 (App Router) + Supabase (Postgres, Auth, Realtime, Storage) + Tailwind CSS + Lucide, siap deploy ke Vercel.

**Alur:** Pelanggan scan QR meja → pilih menu → checkout (Tunai/QRIS) → data masuk Supabase → kasir konfirmasi pembayaran → dapur memproses → pelanggan melihat status → selesai.

---

## 1. Persiapan di Supabase (sekali saja)

1. Buat project di https://supabase.com (region terdekat, mis. Singapore).
2. Buka **SQL Editor → New query**, lalu jalankan **berurutan**:
   1. isi `supabase/migrations/001_init.sql` (struktur tabel, RLS, storage, realtime)
   2. isi `supabase/seed.sql` (25 meja, kategori & 15 menu contoh — terpisah dari migrasi)
3. **Authentication → Providers → Email**: matikan **"Allow new users to sign up"** (akun staf hanya dibuat admin). 
4. Salin kunci dari **Project Settings → API**: `Project URL`, `anon public key`, `service_role key`.

## 2. Jalankan lokal di VS Code

Butuh **Node.js 20.6 atau lebih baru**.

```bash
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
```

Isi `.env.local`:

| Variabel | Isi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key — **rahasia**, jangan diberi awalan `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` (nanti ganti ke domain Vercel) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | data admin pertama |

Buat admin pertama lalu jalankan:

```bash
npm run create-admin
npm run dev
```

Buka http://localhost:3000 → login staf di `/login`. Dari dashboard **Admin → Pengguna** buat akun Kasir dan Dapur.
(Alternatif tanpa script: lihat `supabase/make_admin.sql`.)

## 3. Deploy ke Vercel

> **Penting:** Vercel **tidak menerima upload file ZIP** langsung. Pilih salah satu:

**A. Lewat GitHub (paling mudah)**
1. Ekstrak ZIP, buka folder di VS Code, push ke repository GitHub baru (`.env.local` otomatis tidak ikut karena ada di `.gitignore`).
2. https://vercel.com/new → Import repository tersebut (Framework: Next.js terdeteksi otomatis).
3. Di **Environment Variables** isi 4 variabel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (= domain Vercel Anda, mis. `https://kafe-prabu.vercel.app`).
4. Deploy.

**B. Lewat Vercel CLI**: di folder project jalankan `npx vercel`, lalu `npx vercel --prod`; tambahkan env var lewat dashboard Vercel.

Setelah domain final diketahui: set `NEXT_PUBLIC_SITE_URL` → **Redeploy** → baru cetak QR dari **Admin → Meja & QR**.

## 4. Halaman

| Area | Halaman |
|---|---|
| Publik | `/`, `/menu`, `/meja/[nomor]`, `/checkout`, `/pesanan/[order_id]` |
| Auth | `/login` |
| Admin | `/admin/dashboard, menu, kategori, meja, pesanan, pengguna, laporan, pengaturan` |
| Kasir | `/kasir/dashboard, pesanan, transaksi, riwayat` |
| Dapur | `/dapur/dashboard, pesanan` |
| Struk (kasir/admin) | `/struk/[id]` |

## 5. Cara kerja & keamanan

- **Satu database Supabase** untuk semua dashboard; staf mendapat update lewat **Supabase Realtime** (tanpa refresh).
- **Pelanggan tanpa akun**: pesanan dibuat lewat `POST /api/orders` (server). Harga & total **dihitung ulang di server** dari database; ketersediaan menu diperiksa; kunci idempotensi mencegah pesanan ganda akibat klik berulang.
- Pelanggan melacak pesanan dengan **token rahasia** di URL (`/pesanan/<id>?t=<token>`). Tabel `orders` tidak bisa dibaca anonim (RLS).
- Tracking pelanggan di-refresh otomatis tiap 3 detik lewat API (bukan koneksi Realtime langsung), supaya tabel pesanan tidak perlu dibuka untuk publik. Dashboard staf memakai Realtime sungguhan.
- **Role**: middleware memproteksi halaman, API memeriksa role, RLS membatasi data. Dapur hanya melihat pesanan yang sudah masuk antrean (setelah bayar dikonfirmasi, atau diizinkan admin lewat tombol "Izinkan ke dapur").
- `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di `app/api/*` dan `lib/supabase/admin.js` (server). Password dikelola Supabase Auth.
- **QRIS bukan otomatis.** Sistem menampilkan gambar QRIS kafe (unggah di Admin → Pengaturan); kasir memeriksa dana masuk lalu menekan KONFIRMASI PEMBAYARAN. Untuk QRIS otomatis perlu payment gateway (mis. Midtrans/Xendit) — belum ada di project ini.
- Alur status: `baru` → (bayar dikonfirmasi) `menunggu_diproses` → `dimasak` → `siap` → `selesai`; atau `dibatalkan` (wajib alasan).
- Foto menu belum ada di data awal; unggah lewat **Admin → Menu**.

## 6. Checklist uji alur (lakukan sebelum dipakai)

1. Admin login → Pengaturan: isi nama, WhatsApp, unggah QRIS, atur pajak/layanan.
2. Admin → Pengguna: buat 1 kasir & 1 dapur. Admin → Menu: unggah foto beberapa menu.
3. Buka `/meja/1` di HP/tab lain → tambah menu + catatan → checkout **Tunai** → muncul halaman tracking.
4. Kasir login (browser lain): pesanan muncul + bunyi notifikasi → tekan **KONFIRMASI PEMBAYARAN** → status LUNAS.
5. Dapur login: pesanan muncul → Mulai masak → Siap disajikan → Selesai. Halaman pelanggan ikut berubah.
6. Ulangi dengan **QRIS** (QR tampil di halaman pelanggan). Coba **Batalkan** dengan alasan; coba klik "Pesan" berkali-kali (hanya 1 pesanan terbuat).
7. Admin: tandai menu "Habis" → langsung tampil habis di halaman pelanggan; cek Laporan + Export PDF/Excel; Meja & QR → download/cetak, scan QR memang membuka `/meja/N`.
8. Cek proteksi: kasir membuka `/admin/dashboard` → dialihkan ke dashboard kasir.

## 7. Struktur folder

```
app/            halaman & API (Next.js App Router)
  api/orders         buat pesanan & tracking pelanggan
  api/staff/orders   aksi kasir/dapur/admin
  api/admin/users    kelola akun staf
components/     komponen UI (OrderList, KitchenBoard, MenuView, StaffShell, ...)
lib/            klien Supabase, keranjang, statistik, konstanta, util
supabase/       migrations/001_init.sql, seed.sql, make_admin.sql
scripts/        create-admin.mjs
middleware.js   proteksi role
```
