'use client';
// Keranjang belanja pelanggan. Disimpan di localStorage supaya tidak hilang saat halaman di-refresh.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const KEY = 'kafe-prabu-cart-v1';

export function CartProvider({ children }) {
  const [state, setState] = useState({ table: null, items: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setState(JSON.parse(raw)); } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
  }, [state, ready]);

  // Pindah meja => keranjang lama dikosongkan
  const setTable = useCallback((n) => setState((s) => (s.table === n ? s : { table: n, items: s.table ? [] : s.items })), []);
  const add = useCallback((p, qty = 1, note = '') => setState((s) => {
    const key = `${p.id}|${note.trim()}`;
    const found = s.items.find((i) => i.key === key);
    const items = found
      ? s.items.map((i) => (i.key === key ? { ...i, qty: Math.min(99, i.qty + qty) } : i))
      : [...s.items, { key, productId: p.id, name: p.name, price: p.price, image_url: p.image_url, qty, note: note.trim() }];
    return { ...s, items };
  }), []);
  const setQty = useCallback((key, qty) => setState((s) => ({
    ...s,
    items: qty <= 0 ? s.items.filter((i) => i.key !== key) : s.items.map((i) => (i.key === key ? { ...i, qty: Math.min(99, qty) } : i)),
  })), []);
  const setNote = useCallback((key, note) => setState((s) => ({ ...s, items: s.items.map((i) => (i.key === key ? { ...i, note } : i)) })), []);
  const clear = useCallback(() => setState((s) => ({ ...s, items: [] })), []);

  const value = useMemo(() => ({
    ready, table: state.table, items: state.items,
    count: state.items.reduce((a, i) => a + i.qty, 0),
    subtotal: state.items.reduce((a, i) => a + i.qty * i.price, 0),
    setTable, add, setQty, setNote, clear,
  }), [state, ready, setTable, add, setQty, setNote, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
