'use client';
// Struk pesanan (kasir/admin). Klik "Cetak / Simpan PDF" lalu pilih printer atau "Save as PDF".
import { useEffect, useState } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { rupiah, fmtDateTime } from '@/lib/utils';
import { PAYMENT_METHOD } from '@/lib/constants';

export default function Struk({ params }) {
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const [o, s] = await Promise.all([
        sb.from('orders').select('*, order_items(*)').eq('id', params.id).maybeSingle(),
        sb.from('cafe_settings').select('*').eq('id', 1).maybeSingle(),
      ]);
      if (!o.data) setError('Pesanan tidak ditemukan'); else setOrder(o.data);
      setSettings(s.data);
    })();
  }, [params.id]);

  if (error) return <p className="p-8 text-center">{error}</p>;
  if (!order) return <p className="p-8 text-center text-espresso/50">Memuat struk…</p>;

  return (
    <div className="min-h-screen bg-neutral-200 p-4 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[340px] gap-2">
        <button onClick={() => window.print()} className="btn-gold flex-1"><Printer className="h-4 w-4" />Cetak / Simpan PDF</button>
        <button onClick={() => (window.history.length > 1 ? window.history.back() : window.close())} className="btn-ghost"><ArrowLeft className="h-4 w-4" /></button>
      </div>
      <div className="mx-auto max-w-[340px] bg-white p-5 font-mono text-[12px] leading-relaxed shadow-lg print:shadow-none">
        <div className="text-center">
          <p className="text-base font-bold tracking-widest">{settings?.name || 'KAFE PRABU'}</p>
          {settings?.address && <p>{settings.address}</p>}
          {settings?.whatsapp && <p>WA: {settings.whatsapp}</p>}
        </div>
        <hr className="my-2 border-dashed border-black" />
        <p>No : {order.order_number}</p>
        <p>Meja : {order.table_number}</p>
        <p>Waktu : {fmtDateTime(order.created_at)}</p>
        {order.customer_name && <p>Nama : {order.customer_name}</p>}
        <hr className="my-2 border-dashed border-black" />
        {order.order_items.map((i) => (
          <div key={i.id} className="mb-1">
            <p>{i.product_name}</p>
            <div className="flex justify-between"><span>{i.quantity} x {rupiah(i.unit_price)}</span><span>{rupiah(i.subtotal)}</span></div>
            {i.note && <p className="italic">* {i.note}</p>}
          </div>
        ))}
        <hr className="my-2 border-dashed border-black" />
        <div className="flex justify-between"><span>Subtotal</span><span>{rupiah(order.subtotal)}</span></div>
        {order.tax > 0 && <div className="flex justify-between"><span>Pajak</span><span>{rupiah(order.tax)}</span></div>}
        {order.service_fee > 0 && <div className="flex justify-between"><span>Layanan</span><span>{rupiah(order.service_fee)}</span></div>}
        <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{rupiah(order.total)}</span></div>
        <p className="mt-1">Bayar : {PAYMENT_METHOD[order.payment_method]} — {order.payment_status === 'lunas' ? 'LUNAS' : order.payment_status.toUpperCase()}</p>
        <hr className="my-2 border-dashed border-black" />
        <p className="text-center">Terima kasih atas kunjungan Anda!</p>
      </div>
    </div>
  );
}
