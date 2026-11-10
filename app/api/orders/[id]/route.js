// GET /api/orders/:id?token=...  -> pelanggan melacak pesanannya (wajib membawa token rahasia).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req, { params }) {
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!UUID.test(params.id) || !UUID.test(token)) return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });

  const db = supabaseAdmin();
  const { data: order } = await db.from('orders')
    .select('id,order_number,table_number,status,payment_status,payment_method,subtotal,tax,service_fee,total,customer_name,allow_kitchen_override,cancel_reason,created_at,updated_at')
    .eq('id', params.id).eq('token', token).maybeSingle();
  if (!order) return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });

  const [{ data: items }, { data: settings }] = await Promise.all([
    db.from('order_items').select('id,product_name,unit_price,quantity,note,subtotal').eq('order_id', order.id).order('created_at'),
    db.from('cafe_settings').select('name,logo_url,whatsapp,qris_url').eq('id', 1).maybeSingle(),
  ]);
  return NextResponse.json({ order, items: items || [], settings });
}
