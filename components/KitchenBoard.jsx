'use client';
// Papan pesanan dapur (realtime). layout: kanban (dashboard) | list (daftar pesanan)
import { useEffect, useState } from 'react';
import { Clock, ChefHat, Flame, BellRing, CheckCircle2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRealtimeRefresh } from '@/lib/useRealtime';
import { callStaff } from '@/lib/staffApi';
import { fmtTime, startOfDayISO, todayKey, beep } from '@/lib/utils';
import { NEXT_STATUS, ORDER_STATUS } from '@/lib/constants';
import { useToast } from './Toast';

const COLS = [
  ['menunggu_diproses', 'Menunggu diproses', BellRing, 'border-sky-400'],
  ['dimasak', 'Sedang dimasak', Flame, 'border-orange-400'],
  ['siap', 'Siap disajikan', CheckCircle2, 'border-emerald-400'],
];
const BTN = { menunggu_diproses: 'bg-gold text-espresso hover:bg-gold-light', dimasak: 'bg-orange-500 text-white hover:bg-orange-600', siap: 'bg-emerald-600 text-white hover:bg-emerald-700' };

function Card({ o, busy, onNext }) {
  const next = NEXT_STATUS[o.status];
  const mins = Math.max(0, Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000));
  return (
    <div className="card animate-fade-up overflow-hidden">
      <div className="flex items-center justify-between bg-espresso px-4 py-3 text-cream">
        <p className="font-display text-3xl font-bold text-gold">MEJA {o.table_number}</p>
        <div className="text-right text-xs"><p className="font-bold">{o.order_number}</p><p className="flex items-center justify-end gap-1 text-cream/70"><Clock className="h-3 w-3" />{fmtTime(o.created_at)} • {mins} mnt</p></div>
      </div>
      <div className="space-y-2 p-4">
        {o.payment_status !== 'lunas' && o.status !== 'selesai' && <p className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">Belum dibayar (diizinkan admin)</p>}
        <ul className="space-y-2">
          {o.order_items.map((i) => (
            <li key={i.id}>
              <p className="text-lg font-semibold leading-tight"><span className="mr-2 text-gold-dark">{i.quantity}×</span>{i.product_name}</p>
              {i.note && <p className="mt-1 rounded-lg bg-yellow-100 px-3 py-1.5 text-sm font-medium text-yellow-900">📝 {i.note}</p>}
            </li>
          ))}
        </ul>
        {next ? (
          <button disabled={busy} onClick={() => onNext(o, next[0])} className={`w-full rounded-xl py-3.5 text-base font-bold transition active:scale-95 disabled:opacity-50 ${BTN[o.status]}`}>{next[1]}</button>
        ) : <p className="pt-1 text-center text-sm font-semibold text-emerald-700">✔ Selesai</p>}
      </div>
    </div>
  );
}

export default function KitchenBoard({ layout = 'kanban' }) {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('semua');
  const [, tick] = useState(0);

  const load = async () => {
    const since = startOfDayISO(todayKey());
    const { data, error } = await sb.from('orders').select('*, order_items(*)')
      .or(`status.in.(menunggu_diproses,dimasak,siap),and(status.eq.selesai,created_at.gte.${since})`)
      .order('created_at', { ascending: true });
    if (error) toast('Gagal memuat pesanan: ' + error.message, 'error'); else setOrders(data);
  };
  useRealtimeRefresh(load, {
    onEvent: (p) => { if (p.eventType === 'UPDATE' && p.new?.status === 'menunggu_diproses') { toast(`Pesanan baru masuk: Meja ${p.new.table_number}`, 'success'); beep(); } },
  });
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);

  const onNext = async (o, status) => {
    setBusy(true);
    const r = await callStaff({ orderId: o.id, action: 'set_status', status });
    setBusy(false);
    if (!r.ok) toast(r.error, 'error'); else load();
  };

  if (!orders) return <p className="py-10 text-center text-espresso/50">Memuat pesanan…</p>;
  const done = orders.filter((o) => o.status === 'selesai');

  if (layout === 'kanban') {
    return (
      <div>
        <div className="grid gap-5 lg:grid-cols-3">
          {COLS.map(([key, label, Icon, border]) => {
            const list = orders.filter((o) => o.status === key);
            return (
              <section key={key} className={`rounded-2xl border-t-4 bg-white/50 p-3 ${border}`}>
                <h2 className="mb-3 flex items-center gap-2 px-1 font-display text-lg font-semibold"><Icon className="h-5 w-5" />{label}<span className="ml-auto rounded-full bg-espresso px-2.5 py-0.5 text-xs text-gold">{list.length}</span></h2>
                <div className="space-y-3">
                  {list.map((o) => <Card key={o.id} o={o} busy={busy} onNext={onNext} />)}
                  {!list.length && <p className="py-8 text-center text-sm text-espresso/40">Kosong</p>}
                </div>
              </section>
            );
          })}
        </div>
        <p className="mt-5 text-center text-sm text-espresso/50">Selesai hari ini: <b>{done.length}</b> pesanan</p>
      </div>
    );
  }

  const chips = [['semua', 'Semua'], ...Object.entries(ORDER_STATUS).filter(([k]) => ['menunggu_diproses', 'dimasak', 'siap', 'selesai'].includes(k)).map(([k, v]) => [k, v.label])];
  const list = orders.filter((o) => filter === 'semua' || o.status === filter);
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {chips.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === k ? 'bg-espresso text-gold' : 'bg-white text-espresso/70'}`}>{l}</button>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((o) => <Card key={o.id} o={o} busy={busy} onNext={onNext} />)}
      </div>
      {!list.length && <div className="card flex flex-col items-center gap-2 py-14 text-espresso/50"><ChefHat className="h-8 w-8" />Tidak ada pesanan.</div>}
    </div>
  );
}
