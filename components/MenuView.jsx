'use client';
// Tampilan menu untuk pelanggan: kategori, pencarian, detail produk, tambah ke keranjang.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Minus, ShoppingBag, X, QrCode, ReceiptText } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useCart } from '@/lib/cart';
import { useToast } from './Toast';
import { rupiah } from '@/lib/utils';
import Logo from './Logo';
import Thumb from './Thumb';

function ProductSheet({ product, canOrder, onClose, onAdd }) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const soldOut = !product.is_available;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div className="relative w-full max-w-md animate-fade-up overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white" aria-label="Tutup"><X className="h-4 w-4" /></button>
        <div className="group aspect-[16/10] w-full"><Thumb src={product.image_url} name={product.name} /></div>
        <div className="space-y-4 p-5">
          <div>
            <h3 className="font-display text-2xl font-semibold">{product.name}</h3>
            <p className="mt-1 text-lg font-bold text-gold-dark">{rupiah(product.price)}</p>
            {product.description && <p className="mt-2 text-sm text-espresso/65">{product.description}</p>}
          </div>
          {soldOut ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">Menu ini sedang habis</p>
          ) : (
            <>
              <div>
                <label className="label">Catatan khusus (opsional)</label>
                <textarea className="input" rows={2} maxLength={200} placeholder="Contoh: es sedikit, tanpa gula" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-espresso/15">
                  <button className="p-3" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Kurangi"><Minus className="h-4 w-4" /></button>
                  <span className="w-8 text-center font-bold">{qty}</span>
                  <button className="p-3" onClick={() => setQty(Math.min(99, qty + 1))} aria-label="Tambah"><Plus className="h-4 w-4" /></button>
                </div>
                <button className="btn-gold flex-1 py-3" disabled={!canOrder} onClick={() => onAdd(product, qty, note)}>
                  {canOrder ? `Tambah • ${rupiah(product.price * qty)}` : 'Scan QR meja untuk memesan'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MenuView() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const { table, add, count, subtotal, ready } = useCart();
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [selected, setSelected] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);

  const loadProducts = async () => {
    const { data, error: e } = await sb.from('products').select('*').order('name');
    if (!e) setProducts(data);
  };

  useEffect(() => {
    (async () => {
      const [c, p, s] = await Promise.all([
        sb.from('categories').select('*').order('sort_order').order('name'),
        sb.from('products').select('*').order('name'),
        sb.from('cafe_settings').select('name,logo_url,address').eq('id', 1).maybeSingle(),
      ]);
      if (c.error || p.error) setError('Gagal memuat menu. Periksa koneksi lalu muat ulang halaman.');
      else { setCats(c.data); setProducts(p.data); }
      setSettings(s.data);
      setLoading(false);
    })();
    try { setLastOrder(JSON.parse(localStorage.getItem('kafe-prabu-last-order') || 'null')); } catch {}
    // Ketersediaan menu ikut berubah realtime saat admin mengubah status "habis"
    const ch = sb.channel('menu-live').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadProducts).subscribe();
    return () => { sb.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = products.filter((p) =>
      (cat === 'all' || p.category_id === cat) &&
      (!term || p.name.toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term)));
    const out = cats.map((c) => ({ id: c.id, name: c.name, items: filtered.filter((p) => p.category_id === c.id) }));
    const other = filtered.filter((p) => !p.category_id || !cats.some((c) => c.id === p.category_id));
    if (other.length) out.push({ id: 'other', name: 'Lainnya', items: other });
    return out.filter((g) => g.items.length);
  }, [products, cats, q, cat]);

  const canOrder = ready && !!table;
  const onAdd = (p, qty, note) => { add(p, qty, note); toast(`${p.name} ditambahkan`, 'success'); setSelected(null); };

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 bg-espresso px-4 py-3 text-cream shadow-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/"><Logo logoUrl={settings?.logo_url} name={settings?.name || 'KAFE PRABU'} /></Link>
          <div className="flex items-center gap-2">
            {lastOrder && <Link href={`/pesanan/${lastOrder.id}?t=${lastOrder.token}`} className="flex items-center gap-1 rounded-full border border-gold/50 px-3 py-1.5 text-xs font-semibold text-gold"><ReceiptText className="h-3.5 w-3.5" />Pesanan</Link>}
            {table && <span className="rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-espresso">MEJA {table}</span>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4">
        {ready && !table && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-espresso px-4 py-3 text-sm text-cream">
            <QrCode className="h-5 w-5 shrink-0 text-gold" /> Scan QR Code di meja Anda untuk mulai memesan. Anda tetap bisa melihat menu.
          </div>
        )}

        <div className="relative mt-5">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso/40" />
          <input className="input !rounded-2xl !py-3.5 pl-11 shadow-soft" placeholder="Cari menu favorit Anda…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {[{ id: 'all', name: 'Semua' }, ...cats].map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${cat === c.id ? 'bg-espresso text-gold shadow-lg' : 'bg-white text-espresso/70 hover:text-espresso'}`}>{c.name}</button>
          ))}
        </div>

        {loading && <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">{[...Array(6)].map((_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-white" />)}</div>}
        {error && <p className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {!loading && !error && groups.length === 0 && <p className="mt-12 text-center text-espresso/50">Menu tidak ditemukan.</p>}

        {groups.map((g) => (
          <section key={g.id} className="mt-8">
            <h2 className="mb-3 font-display text-2xl font-semibold">{g.name}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {g.items.map((p) => (
                <article key={p.id} onClick={() => setSelected(p)} className="card group cursor-pointer overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Thumb src={p.image_url} name={p.name} />
                    {!p.is_available && <div className="absolute inset-0 flex items-center justify-center bg-black/65"><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-red-600">HABIS</span></div>}
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-1 font-semibold">{p.name}</h3>
                    <p className="mt-0.5 line-clamp-2 min-h-[2rem] text-xs text-espresso/55">{p.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-gold-dark">{rupiah(p.price)}</span>
                      <button disabled={!p.is_available || !canOrder} onClick={(e) => { e.stopPropagation(); add(p, 1, ''); toast(`${p.name} ditambahkan`, 'success'); }}
                        className="rounded-full bg-espresso p-2 text-gold transition hover:bg-coffee disabled:opacity-30" aria-label={`Tambah ${p.name}`}><Plus className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {canOrder && count > 0 && (
        <Link href="/checkout" className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-lg animate-fade-up items-center justify-between rounded-2xl bg-espresso px-5 py-4 text-cream shadow-2xl shadow-black/30 transition hover:bg-coffee">
          <span className="flex items-center gap-3"><ShoppingBag className="h-5 w-5 text-gold" /><span className="font-semibold">{count} item</span></span>
          <span className="font-bold text-gold">{rupiah(subtotal)} • Lihat Keranjang</span>
        </Link>
      )}
      {selected && <ProductSheet product={selected} canOrder={canOrder} onClose={() => setSelected(null)} onAdd={onAdd} />}
    </div>
  );
}
