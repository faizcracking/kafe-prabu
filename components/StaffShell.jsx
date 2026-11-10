'use client';
// Kerangka dashboard staf: sidebar (desktop) + drawer (mobile) + tombol keluar.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Tags, QrCode, Users, BarChart3, Settings, Wallet, History, ChefHat, LogOut, Menu as MenuIcon, X, ArrowLeft } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { ROLE_LABEL } from '@/lib/constants';
import Logo from './Logo';

const NAVS = {
  admin: [
    ['/admin/dashboard', 'Dashboard', LayoutDashboard], ['/admin/pesanan', 'Pesanan', ClipboardList],
    ['/admin/menu', 'Menu', UtensilsCrossed], ['/admin/kategori', 'Kategori', Tags], ['/admin/meja', 'Meja & QR', QrCode],
    ['/admin/pengguna', 'Pengguna', Users], ['/admin/laporan', 'Laporan', BarChart3], ['/admin/pengaturan', 'Pengaturan', Settings],
    ['/kasir/dashboard', 'Tampilan Kasir', Wallet], ['/dapur/dashboard', 'Tampilan Dapur', ChefHat],
  ],
  kasir: [
    ['/kasir/dashboard', 'Dashboard', LayoutDashboard], ['/kasir/pesanan', 'Pesanan Masuk', ClipboardList],
    ['/kasir/transaksi', 'Pembayaran', Wallet], ['/kasir/riwayat', 'Riwayat', History],
  ],
  dapur: [['/dapur/dashboard', 'Dashboard', ChefHat], ['/dapur/pesanan', 'Daftar Pesanan', ClipboardList]],
};

export default function StaffShell({ role, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState({ name: '', role: role });

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data } = await sb.from('profiles').select('full_name,role').eq('id', user.id).maybeSingle();
      if (data) setMe({ name: data.full_name, role: data.role });
    })();
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const logout = async () => { await supabaseBrowser().auth.signOut(); router.replace('/login'); router.refresh(); };
  const items = NAVS[role];

  const Sidebar = (
    <div className="flex h-full flex-col bg-espresso p-4 text-cream">
      <div className="mb-6 mt-1 px-2"><Logo /></div>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-cream/40">{ROLE_LABEL[role]}</p>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {me.role === 'admin' && role !== 'admin' && (
          <Link href="/admin/dashboard" className="mb-2 flex items-center gap-3 rounded-xl border border-gold/40 px-3 py-2.5 text-sm font-semibold text-gold hover:bg-gold/10"><ArrowLeft className="h-4 w-4" />Kembali ke Admin</Link>
        )}
        {items.map(([href, label, Icon]) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-gold text-espresso shadow-lg shadow-gold/20' : 'text-cream/75 hover:bg-white/10 hover:text-cream'}`}>
              <Icon className="h-4 w-4" />{label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="truncate px-2 text-sm font-semibold">{me.name || 'Pengguna'}</p>
        <p className="mb-3 px-2 text-xs text-cream/50">{ROLE_LABEL[me.role]}</p>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-cream/75 hover:bg-white/10"><LogOut className="h-4 w-4" />Keluar</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{Sidebar}</aside>
      <header className="no-print sticky top-0 z-30 flex items-center justify-between bg-espresso px-4 py-3 lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-cream" aria-label="Menu"><MenuIcon className="h-6 w-6" /></button>
      </header>
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative h-full w-72 animate-fade-up">{Sidebar}
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 text-cream" aria-label="Tutup"><X className="h-5 w-5" /></button>
          </div>
        </div>
      )}
      <main className="lg:pl-64"><div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div></main>
    </div>
  );
}
