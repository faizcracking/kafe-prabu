'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, Trash2, Banknote, QrCode, Check, ShoppingBag } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useCart } from '@/lib/cart';
import { useToast } from '@/components/Toast';
import { rupiah } from '@/lib/utils';
import Thumb from '@/components/Thumb';

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useToast();
  const { ready, items, table, subtotal, setQty, setNote, clear } = useCart();
  const [settings, setSettings] = useState({ tax_percent: 0, service_percent: 0 });
  const [method, setMethod] = useState('tunai');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const keyRef = useRef(null);

  useEffect(() => {
    // kunci unik per checkout => mencegah pesanan ganda (fallback untuk HTTP non-secure saat tes di jaringan lokal)
    keyRef.current = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    supabaseBrowser().from('cafe_settings').select('tax_percent,service_percent').eq('id', 1).maybeSingle()
      .then(({ data }) => data && setSettings(data));
  }, []);

  const tax = Math.round((subtotal * Number(settings.tax_percent)) / 100);
  const service = Math.round((subtotal * Number(settings.service_percent)) / 100);
  const total = subtotal + tax + service;
  const back = table ? `/meja/${table}` : '/menu';

  const submit = async () => {
    if (busy || !items.length || !table) return;
    setBusy(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table, paymentMethod: method, customerName: name, idempotencyKey: keyRef.current,
          items: items.map((i) => ({ productId: i.productId, quantity: i.qty, note: i.note })),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Gagal membuat pesanan');
      localStorage.setItem('kafe-prabu-last-order', JSON.stringify({ id: j.orderId, token: j.token }));
      clear();
      router.push(`/pesanan/${j.orderId}?t=${j.token}`);
    } catch (e) {
      toast(e.message, 'error');
      setBusy(false);
    }
  };

  if (!ready) return null;
  if (!items.length || !table) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <ShoppingBag className="h-12 w-12 text-gold-dark" />
        <h1 className="font-display text-3xl font-semibold">Keranjang kosong</h1>
        <p className="text-espresso/60">{table ? 'Yuk pilih menu favorit Anda.' : 'Scan QR Code di meja Anda untuk memesan.'}</p>
        <Link href={back} className="btn-dark">Kembali ke Menu</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 pb-10">
      <header className="flex items-center gap-3 py-5">
        <Link href={back} className="rounded-full bg-white p-2 shadow-soft" aria-label="Kembali"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-display text-2xl font-semibold">Keranjang</h1>
        <span className="ml-auto rounded-full bg-gold px-3 py-1.5 text-xs font-bold">MEJA {table}</span>
      </header>

      <div className="space-y-3">
        {items.map((i) => (
          <div key={i.key} className="card flex gap-3 p-3">
            <div className="group h-20 w-20 shrink-0 overflow-hidden rounded-xl"><Thumb src={i.image_url} name={i.name} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2">
                <h3 className="font-semibold">{i.name}</h3>
                <button onClick={() => setQty(i.key, 0)} className="text-red-500" aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>
              </div>
              <p className="text-sm font-bold text-gold-dark">{rupiah(i.price)}</p>
              <input className="input mt-1.5 !py-1.5 text-xs" placeholder="Catatan (opsional)" maxLength={200} value={i.note} onChange={(e) => setNote(i.key, e.target.value)} />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center rounded-lg border border-espresso/15">
                  <button className="p-2" onClick={() => setQty(i.key, i.qty - 1)} aria-label="Kurangi"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="w-7 text-center text-sm font-bold">{i.qty}</span>
                  <button className="p-2" onClick={() => setQty(i.key, i.qty + 1)} aria-label="Tambah"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                <span className="font-semibold">{rupiah(i.price * i.qty)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-5 p-4">
        <label className="label">Nama (opsional)</label>
        <input className="input" placeholder="Agar mudah dipanggil" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="mt-5">
        <h2 className="mb-2 font-display text-lg font-semibold">Metode Pembayaran</h2>
        <div className="grid grid-cols-2 gap-3">
          {[['tunai', 'Tunai', 'Bayar ke kasir', Banknote], ['qris', 'QRIS', 'Scan & bayar', QrCode]].map(([id, label, sub, Icon]) => (
            <button key={id} onClick={() => setMethod(id)} className={`relative rounded-2xl border-2 p-4 text-left transition ${method === id ? 'border-gold bg-espresso text-cream shadow-lg' : 'border-transparent bg-white shadow-soft'}`}>
              {method === id && <Check className="absolute right-3 top-3 h-4 w-4 text-gold" />}
              <Icon className={`mb-2 h-6 w-6 ${method === id ? 'text-gold' : 'text-coffee'}`} />
              <p className="font-bold">{label}</p><p className={`text-xs ${method === id ? 'text-cream/60' : 'text-espresso/50'}`}>{sub}</p>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-espresso/55">{method === 'tunai' ? 'Bayar langsung ke kasir; kasir akan mengonfirmasi pembayaran Anda.' : 'QRIS kafe ditampilkan setelah pesan. Kasir memverifikasi pembayaran secara manual.'}</p>
      </div>

      <div className="card mt-5 space-y-2 p-4 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{rupiah(subtotal)}</span></div>
        {tax > 0 && <div className="flex justify-between"><span>Pajak ({Number(settings.tax_percent)}%)</span><span>{rupiah(tax)}</span></div>}
        {service > 0 && <div className="flex justify-between"><span>Biaya layanan ({Number(settings.service_percent)}%)</span><span>{rupiah(service)}</span></div>}
        <div className="flex justify-between border-t border-espresso/10 pt-2 text-lg font-bold"><span>Total</span><span className="text-gold-dark">{rupiah(total)}</span></div>
      </div>

      <button onClick={submit} disabled={busy} className="btn-gold mt-5 w-full py-4 text-base">{busy ? 'Memproses pesanan…' : `Pesan Sekarang • ${rupiah(total)}`}</button>
      <p className="mt-2 text-center text-xs text-espresso/50">Total akhir dihitung ulang oleh sistem berdasarkan harga terbaru.</p>
    </div>
  );
}
