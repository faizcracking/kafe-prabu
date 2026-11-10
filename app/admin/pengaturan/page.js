'use client';
import { useEffect, useState } from 'react';
import { Save, ImagePlus } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { uploadAsset } from '@/lib/upload';
import { useToast } from '@/components/Toast';
import PageHeader from '@/components/PageHeader';

export default function PengaturanPage() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    sb.from('cafe_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setS(data || { name: 'KAFE PRABU', tax_percent: 10, service_percent: 5 }));
    // eslint-disable-next-line
  }, []);

  const upload = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(field);
    try { const url = await uploadAsset(sb, file, field === 'logo_url' ? 'logo' : 'qris'); setS((x) => ({ ...x, [field]: url })); }
    catch (err) { toast(err.message || 'Upload gagal', 'error'); }
    setUploading(''); e.target.value = '';
  };

  const save = async () => {
    const tax = Number(s.tax_percent), svc = Number(s.service_percent);
    if (!s.name?.trim()) return toast('Nama kafe wajib diisi', 'error');
    if (!(tax >= 0 && tax <= 100) || !(svc >= 0 && svc <= 100)) return toast('Pajak dan biaya layanan harus 0–100%', 'error');
    setSaving(true);
    const { error } = await sb.from('cafe_settings').upsert({
      id: 1, name: s.name.trim(), logo_url: s.logo_url || null, address: s.address || null, whatsapp: s.whatsapp || null,
      qris_url: s.qris_url || null, tax_percent: tax, service_percent: svc,
    });
    setSaving(false);
    if (error) toast(error.message, 'error'); else toast('Pengaturan disimpan', 'success');
  };

  if (!s) return <p className="py-10 text-center text-espresso/50">Memuat…</p>;
  const Img = ({ field, label, hint }) => (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-dashed border-espresso/20 bg-cream">{s[field] ? <img src={s[field]} alt={label} className="h-full w-full object-contain" /> : <span className="text-xs text-espresso/40">Belum ada</span>}</div>
        <div><label className="btn-ghost cursor-pointer"><ImagePlus className="h-4 w-4" />{uploading === field ? 'Mengunggah…' : 'Pilih gambar'}<input type="file" accept="image/*" className="hidden" onChange={(e) => upload(field, e)} /></label><p className="mt-1 text-xs text-espresso/50">{hint}</p></div>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader title="Pengaturan Kafe"><button className="btn-gold" onClick={save} disabled={saving}><Save className="h-4 w-4" />{saving ? 'Menyimpan…' : 'Simpan Pengaturan'}</button></PageHeader>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card space-y-4 p-5">
          <h2 className="font-display text-xl font-semibold">Identitas</h2>
          <div><label className="label">Nama kafe</label><input className="input" value={s.name || ''} onChange={(e) => setS({ ...s, name: e.target.value })} /></div>
          <div><label className="label">Alamat</label><textarea className="input" rows={2} value={s.address || ''} onChange={(e) => setS({ ...s, address: e.target.value })} /></div>
          <div><label className="label">Nomor WhatsApp</label><input className="input" placeholder="628123456789" value={s.whatsapp || ''} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} /></div>
          <Img field="logo_url" label="Logo kafe" hint="PNG/JPG, maks. 3 MB" />
        </div>
        <div className="card space-y-4 p-5">
          <h2 className="font-display text-xl font-semibold">Pembayaran & Biaya</h2>
          <Img field="qris_url" label="Gambar QRIS pembayaran" hint="Unggah QRIS milik kafe. Pembayaran diverifikasi manual oleh kasir." />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Pajak (%)</label><input className="input" type="number" min="0" max="100" step="0.5" value={s.tax_percent} onChange={(e) => setS({ ...s, tax_percent: e.target.value })} /></div>
            <div><label className="label">Biaya layanan (%)</label><input className="input" type="number" min="0" max="100" step="0.5" value={s.service_percent} onChange={(e) => setS({ ...s, service_percent: e.target.value })} /></div>
          </div>
          <p className="text-xs text-espresso/50">Berlaku untuk pesanan baru. Total tetap dihitung ulang di server.</p>
        </div>
      </div>
    </>
  );
}
