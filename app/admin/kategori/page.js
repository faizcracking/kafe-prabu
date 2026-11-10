'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';

export default function KategoriPage() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [list, setList] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await sb.from('categories').select('*').order('sort_order').order('name');
    setList(data || []);
  };
  useEffect(() => { load(); // eslint-disable-next-line
  }, []);

  const save = async () => {
    if (!form.name.trim()) return toast('Nama kategori wajib diisi', 'error');
    setSaving(true);
    const payload = { name: form.name.trim(), sort_order: parseInt(form.sort_order, 10) || 0 };
    const { error } = form.id ? await sb.from('categories').update(payload).eq('id', form.id) : await sb.from('categories').insert(payload);
    setSaving(false);
    if (error) return toast(error.code === '23505' ? 'Nama kategori sudah ada' : error.message, 'error');
    toast('Kategori disimpan', 'success'); setForm(null); load();
  };
  const remove = async (c) => {
    if (!confirm(`Hapus kategori "${c.name}"?`)) return;
    const { error } = await sb.from('categories').delete().eq('id', c.id);
    if (error) return toast(error.code === '23503' ? 'Masih ada produk di kategori ini. Pindahkan/hapus produknya dulu.' : error.message, 'error');
    toast('Kategori dihapus', 'success'); load();
  };

  return (
    <>
      <PageHeader title="Kategori Menu" subtitle="Atur kategori dan urutan tampil di halaman pelanggan.">
        <button className="btn-gold" onClick={() => setForm({ id: null, name: '', sort_order: (list.at(-1)?.sort_order || 0) + 1 })}><Plus className="h-4 w-4" />Tambah Kategori</button>
      </PageHeader>
      <div className="card divide-y divide-espresso/10">
        {list.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-espresso text-xs font-bold text-gold">{c.sort_order}</span>
            <p className="flex-1 font-semibold">{c.name}</p>
            <button className="btn-ghost !p-2" onClick={() => setForm({ ...c })} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
            <button className="btn-ghost !p-2 text-red-600" onClick={() => remove(c)} aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {!list.length && <p className="p-8 text-center text-espresso/50">Belum ada kategori.</p>}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Kategori' : 'Tambah Kategori'}>
        {form && (
          <div className="space-y-3">
            <div><label className="label">Nama</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Urutan tampil</label><input className="input" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
            <button className="btn-gold w-full" disabled={saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        )}
      </Modal>
    </>
  );
}
