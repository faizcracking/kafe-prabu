'use client';
// Halaman tujuan QR Code meja. Memvalidasi nomor meja lalu menampilkan menu.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useCart } from '@/lib/cart';
import MenuView from '@/components/MenuView';

export default function MejaPage({ params }) {
  const nomor = parseInt(params.nomor, 10);
  const { setTable, ready } = useCart();
  const [state, setState] = useState('loading'); // loading | ok | notfound

  useEffect(() => {
    if (!ready) return;
    (async () => {
      if (!Number.isInteger(nomor)) return setState('notfound');
      const { data } = await supabaseBrowser().from('tables').select('number').eq('number', nomor).eq('is_active', true).maybeSingle();
      if (!data) return setState('notfound');
      setTable(nomor);
      setState('ok');
    })();
  }, [ready, nomor, setTable]);

  if (state === 'loading') return <div className="flex min-h-screen items-center justify-center text-espresso/50">Memuat meja…</div>;
  if (state === 'notfound') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-display text-3xl font-semibold">Meja tidak ditemukan</h1>
        <p className="text-espresso/60">QR Code ini tidak valid. Silakan hubungi pelayan kami.</p>
        <Link href="/menu" className="btn-dark">Lihat Menu</Link>
      </div>
    );
  }
  return <MenuView />;
}
