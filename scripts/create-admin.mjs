// Membuat akun ADMIN pertama. Jalankan: npm run create-admin  (butuh Node 20.6+)
// Membaca ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME dari .env.local
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || 'Admin Prabu';

if (!url || !key || !email || !password) {
  console.error('Lengkapi NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD di .env.local');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

let userId;
const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  // Kalau email sudah terdaftar, pakai user yang ada
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const found = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!found) { console.error('Gagal membuat user:', error.message); process.exit(1); }
  userId = found.id;
  console.log('User sudah ada, akan dijadikan admin.');
} else {
  userId = created.user.id;
}
const { error: pErr } = await db.from('profiles').upsert({ id: userId, full_name: name, role: 'admin', is_active: true });
if (pErr) { console.error('Gagal membuat profil (sudah menjalankan 001_init.sql?):', pErr.message); process.exit(1); }
console.log(`Admin siap. Login di /login dengan email: ${email}`);
