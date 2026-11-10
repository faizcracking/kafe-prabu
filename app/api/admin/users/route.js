// Manajemen akun staf (khusus admin). Memakai Supabase Auth Admin API; password tidak pernah disimpan manual.
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const ROLES = ['admin', 'kasir', 'dapur'];
const fail = (error, status = 400) => NextResponse.json({ error }, { status });

export async function GET() {
  const auth = await requireRole(['admin']);
  if (auth.error) return fail(auth.error, auth.status);
  const db = supabaseAdmin();
  const [{ data: profiles }, { data: list }] = await Promise.all([
    db.from('profiles').select('id,full_name,role,is_active,created_at').order('created_at'),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const emails = new Map((list?.users || []).map((u) => [u.id, u.email]));
  return NextResponse.json({ users: (profiles || []).map((p) => ({ ...p, email: emails.get(p.id) || '-' })), me: auth.user.id });
}

export async function POST(req) {
  const auth = await requireRole(['admin']);
  if (auth.error) return fail(auth.error, auth.status);
  const { email, password, full_name, role } = await req.json().catch(() => ({}));
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return fail('Email tidak valid');
  if (!password || password.length < 8) return fail('Password minimal 8 karakter');
  if (!ROLES.includes(role)) return fail('Role tidak valid');
  if (!String(full_name || '').trim()) return fail('Nama wajib diisi');

  const db = supabaseAdmin();
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) return fail(error.message.includes('already') ? 'Email sudah terdaftar' : error.message);
  const { error: pErr } = await db.from('profiles').insert({ id: data.user.id, full_name: full_name.trim(), role, is_active: true });
  if (pErr) { await db.auth.admin.deleteUser(data.user.id); return fail('Gagal membuat profil: ' + pErr.message, 500); }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req) {
  const auth = await requireRole(['admin']);
  if (auth.error) return fail(auth.error, auth.status);
  const { id, full_name, role, is_active, password } = await req.json().catch(() => ({}));
  if (!id) return fail('ID wajib diisi');
  if (id === auth.user.id && (role && role !== 'admin' || is_active === false)) return fail('Anda tidak dapat menonaktifkan atau menurunkan role akun sendiri');

  const db = supabaseAdmin();
  const upd = {};
  if (typeof full_name === 'string' && full_name.trim()) upd.full_name = full_name.trim();
  if (role) { if (!ROLES.includes(role)) return fail('Role tidak valid'); upd.role = role; }
  if (typeof is_active === 'boolean') upd.is_active = is_active;
  if (Object.keys(upd).length) {
    const { error } = await db.from('profiles').update(upd).eq('id', id);
    if (error) return fail(error.message, 500);
  }
  const authUpd = {};
  if (password) { if (password.length < 8) return fail('Password minimal 8 karakter'); authUpd.password = password; }
  if (typeof is_active === 'boolean') authUpd.ban_duration = is_active ? 'none' : '876000h';
  if (Object.keys(authUpd).length) {
    const { error } = await db.auth.admin.updateUserById(id, authUpd);
    if (error) return fail(error.message, 500);
  }
  return NextResponse.json({ ok: true });
}
