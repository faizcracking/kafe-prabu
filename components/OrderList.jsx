'use client';
// Daftar pesanan untuk kasir & admin (realtime). scope: payment | active | history | all
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Ban, Printer, Search, ChefHat, Eye, Inbox } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRealtimeRefresh } from '@/lib/useRealtime';
import { callStaff } from '@/lib/staffApi';
import { rupiah, fmtDateTime, fmtTime, startOfDayISO, addDays, beep } from '@/lib/utils';
import { NEXT_STATUS, ORDER_STATUS } from '@/lib/constants';
import { useToast } from './Toast';
import { StatusBadge, PayBadge, MethodBadge } from './Badges';
import Modal from './Modal';

const EMPTY = { payment: 'Tidak ada pembayaran yang menunggu.', active: 'Belum ada pesanan aktif.', history: 'Belum ada riwayat.', all: 'Belum ada pesanan.' };

export default function OrderList({ scope = 'active', role = 'kasir' }) {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('all');
  const [detailId, setDetailId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const showFilters = scope === 'history' || scope === 'all';
  const cashier = role === 'admin' || role === 'kasir';

  const load = async () => {
    let qy = sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(200);
    if (scope === 'payment') qy = qy.eq('payment_status', 'menunggu').neq('status', 'dibatalkan');
    if (scope === 'active') qy = qy.not('status', 'in', '(selesai,dibatalkan)');
    if (scope === 'history') qy = qy.in('status', ['selesai', 'dibatalkan']);
    if (scope === 'all' && status !== 'all') qy = qy.eq('status', status);
    if (showFilters) {
      if (q.trim()) qy = qy.ilike('order_number', `%${q.trim()}%`);
      if (from) qy = qy.gte('created_at', startOfDayISO(from));
      if (to) qy = qy.lt('created_at', startOfDayISO(addDays(to, 1)));
    }
    const { data, error: e } = await qy;
    if (e) setError(e.message); else { setError(''); setOrders(data); }
  };

  useRealtimeRefresh(load, {
    onEvent: (p) => { if (p.eventType === 'INSERT') { toast(`Pesanan baru ${p.new.order_number} — Meja ${p.new.table_number}`, 'success'); beep(); } },
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [q, from, to, status]);

  const act = async (o, action, extra = {}) => {
    setBusy(true);
    const r = await callStaff({ orderId: o.id, action, ...extra });
    setBusy(false);
    if (!r.ok) { toast(r.error, 'error'); return false; }
    toast(r.message || 'Berhasil', 'success');
    await load();
    return true;
  };

  const detail = orders?.find((o) => o.id === detailId);

  const Actions = ({ o }) => {
    const open = !['selesai', 'dibatalkan'].includes(o.status);
    const next = NEXT_STATUS[o.status];
    return (
      <div className="flex flex-wrap gap-2">
        {cashier && o.payment_status === 'menunggu' && o.status !== 'dibatalkan' && (
          <button disabled={busy} className="btn-gold" onClick={() => act(o, 'confirm_payment')}><BadgeCheck className="h-4 w-4" />KONFIRMASI PEMBAYARAN</button>
        )}
        {role === 'admin' && o.status === 'baru' && (
          <button disabled={busy} className="btn-ghost" onClick={() => confirm('Teruskan ke dapur tanpa pembayaran?') && act(o, 'allow_kitchen')}><ChefHat className="h-4 w-4" />Izinkan ke dapur</button>
        )}
        {next && (role === 'admin' || (role === 'kasir' && o.status === 'siap')) && (
          <button disabled={busy} className="btn-dark" onClick={() => act(o, 'set_status', { status: next[0] })}>{next[1]}</button>
        )}
        {cashier && open && <button disabled={busy} className="btn-danger" onClick={() => { setDetailId(o.id); setCancelling(true); }}><Ban className="h-4 w-4" />Batalkan</button>}
      </div>
    );
  };

  return (
    <div>
      {showFilters && (
        <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso/40" /><input className="input pl-9" placeholder="Cari nomor pesanan…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="Dari tanggal" /></div>
          <div><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} title="Sampai tanggal" /></div>
          {scope === 'all' && (
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Semua status</option>
              {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          )}
        </div>
      )}

      {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {orders === null && !error && <p className="py-10 text-center text-espresso/50">Memuat…</p>}
      {orders?.length === 0 && <div className="card flex flex-col items-center gap-2 py-14 text-espresso/50"><Inbox className="h-8 w-8" />{EMPTY[scope]}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {orders?.map((o) => (
          <div key={o.id} className="card animate-fade-up p-4 transition hover:shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold">{o.order_number}</p>
                <p className="text-xs text-espresso/55">Meja {o.table_number} • {fmtTime(o.created_at)}{o.customer_name ? ` • ${o.customer_name}` : ''}</p>
              </div>
              <p className="font-display text-lg font-semibold text-gold-dark">{rupiah(o.total)}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5"><StatusBadge status={o.status} /><PayBadge status={o.payment_status} /><MethodBadge method={o.payment_method} /></div>
            <ul className="mt-3 space-y-0.5 text-sm">
              {o.order_items.slice(0, 4).map((i) => <li key={i.id}><b>{i.quantity}×</b> {i.product_name}</li>)}
              {o.order_items.length > 4 && <li className="text-xs text-espresso/50">+{o.order_items.length - 4} item lainnya</li>}
            </ul>
            <div className="mt-3 space-y-2 border-t border-espresso/10 pt-3">
              <Actions o={o} />
              <div className="flex gap-2">
                <button className="btn-ghost !py-1.5 text-xs" onClick={() => { setDetailId(o.id); setCancelling(false); }}><Eye className="h-3.5 w-3.5" />Detail</button>
                {cashier && o.payment_status === 'lunas' && <Link href={`/struk/${o.id}`} target="_blank" className="btn-ghost !py-1.5 text-xs"><Printer className="h-3.5 w-3.5" />Struk</Link>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!detail} onClose={() => { setDetailId(null); setCancelling(false); setReason(''); }} title={detail ? `Pesanan ${detail.order_number}` : ''} wide>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-1.5"><StatusBadge status={detail.status} /><PayBadge status={detail.payment_status} /><MethodBadge method={detail.payment_method} /></div>
            <div className="grid grid-cols-2 gap-2 text-xs text-espresso/65">
              <p>Meja: <b className="text-espresso">{detail.table_number}</b></p>
              <p>Waktu: <b className="text-espresso">{fmtDateTime(detail.created_at)}</b></p>
              {detail.customer_name && <p>Nama: <b className="text-espresso">{detail.customer_name}</b></p>}
            </div>
            {detail.payment_method === 'qris' && detail.payment_status === 'menunggu' && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Pembayaran QRIS belum otomatis. Cek dulu di aplikasi/mutasi QRIS kafe bahwa dana {rupiah(detail.total)} sudah masuk, baru tekan konfirmasi.</p>
            )}
            <ul className="divide-y divide-espresso/10 rounded-xl border border-espresso/10">
              {detail.order_items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 p-3">
                  <span><b>{i.quantity}×</b> {i.product_name}{i.note && <em className="block text-xs text-amber-700">Catatan: {i.note}</em>}</span>
                  <span>{rupiah(i.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{rupiah(detail.subtotal)}</span></div>
              <div className="flex justify-between"><span>Pajak</span><span>{rupiah(detail.tax)}</span></div>
              <div className="flex justify-between"><span>Biaya layanan</span><span>{rupiah(detail.service_fee)}</span></div>
              <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-gold-dark">{rupiah(detail.total)}</span></div>
            </div>
            {detail.cancel_reason && <p className="rounded-xl bg-red-50 p-3 text-red-800">Alasan batal: {detail.cancel_reason}</p>}
            {cancelling ? (
              <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                <label className="label !text-red-700">Alasan pembatalan (wajib)</label>
                <textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: pelanggan membatalkan / stok habis" />
                <div className="flex gap-2">
                  <button className="btn-danger" disabled={busy || reason.trim().length < 3} onClick={async () => { if (await act(detail, 'cancel', { reason })) { setCancelling(false); setReason(''); } }}>Ya, batalkan pesanan</button>
                  <button className="btn-ghost" onClick={() => setCancelling(false)}>Kembali</button>
                </div>
              </div>
            ) : <Actions o={detail} />}
          </div>
        )}
      </Modal>
    </div>
  );
}
