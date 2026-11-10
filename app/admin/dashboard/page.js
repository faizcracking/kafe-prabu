'use client';
import { useState } from 'react';
import { Wallet, Receipt, ClipboardList, CalendarRange, CalendarDays, Trophy } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRealtimeRefresh } from '@/lib/useRealtime';
import { fetchOrdersRange, sum, dailyTotals, topProducts } from '@/lib/stats';
import { todayKey, addDays, wibKey, rupiah } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import BarChart from '@/components/BarChart';

export default function AdminDashboard() {
  const sb = supabaseBrowser();
  const [d, setD] = useState(null);
  const [days, setDays] = useState(7);

  const load = async () => {
    const today = todayKey();
    const monthStart = today.slice(0, 8) + '01';
    const from = [addDays(today, -29), monthStart].sort()[0];
    const all = await fetchOrdersRange(sb, from, today, { items: true, paidOnly: false });
    const paid = all.filter((o) => o.payment_status === 'lunas');
    const todayPaid = paid.filter((o) => wibKey(o.created_at) === today);
    setD({
      paid, today,
      todaySales: sum(todayPaid, (o) => o.total),
      todayTrx: todayPaid.length,
      todayOrders: all.filter((o) => wibKey(o.created_at) === today && o.status !== 'dibatalkan').length,
      week: sum(paid.filter((o) => wibKey(o.created_at) >= addDays(today, -6)), (o) => o.total),
      month: sum(paid.filter((o) => wibKey(o.created_at) >= monthStart), (o) => o.total),
      top: topProducts(paid.filter((o) => wibKey(o.created_at) >= addDays(today, -29)), 5),
    });
  };
  useRealtimeRefresh(load);

  const chart = d ? dailyTotals(d.paid, addDays(d.today, -(days - 1)), d.today).map((x) => ({ label: x.date.slice(8) + '/' + x.date.slice(5, 7), value: x.total })) : [];
  const maxQty = d?.top?.[0]?.qty || 1;

  return (
    <>
      <PageHeader title="Dashboard Admin" subtitle="Statistik penjualan KAFE PRABU (diperbarui realtime)" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard dark label="Penjualan hari ini" value={d ? rupiah(d.todaySales) : '…'} icon={Wallet} />
        <StatCard label="Total transaksi (lunas)" value={d?.todayTrx ?? '…'} hint="hari ini" icon={Receipt} />
        <StatCard label="Total pesanan" value={d?.todayOrders ?? '…'} hint="hari ini, tidak termasuk batal" icon={ClipboardList} />
        <StatCard label="Pendapatan 7 hari" value={d ? rupiah(d.week) : '…'} icon={CalendarRange} />
        <StatCard label="Pendapatan bulan ini" value={d ? rupiah(d.month) : '…'} icon={CalendarDays} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Grafik Penjualan</h2>
            <select className="input !w-auto !py-1.5" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>7 hari</option><option value={14}>14 hari</option><option value={30}>30 hari</option>
            </select>
          </div>
          {d ? <BarChart data={chart} /> : <p className="py-16 text-center text-espresso/50">Memuat…</p>}
        </div>
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold"><Trophy className="h-5 w-5 text-gold-dark" />Menu Terlaris</h2>
          <p className="-mt-3 mb-3 text-xs text-espresso/50">30 hari terakhir</p>
          {d?.top.length === 0 && <p className="text-sm text-espresso/50">Belum ada penjualan.</p>}
          <ol className="space-y-3">
            {d?.top.map((p, i) => (
              <li key={p.name}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{i + 1}. {p.name}</span><span>{p.qty}×</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-espresso/10"><div className="h-full rounded-full bg-gradient-to-r from-coffee to-gold" style={{ width: `${(p.qty / maxQty) * 100}%` }} /></div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}
