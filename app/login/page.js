'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { ROLE_HOME } from '@/lib/constants';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const sb = supabaseBrowser();
    const { data, error: err } = await sb.auth.signInWithPassword({ email, password });
    if (err) { setError('Email atau password salah'); setBusy(false); return; }
    const { data: profile } = await sb.from('profiles').select('role,is_active').eq('id', data.user.id).maybeSingle();
    if (!profile || !profile.is_active) {
      await sb.auth.signOut();
      setError('Akun belum aktif atau belum memiliki role. Hubungi admin.');
      setBusy(false); return;
    }
    const next = new URLSearchParams(window.location.search).get('next');
    const home = ROLE_HOME[profile.role];
    // ikuti ?next= hanya untuk path internal; middleware tetap memeriksa hak akses
    const ok = next && next.startsWith('/') && !next.startsWith('//');
    router.replace(ok ? next : home);
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-espresso p-4">
      <form onSubmit={submit} className="card w-full max-w-sm animate-fade-up space-y-4 p-7">
        <div className="flex justify-center"><Logo light={false} /></div>
        <p className="text-center text-sm text-espresso/60">Login khusus staf: kasir, dapur, dan admin</p>
        <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div><label className="label">Password</label><input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn-dark w-full py-3" disabled={busy}><LogIn className="h-4 w-4" />{busy ? 'Memproses…' : 'Masuk'}</button>
      </form>
    </main>
  );
}
