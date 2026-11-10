// POST /api/staff/orders -> aksi staf: konfirmasi pembayaran, ubah status, batalkan, izinkan ke dapur.
// Semua aksi divalidasi di server berdasarkan role dan status pesanan saat ini.
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const NEXT = { menunggu_diproses: 'dimasak', dimasak: 'siap', siap: 'selesai' };
const fail = (error, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req) {
  const auth = await requireRole(['admin', 'kasir', 'dapur']);
  if (auth.error) return fail(auth.error, auth.status);
  const { user, profile } = auth;
  const role = profile.role;

  let body;
  try { body = await req.json(); } catch { return fail('Permintaan tidak valid'); }
  const { orderId, action } = body;

  const db = supabaseAdmin();
  const { data: order } = await db.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (!order) return fail('Pesanan tidak ditemukan', 404);

  // ---- Konfirmasi pembayaran (kasir/admin) ----
  if (action === 'confirm_payment') {
    if (!['admin', 'kasir'].includes(role)) return fail('Hanya kasir/admin yang dapat konfirmasi pembayaran', 403);
    if (order.status === 'dibatalkan') return fail('Pesanan sudah dibatalkan');
    if (order.payment_status !== 'menunggu') return fail('Pembayaran sudah dikonfirmasi sebelumnya');
    const upd = { payment_status: 'lunas' };
    if (order.status === 'baru') upd.status = 'menunggu_diproses'; // sekarang boleh masuk antrean dapur
    const { data: changed } = await db.from('orders').update(upd).eq('id', orderId).eq('payment_status', 'menunggu').select('id');
    if (!changed?.length) return fail('Pembayaran sudah dikonfirmasi sebelumnya');
    await db.from('payments').update({ status: 'lunas', confirmed_by: user.id, confirmed_at: new Date().toISOString() }).eq('order_id', orderId);
    return NextResponse.json({ message: `Pembayaran ${order.order_number} dikonfirmasi — LUNAS` });
  }

  // ---- Ubah status produksi ----
  if (action === 'set_status') {
    const target = body.status;
    if (NEXT[order.status] !== target) return fail('Perpindahan status tidak valid');
    const allowed = role === 'admin' || role === 'dapur' || (role === 'kasir' && target === 'selesai');
    if (!allowed) return fail('Anda tidak berhak mengubah status ini', 403);
    if (order.payment_status !== 'lunas' && !order.allow_kitchen_override) return fail('Pembayaran belum dikonfirmasi');
    const { data: changed } = await db.from('orders').update({ status: target }).eq('id', orderId).eq('status', order.status).select('id');
    if (!changed?.length) return fail('Status sudah berubah, muat ulang');
    return NextResponse.json({ message: 'Status diperbarui' });
  }

  // ---- Batalkan pesanan (kasir/admin, wajib alasan) ----
  if (action === 'cancel') {
    if (!['admin', 'kasir'].includes(role)) return fail('Tidak berhak membatalkan pesanan', 403);
    const reason = String(body.reason || '').trim();
    if (reason.length < 3) return fail('Alasan pembatalan wajib diisi');
    if (['selesai', 'dibatalkan'].includes(order.status)) return fail('Pesanan sudah selesai/dibatalkan');
    await db.from('orders').update({ status: 'dibatalkan', payment_status: 'dibatalkan', cancel_reason: reason.slice(0, 300), cancelled_by: user.id }).eq('id', orderId);
    await db.from('payments').update({ status: 'dibatalkan' }).eq('order_id', orderId);
    return NextResponse.json({ message: 'Pesanan dibatalkan' });
  }

  // ---- Admin mengizinkan pesanan belum bayar masuk dapur ----
  if (action === 'allow_kitchen') {
    if (role !== 'admin') return fail('Hanya admin yang dapat memberi izin ini', 403);
    if (order.status !== 'baru') return fail('Pesanan sudah diproses');
    await db.from('orders').update({ allow_kitchen_override: true, status: 'menunggu_diproses' }).eq('id', orderId);
    return NextResponse.json({ message: 'Pesanan diteruskan ke dapur (belum dibayar)' });
  }

  return fail('Aksi tidak dikenal');
}
