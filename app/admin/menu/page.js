'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, ImagePlus } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { uploadAsset } from '@/lib/upload';
import { rupiah } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import Thumb from '@/components/Thumb';

const EMPTY = { id: null, name: '', description: '', price: '', category_id: '', image_url: '', is_available: true };

export default function AdminMenu() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState('');

  const load = async () => {
    const [p, c] = await Promise.all([sb.from('products').select('*').order('name'), sb.from('categories').select('*').order('sort_order')]);
    setProducts(p.data || []); setCats(c.data || []);
  };
  useEffect(() => { load(); // eslint-disable-next-line
  }, []);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { const url = await uploadAsset(sb, file, 'products'); setForm((f) => ({ ...f, image_url: url })); }
    catch (err) { toast(err.message || 'Upload gagal', 'error'); }
    setUploading(false); e.target.value = '';
  };

  const save = async () => {
    const price = parseInt(form.price, 10);
    if (!form.name.trim()) return toast('Nama produk wajib diisi', 'error');
    if (!Number.isInteger(price) || price < 0) return toast('Harga tidak valid', 'error');
    setSaving(true);
    const payload = { name: form.name.trim(), description: form.description?.trim() || null, price, category_id: form.category_id || null, image_url: form.image_url || null, is_available: form.is_available };
    const { error } = form.id ? await sb.from('products').update(payload).eq('id', form.id) : await sb.from('products').insert(payload);
    setSaving(false);
    if (error) return toast(error.message, 'error');
    toast('Produk disimpan', 'success'); setForm(null); load();
  };
  const toggle = async (p) => {
    const { error } = await sb.from('products').update({ is_available: !p.is_available }).eq('id', p.id);
    if (error) toast(error.message, 'error'); else load();
  };
  const remove = async (p) => {
    if (!confirm(`Hapus "${p.name}"? Riwayat pesanan lama tetap aman.`)) return;
    const { error } = await sb.from('products').delete().eq('id', p.id);
    if (error) toast(error.message, 'error'); else { toast('Produk dihapus', 'success'); load(); }
  };

  const catName = (id) => cats.find((c) => c.id === id)?.name || 'Tanpa kategori';
  const shown = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Manajemen Menu" subtitle={`${products.length} produk`}>
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso/40" /><input className="input w-48 pl-9" placeholder="Cari produk…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <button className="btn-gold" onClick={() => setForm({ ...EMPTY, category_id: cats[0]?.id || '' })}><Plus className="h-4 w-4" />Tambah Produk</button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((p) => (
          <div key={p.id} className="card group flex overflow-hidden transition hover:shadow-xl">
            <div className="h-auto w-28 shrink-0"><Thumb src={p.image_url} name={p.name} /></div>
            <div className="min-w-0 flex-1 p-3">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="text-xs text-espresso/50">{catName(p.category_id)}</p>
              <p className="mt-1 font-bold text-gold-dark">{rupiah(p.price)}</p>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => toggle(p)} className={`rounded-full px-3 py-1 text-xs font-bold ${p.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{p.is_available ? 'Tersedia' : 'Habis'}</button>
                <button className="btn-ghost !p-1.5" onClick={() => setForm({ ...p, price: String(p.price), category_id: p.category_id || '', description: p.description || '', image_url: p.image_url || '' })} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                <button className="btn-ghost !p-1.5 text-red-600" onClick={() => remove(p)} aria-label="Hapus"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!shown.length && <div className="card p-10 text-center text-espresso/50">Tidak ada produk.</div>}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Produk' : 'Tambah Produk'}>
        {form && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="group h-20 w-20 shrink-0 overflow-hidden rounded-xl"><Thumb src={form.image_url} name="preview" /></div>
              <label className="btn-ghost cursor-pointer"><ImagePlus className="h-4 w-4" />{uploading ? 'Mengunggah…' : 'Upload foto'}<input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} /></label>
            </div>
            <div><label className="label">Nama produk</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Kategori</label>
                <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">Tanpa kategori</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><label className="label">Harga (Rp)</label><input className="input" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            </div>
            <div><label className="label">Deskripsi</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-[#C9A45C]" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />Tersedia (centang) / Habis (kosongkan)</label>
            <button className="btn-gold w-full" disabled={saving || uploading} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan Produk'}</button>
          </div>
        )}
      </Modal>
    </>
  );
}
