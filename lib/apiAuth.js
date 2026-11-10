// Memeriksa siapa yang memanggil API dan apakah role-nya diizinkan.
import { supabaseServer } from '@/lib/supabase/server';

export async function requireRole(allowed) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Silakan login terlebih dahulu', status: 401 };
  const { data: profile } = await sb.from('profiles').select('role,is_active,full_name').eq('id', user.id).maybeSingle();
  if (!profile || !profile.is_active || !allowed.includes(profile.role)) return { error: 'Anda tidak punya akses', status: 403 };
  return { user, profile };
}
