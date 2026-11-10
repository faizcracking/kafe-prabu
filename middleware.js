// Proteksi halaman berdasarkan role. Dijalankan sebelum halaman /admin, /kasir, /dapur, /struk dibuka.
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { ROLE_HOME } from '@/lib/constants';

const RULES = [
  ['/admin', ['admin']],
  ['/kasir', ['kasir', 'admin']],
  ['/dapur', ['dapur', 'admin']],
  ['/struk', ['kasir', 'admin']],
];

export async function middleware(request) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const rule = RULES.find(([p]) => path === p || path.startsWith(p + '/'));
  if (!rule) return response;

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const go = (to, search = '') => {
    const u = request.nextUrl.clone();
    u.pathname = to; u.search = search;
    return NextResponse.redirect(u);
  };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return go('/login', '?next=' + encodeURIComponent(path));

  const { data: profile } = await supabase.from('profiles').select('role,is_active').eq('id', user.id).maybeSingle();
  if (!profile || !profile.is_active) return go('/login', '?error=akses');
  if (!rule[1].includes(profile.role)) return go(ROLE_HOME[profile.role] || '/login');
  return response;
}

export const config = { matcher: ['/admin/:path*', '/kasir/:path*', '/dapur/:path*', '/struk/:path*'] };
