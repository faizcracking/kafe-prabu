// Fungsi statistik & pengambilan data laporan.
import { startOfDayISO, addDays, wibKey } from './utils';

// Mengambil semua pesanan dalam rentang tanggal (WIB), otomatis per 1000 baris.
export async function fetchOrdersRange(sb, fromKey, toKey, { items = false, paidOnly = true } = {}) {
  const out = [];
  const size = 1000;
  for (let page = 0; page < 50; page++) {
    let q = sb.from('orders')
      .select(items ? '*, order_items(product_name,quantity,subtotal)' : '*')
      .gte('created_at', startOfDayISO(fromKey))
      .lt('created_at', startOfDayISO(addDays(toKey, 1)))
      .order('created_at', { ascending: true })
      .range(page * size, page * size + size - 1);
    if (paidOnly) q = q.eq('payment_status', 'lunas');
    const { data, error } = await q;
    if (error) throw error;
    out.push(...data);
    if (data.length < size) break;
  }
  return out;
}

export const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);

export function dailyTotals(orders, fromKey, toKey) {
  const map = {};
  for (let k = fromKey; k <= toKey; k = addDays(k, 1)) map[k] = 0;
  orders.forEach((o) => { const k = wibKey(o.created_at); if (k in map) map[k] += o.total; });
  return Object.entries(map).map(([date, total]) => ({ date, total }));
}

export function topProducts(orders, limit = 5) {
  const m = {};
  orders.forEach((o) => (o.order_items || []).forEach((i) => {
    m[i.product_name] = m[i.product_name] || { name: i.product_name, qty: 0, revenue: 0 };
    m[i.product_name].qty += i.quantity;
    m[i.product_name].revenue += i.subtotal;
  }));
  return Object.values(m).sort((a, b) => b.qty - a.qty).slice(0, limit);
}

export function byMethod(orders) {
  const m = { tunai: { count: 0, total: 0 }, qris: { count: 0, total: 0 } };
  orders.forEach((o) => { m[o.payment_method].count += 1; m[o.payment_method].total += o.total; });
  return m;
}
