// POST /api/orders  -> membuat pesanan dari pelanggan.
// Harga dan total SELALU dihitung ulang di server dari database (tidak mempercayai browser).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad = (error, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return bad('Permintaan tidak valid'); }

  const table = Number(body.table);
  const { items, paymentMethod, idempotencyKey } = body;
  const customerName = String(body.customerName || '').trim().slice(0, 60) || null;

  if (!Number.isInteger(table) || table < 1) return bad('Nomor meja tidak valid');
  if (!['tunai', 'qris'].includes(paymentMethod)) return bad('Metode pembayaran tidak valid');
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8 || idempotencyKey.length > 80) return bad('Kunci pesanan tidak valid');
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) return bad('Keranjang kosong atau terlalu banyak item');
  for (const i of items) {
    if (!UUID.test(i.productId) || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 99) return bad('Data item tidak valid');
  }

  const db = supabaseAdmin();

  // Pesanan ganda? Kalau kunci yang sama sudah ada, kembalikan pesanan yang sama.
  const found = async () => (await db.from('orders').select('id,token,order_number').eq('idempotency_key', idempotencyKey).maybeSingle()).data;
  const existing = await found();
  if (existing) return NextResponse.json({ orderId: existing.id, token: existing.token, orderNumber: existing.order_number });

  const { data: tbl } = await db.from('tables').select('id,number').eq('number', table).eq('is_active', true).maybeSingle();
  if (!tbl) return bad('Meja tidak ditemukan', 404);

  const ids = [...new Set(items.map((i) => i.productId))];
  const { data: products, error: pErr } = await db.from('products').select('id,name,price,is_available').in('id', ids);
  if (pErr) return bad('Gagal membaca menu', 500);
  const map = new Map(products.map((p) => [p.id, p]));

  const lines = [];
  for (const i of items) {
    const p = map.get(i.productId);
    if (!p) return bad('Ada menu yang sudah tidak tersedia, silakan muat ulang halaman', 409);
    if (!p.is_available) return bad(`${p.name} sedang habis`, 409);
    lines.push({
      product_id: p.id, product_name: p.name, unit_price: p.price, quantity: i.quantity,
      note: String(i.note || '').trim().slice(0, 200) || null, subtotal: p.price * i.quantity,
    });
  }

  const { data: s } = await db.from('cafe_settings').select('tax_percent,service_percent').eq('id', 1).maybeSingle();
  const subtotal = lines.reduce((a, l) => a + l.subtotal, 0);
  const tax = Math.round((subtotal * Number(s?.tax_percent || 0)) / 100);
  const service = Math.round((subtotal * Number(s?.service_percent || 0)) / 100);
  const total = subtotal + tax + service;

  const { data: order, error: oErr } = await db.from('orders').insert({
    table_id: tbl.id, table_number: tbl.number, customer_name: customerName,
    payment_method: paymentMethod, subtotal, tax, service_fee: service, total, idempotency_key: idempotencyKey,
  }).select('id,token,order_number').single();

  if (oErr) {
    if (oErr.code === '23505') { // klik ganda bersamaan
      const again = await found();
      if (again) return NextResponse.json({ orderId: again.id, token: again.token, orderNumber: again.order_number });
    }
    return bad('Gagal membuat pesanan', 500);
  }

  const { error: iErr } = await db.from('order_items').insert(lines.map((l) => ({ ...l, order_id: order.id })));
  const { error: payErr } = iErr ? { error: iErr } : await db.from('payments').insert({ order_id: order.id, method: paymentMethod, amount: total });
  if (iErr || payErr) {
    await db.from('orders').delete().eq('id', order.id); // batalkan semuanya bila gagal
    return bad('Gagal menyimpan item pesanan', 500);
  }
  return NextResponse.json({ orderId: order.id, token: order.token, orderNumber: order.order_number });
}
