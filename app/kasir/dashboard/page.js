'use client';
import { useState } from 'react';
import { ClipboardList, Hourglass, BadgeCheck, Wallet } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRealtimeRefresh } from '@/lib/useRealtime';
import { fetchOrdersRange, sum } from '@/lib/stats';
import { todayKey, rupiah } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import OrderList from '@/components/OrderList';

export default function KasirDashboard() {
  const sb = supabaseBrowser();
  const [s, setS] = useState(null);

  const load = async () => {
    const t = todayKey();
    const all = (await fetchOrdersRange(sb, t, t, { paidOnly: false })).filter((o) => o.status !== 'dibatalkan');
    const paid = all.filter((o) => o.payment_status === 'lunas');
    setS({
      orders: all.length, paid: paid.length, pending: all.filter((o) => o.payment_status === 'menunggu').length,
      revenue: sum(paid, (o) => o.total),
      cash: sum(paid.filter((o) => o.payment_method === 'tunai'), (o) => o.total),
      qris: sum(paid.filter((o) => o.payment_method === 'qris'), (o) => o.total),
    });
  };
  useRealtimeRefresh(load);

  return (
    <>
      <PageHeader title="Dashboard Kasir" subtitle="Ringkasan transaksi hari ini" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pesanan hari ini" value={s?.orders ?? '…'} icon={ClipboardList} />
        <StatCard label="Menunggu pembayaran" value={s?.pending ?? '…'} icon={Hourglass} />
        <StatCard label="Transaksi lunas" value={s?.paid ?? '…'} icon={BadgeCheck} />
        <StatCard dark label="Pendapatan hari ini" value={s ? rupiah(s.revenue) : '…'} hint={s ? `Tunai ${rupiah(s.cash)} • QRIS ${rupiah(s.qris)}` : ''} icon={Wallet} />
      </div>
      <h2 className="mb-3 mt-8 font-display text-xl font-semibold">Antrean pembayaran</h2>
      <OrderList scope="payment" role="kasir" />
    </>
  );
}
