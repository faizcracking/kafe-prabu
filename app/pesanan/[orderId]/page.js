'use client';
// Tracking pesanan pelanggan. Data diambil lewat API (wajib token) dan diperbarui otomatis tiap 3 detik.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, Banknote, QrCode, XCircle, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { customerSteps, PAYMENT_METHOD } from '@/lib/constants';
import { rupiah, fmtDateTime, beep } from '@/lib/utils';
import Logo from '@/components/Logo';

const NOTIFY = {
  menunggu_diproses: 'Pembayaran dikonfirmasi. Pesanan masuk dapur.',
  dimasak: 'Pesanan Anda sedang disiapkan.',
  siap: 'Pesanan Anda siap diantar! 🎉',
  selesai: 'Pesanan selesai. Terima kasih sudah berkunjung!',
  dibatalkan: 'Pesanan dibatalkan.',
};

export default function OrderPage({ params }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const prev = useRef(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('t') || '';
    let stop = false, timer;
    const load = async () => {
      try {
        const res = await fetch(`/api/orders/${params.orderId}?token=${token}`, { cache: 'no-store' });
        const j = await res.json();
        if (stop) return;
        if (!res.ok) { setError(j.error || 'Pesanan tidak ditemukan'); return; }
        const status = j.order.status;
        if (prev.current && prev.current !== status && NOTIFY[status]) {
          toast(NOTIFY[status], status === 'dibatalkan' ? 'error' : 'success');
          beep();
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
        prev.current = status;
        setData(j);
        if (['selesai', 'dibatalkan'].includes(status)) return; // berhenti memantau
      } catch {}
      timer = setTimeout(load, 3000);
    };
    load();
    return () => { stop = true; clearTimeout(timer); };
  }, [params.orderId, toast]);

  if (error) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"><h1 className="font-display text-3xl font-semibold">{error}</h1><Link href="/menu" className="btn-dark">Ke Menu</Link></div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center text-espresso/50"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Memuat pesanan…</div>;

  const { order: o, items, settings } = data;
  const steps = customerSteps(o);
  const cancelled = o.status === 'dibatalkan';
  const waitingPay = o.payment_status === 'menunggu' && !cancelled;
  const wa = settings?.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}` : null;

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 pb-12">
      <header className="flex justify-center py-5"><Logo light={false} logoUrl={settings?.logo_url} name={settings?.name || 'KAFE PRABU'} /></header>

      <div className="rounded-3xl bg-espresso p-6 text-center text-cream shadow-xl">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Nomor Pesanan</p>
        <p className="mt-1 font-display text-3xl font-semibold tracking-wider">{o.order_number}</p>
        <p className="mt-1 text-sm text-cream/60">Meja {o.table_number} • {fmtDateTime(o.created_at)}</p>
      </div>

      {cancelled && (
        <div className="mt-4 flex gap-3 rounded-2xl bg-red-50 p-4 text-red-800"><XCircle className="h-5 w-5 shrink-0" /><div><p className="font-bold">Pesanan dibatalkan</p><p className="text-sm">{o.cancel_reason}</p></div></div>
      )}

      {waitingPay && (
        <div className="card mt-4 p-5 text-center">
          {o.payment_method === 'qris' ? (
            <>
              <QrCode className="mx-auto h-6 w-6 text-gold-dark" />
              <p className="mt-1 font-semibold">Bayar dengan QRIS</p>
              {settings?.qris_url ? <img src={settings.qris_url} alt="QRIS" className="mx-auto my-3 max-h-72 rounded-xl border border-espresso/10" /> : <p className="my-3 text-sm text-espresso/60">QRIS belum tersedia. Silakan bayar ke kasir.</p>}
              <p className="text-2xl font-bold text-gold-dark">{rupiah(o.total)}</p>
              <p className="mt-2 text-xs text-espresso/55">Setelah membayar, kasir akan memverifikasi dan mengonfirmasi pembayaran Anda. Status di bawah akan berubah otomatis.</p>
            </>
          ) : (
            <>
              <Banknote className="mx-auto h-6 w-6 text-gold-dark" />
              <p className="mt-1 font-semibold">Silakan bayar ke kasir</p>
              <p className="mt-1 text-2xl font-bold text-gold-dark">{rupiah(o.total)}</p>
              <p className="mt-2 text-xs text-espresso/55">Sebutkan nomor pesanan Anda. Pesanan diproses dapur setelah pembayaran dikonfirmasi.</p>
            </>
          )}
        </div>
      )}

      {!cancelled && (
        <div className="card mt-4 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Status Pesanan</h2>
          <ol className="space-y-0">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${s.done ? 'bg-gold text-espresso' : s.current ? 'bg-espresso text-gold ring-4 ring-gold/30' : 'bg-espresso/10 text-espresso/40'}`}>
                    {s.done ? <Check className="h-4 w-4" /> : s.current ? <Loader2 className="h-4 w-4 animate-spin" /> : i + 1}
                  </div>
                  {i < steps.length - 1 && <div className={`h-6 w-0.5 ${s.done ? 'bg-gold' : 'bg-espresso/10'}`} />}
                </div>
                <p className={`pt-1 text-sm ${s.current ? 'font-bold' : s.done ? 'font-medium' : 'text-espresso/40'}`}>{s.label}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="card mt-4 p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Ringkasan</h2>
        <ul className="space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span><b>{i.quantity}×</b> {i.product_name}{i.note && <em className="block text-xs text-espresso/50">Catatan: {i.note}</em>}</span>
              <span>{rupiah(i.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-espresso/10 pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{rupiah(o.subtotal)}</span></div>
          {o.tax > 0 && <div className="flex justify-between"><span>Pajak</span><span>{rupiah(o.tax)}</span></div>}
          {o.service_fee > 0 && <div className="flex justify-between"><span>Biaya layanan</span><span>{rupiah(o.service_fee)}</span></div>}
          <div className="flex justify-between pt-1 text-lg font-bold"><span>Total</span><span className="text-gold-dark">{rupiah(o.total)}</span></div>
          <p className="text-xs text-espresso/50">{PAYMENT_METHOD[o.payment_method]} • {o.payment_status === 'lunas' ? 'LUNAS' : cancelled ? 'Dibatalkan' : 'Belum dibayar'}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href={`/meja/${o.table_number}`} className="btn-dark">Pesan Lagi</Link>
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost"><MessageCircle className="h-4 w-4" />Hubungi Kafe</a>}
      </div>
    </div>
  );
}
