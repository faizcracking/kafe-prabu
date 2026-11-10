'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { ROLE_LABEL } from '@/lib/constants';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';

const EMPTY = { id: null, email: '', password: '', full_name: '', role: 'kasir', is_active: true };

export default function PenggunaPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch('/api/admin/users', { cache: 'no-store' });
    const j = await res.json();
    if (!res.ok) return toast(j.error || 'Gagal memuat pengguna', 'error');
    setUsers(j.users); setMe(j.me);
  };
  useEffect(() => { load(); // eslint-disable-next-line
  }, []);

  const save = async () => {
    setSaving(true);
    const isNew = !form.id;
    const body = isNew ? { email: form.email, password: form.password, full_name: form.full_name, role: form.role }
      : { id: form.id, full_name: form.full_name, role: form.role, is_active: form.is_active, ...(form.password ? { password: form.password } : {}) };
    const res = await fetch('/api/admin/users', { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast(j.error || 'Gagal menyimpan', 'error');
    toast('Akun disimpan', 'success'); setForm(null); load();
  };

  return (
    <>
      <PageHeader title="Manajemen Pengguna" subtitle="Akun kasir & dapur dibuat oleh admin. Password dikelola Supabase Auth.">
        <button className="btn-gold" onClick={() => setForm({ ...EMPTY })}><Plus className="h-4 w-4" />Tambah Akun</button>
      </PageHeader>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-espresso text-xs uppercase tracking-wide text-gold"><tr><th className="p-3">Nama</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-espresso/10">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-cream/60">
                <td className="p-3 font-semibold">{u.full_name || '-'}{u.id === me && <span className="ml-2 text-xs text-gold-dark">(Anda)</span>}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3"><span className="rounded-full bg-espresso px-2.5 py-1 text-xs font-bold text-gold">{ROLE_LABEL[u.role]}</span></td>
                <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{u.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                <td className="p-3 text-right"><button className="btn-ghost !p-2" onClick={() => setForm({ ...u, password: '' })} aria-label="Edit"><Pencil className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Akun' : 'Tambah Akun'}>
        {form && (
          <div className="space-y-3">
            <div><label className="label">Nama lengkap</label><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><label className="label">Email</label><input className="input" type="email" disabled={!!form.id} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">{form.id ? 'Password baru (kosongkan jika tidak diubah)' : 'Password (min. 8 karakter)'}</label><input className="input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div><label className="label">Role / hak akses</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="kasir">Kasir — pesanan & pembayaran</option><option value="dapur">Dapur — antrean produksi</option><option value="admin">Admin IT — akses penuh</option>
              </select></div>
            {form.id && <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-[#C9A45C]" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Akun aktif (hilangkan centang untuk menonaktifkan)</label>}
            <button className="btn-gold w-full" disabled={saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        )}
      </Modal>
    </>
  );
}
