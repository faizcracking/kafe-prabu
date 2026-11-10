'use client';
import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { fetchOrdersRange, sum, byMethod, topProducts, dailyTotals } from '@/lib/stats';
import { todayKey, addDays, rupiah, rp, fmtDateTime } from '@/lib/utils';
import { PAYMENT_METHOD } from '@/lib/constants';
import { useToast } from '@/components/Toast';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';

// Hitung rentang tanggal dari mode + nilai input
function rangeOf(mode, value) {
  if (mode === 'harian') return { from: value, to: value, label: value };
  if (mode === 'mingguan') {
    const dow = new Date(`${value}T00:00:00Z`).getUTCDay(); // 0 = Minggu
    const mon = addDays(value, -((dow + 6) % 7));
    return { from: mon, to: addDays(mon, 6), label: `${mon}_sd_${addDays(mon, 6)}` };
  }
  const [y, m] = value.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${value}-01`, to: `${value}-${String(last).padStart(2, '0')}`, label: value };
}

export default function LaporanPage() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [mode, setMode] = useState('harian');
  const [day, setDay] = useState(todayKey());
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [orders, setOrders] = useState(null);
  const range = useMemo(() => rangeOf(mode, mode === 'bulanan' ? month : day), [mode, day, month]);

  useEffect(() => {
    setOrders(null);
    fetchOrdersRange(sb, range.from, range.to, { items: true }).then(setOrders).catch((e) => toast(e.message, 'error'));
    // eslint-disable-next-line
  }, [range.from, range.to]);

  const stat = useMemo(() => {
    if (!orders) return null;
    return {
      total: sum(orders, (o) => o.total), subtotal: sum(orders, (o) => o.subtotal), tax: sum(orders, (o) => o.tax), service: sum(orders, (o) => o.service_fee),
      count: orders.length, method: byMethod(orders), top: topProducts(orders, 10), daily: dailyTotals(orders, range.from, range.to),
    };
  }, [orders, range]);

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    add('Ringkasan', [['Laporan KAFE PRABU'], ['Periode', `${range.from} s/d ${range.to}`], [], ['Jumlah transaksi', stat.count], ['Subtotal', stat.subtotal], ['Pajak', stat.tax], ['Biaya layanan', stat.service], ['Total pendapatan', stat.total]]);
    add('Transaksi', [['No. Pesanan', 'Waktu', 'Meja', 'Metode', 'Subtotal', 'Pajak', 'Layanan', 'Total'], ...orders.map((o) => [o.order_number, fmtDateTime(o.created_at), o.table_number, PAYMENT_METHOD[o.payment_method], o.subtotal, o.tax, o.service_fee, o.total])]);
    add('Metode Pembayaran', [['Metode', 'Jumlah', 'Total'], ...Object.entries(stat.method).map(([k, v]) => [PAYMENT_METHOD[k], v.count, v.total])]);
    add('Menu Terlaris', [['Menu', 'Terjual', 'Pendapatan'], ...stat.top.map((p) => [p.name, p.qty, p.revenue])]);
    if (mode !== 'harian') add('Per Hari', [['Tanggal', 'Pendapatan'], ...stat.daily.map((d) => [d.date, d.total])]);
    XLSX.writeFile(wb, `laporan-kafe-prabu-${range.label}.xlsx`);
  };

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('KAFE PRABU - Laporan Penjualan', 14, 16);
    doc.setFontSize(10); doc.text(`Periode: ${range.from} s/d ${range.to}`, 14, 23);
    autoTable(doc, { startY: 28, head: [['Ringkasan', '']], body: [['Jumlah transaksi', String(stat.count)], ['Subtotal', rp(stat.subtotal)], ['Pajak', rp(stat.tax)], ['Biaya layanan', rp(stat.service)], ['Total pendapatan', rp(stat.total)], ['Tunai', `${stat.method.tunai.count} trx / ${rp(stat.method.tunai.total)}`], ['QRIS', `${stat.method.qris.count} trx / ${rp(stat.method.qris.total)}`]], headStyles: { fillColor: [23, 23, 23], textColor: [201, 164, 92] } });
    autoTable(doc, { startY: doc.lastAutoTable.finalY + 8, head: [['No. Pesanan', 'Waktu', 'Meja', 'Metode', 'Total']], body: orders.map((o) => [o.order_number, fmtDateTime(o.created_at), o.table_number, PAYMENT_METHOD[o.payment_method], rp(o.total)]), headStyles: { fillColor: [23, 23, 23], textColor: [201, 164, 92] }, styles: { fontSize: 8 } });
    if (stat.top.length) autoTable(doc, { startY: doc.lastAutoTable.finalY + 8, head: [['Menu Terlaris', 'Terjual', 'Pendapatan']], body: stat.top.map((p) => [p.name, p.qty, rp(p.revenue)]), headStyles: { fillColor: [107, 73, 53] } });
    doc.save(`laporan-kafe-prabu-${range.label}.pdf`);
  };

  return (
    <>
      <PageHeader title="Laporan Penjualan" subtitle={`Periode ${range.from} s/d ${range.to} • hanya pesanan LUNAS`}>
        <button className="btn-ghost" onClick={exportExcel} disabled={!stat}><FileSpreadsheet className="h-4 w-4" />Export Excel</button>
        <button className="btn-gold" onClick={exportPdf} disabled={!stat}><FileText className="h-4 w-4" />Export PDF</button>
      </PageHeader>

      <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <div className="flex rounded-xl bg-espresso/5 p-1">
          {['harian', 'mingguan', 'bulanan'].map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${mode === m ? 'bg-espresso text-gold shadow' : 'text-espresso/60'}`}>{m}</button>)}
        </div>
        {mode === 'bulanan' ? <input type="month" className="input !w-auto" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /> : <input type="date" className="input !w-auto" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />}
        {mode === 'mingguan' && <span className="text-xs text-espresso/55">Pilih tanggal mana pun; laporan mencakup Senin–Minggu pada pekan itu.</span>}
      </div>

      {!stat ? <p className="py-10 text-center text-espresso/50">Memuat laporan…</p> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard dark label="Total pendapatan" value={rupiah(stat.total)} />
            <StatCard label="Jumlah transaksi" value={stat.count} />
            <StatCard label="Rata-rata / transaksi" value={rupiah(stat.count ? stat.total / stat.count : 0)} />
            <StatCard label="Pajak + layanan" value={rupiah(stat.tax + stat.service)} />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="mb-3 font-display text-xl font-semibold">Metode Pembayaran</h2>
              {Object.entries(stat.method).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-espresso/10 py-2.5 last:border-0"><span className="font-semibold">{PAYMENT_METHOD[k]}</span><span className="text-sm text-espresso/60">{v.count} transaksi</span><span className="font-bold text-gold-dark">{rupiah(v.total)}</span></div>
              ))}
            </div>
            <div className="card p-5">
              <h2 className="mb-3 font-display text-xl font-semibold">Menu Terlaris</h2>
              {stat.top.length === 0 && <p className="text-sm text-espresso/50">Belum ada data.</p>}
              {stat.top.map((p, i) => <div key={p.name} className="flex justify-between border-b border-espresso/10 py-2 text-sm last:border-0"><span>{i + 1}. {p.name}</span><span className="text-espresso/60">{p.qty}× • {rupiah(p.revenue)}</span></div>)}
            </div>
          </div>
          {mode !== 'harian' && (
            <div className="card mt-5 p-5">
              <h2 className="mb-3 font-display text-xl font-semibold">Rincian per Hari</h2>
              <div className="grid gap-x-8 sm:grid-cols-2">{stat.daily.map((d) => <div key={d.date} className="flex justify-between border-b border-espresso/10 py-1.5 text-sm"><span>{d.date}</span><span className={d.total ? 'font-semibold' : 'text-espresso/35'}>{rupiah(d.total)}</span></div>)}</div>
            </div>
          )}
          <div className="card mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-espresso text-xs uppercase tracking-wide text-gold"><tr><th className="p-3">No. Pesanan</th><th className="p-3">Waktu</th><th className="p-3">Meja</th><th className="p-3">Metode</th><th className="p-3 text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-espresso/10">
                {orders.map((o) => <tr key={o.id}><td className="p-3 font-semibold">{o.order_number}</td><td className="p-3">{fmtDateTime(o.created_at)}</td><td className="p-3">{o.table_number}</td><td className="p-3">{PAYMENT_METHOD[o.payment_method]}</td><td className="p-3 text-right font-semibold">{rupiah(o.total)}</td></tr>)}
                {!orders.length && <tr><td colSpan={5} className="p-8 text-center text-espresso/50">Tidak ada transaksi pada periode ini.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
