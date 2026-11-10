'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Plus, Pencil, Trash2, Download, Printer, AlertTriangle } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';

export default function MejaPage() {
  const sb = supabaseBrowser();
  const toast = useToast();
  const [tables, setTables] = useState([]);
  const [qr, setQr] = useState({});
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState('');
  const isLocal = /(localhost|127\.0\.0\.1)/.test(base);

  useEffect(() => { setBase((process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '')); }, []);
  const load = async () => {
    const { data } = await sb.from('tables').select('*').order('number');
    setTables(data || []);
  };
  useEffect(() => { load(); // eslint-disable-next-line
  }, []);

  // Buat QR untuk setiap meja: URL = {SITE_URL}/meja/{nomor}
  useEffect(() => {
    if (!base) return;
    (async () => {
      const entries = await Promise.all(tables.map(async (t) => [t.number, await QRCode.toDataURL(`${base}/meja/${t.number}`, { width: 700, margin: 2, color: { dark: '#171717', light: '#FFFFFF' } })]));
      setQr(Object.fromEntries(entries));
    })();
  }, [tables, base]);

  const save = async () => {
    const number = parseInt(form.number, 10);
    if (!Number.isInteger(number) || number < 1) return toast('Nomor meja tidak valid', 'error');
    setSaving(true);
    const payload = { number, label: form.label?.trim() || `Meja ${number}`, is_active: form.is_active };
    const { error } = form.id ? await sb.from('tables').update(payload).eq('id', form.id) : await sb.from('tables').insert(payload);
    setSaving(false);
    if (error) return toast(error.code === '23505' ? 'Nomor meja sudah dipakai' : error.message, 'error');
    toast('Meja disimpan', 'success'); setForm(null); load();
  };
  const remove = async (t) => {
    if (!confirm(`Hapus Meja ${t.number}? QR Code meja ini tidak akan berfungsi lagi.`)) return;
    const { error } = await sb.from('tables').delete().eq('id', t.id);
    if (error) toast(error.message, 'error'); else { toast('Meja dihapus', 'success'); load(); }
  };
  const download = (t) => {
    const a = document.createElement('a');
    a.href = qr[t.number]; a.download = `qr-meja-${t.number}.png`; a.click();
  };
  const print = (list) => {
    const w = window.open('', '_blank');
    if (!w) return toast('Izinkan pop-up untuk mencetak', 'error');
    const cards = list.map((t) => `<div class="c"><div class="b">KAFE PRABU</div><img src="${qr[t.number]}"/><div class="n">MEJA ${t.number}</div><div class="s">Scan untuk memesan</div></div>`).join('');
    w.document.write(`<html><head><title>QR Meja</title><style>
      body{font-family:Arial,sans-serif;margin:0;padding:12px}
      .g{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
      .c{border:2px solid #C9A45C;border-radius:14px;padding:14px;text-align:center;break-inside:avoid}
      .b{letter-spacing:6px;font-weight:700;color:#171717}.n{font-size:28px;font-weight:800;margin-top:4px}.s{font-size:12px;color:#6B4935}
      img{width:78%}</style></head><body><div class="g">${cards}</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <>
      <PageHeader title="Meja & QR Code" subtitle={`${tables.length} meja • QR mengarah ke ${base || '…'}/meja/[nomor]`}>
        <button className="btn-ghost" onClick={() => print(tables.filter((t) => t.is_active))} disabled={!tables.length}><Printer className="h-4 w-4" />Cetak Semua QR</button>
        <button className="btn-gold" onClick={() => setForm({ id: null, number: String((tables.at(-1)?.number || 0) + 1), label: '', is_active: true })}><Plus className="h-4 w-4" />Tambah Meja</button>
      </PageHeader>

      {isLocal && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />QR saat ini mengarah ke alamat lokal. Setelah deploy ke Vercel, isi NEXT_PUBLIC_SITE_URL dengan domain Anda lalu deploy ulang sebelum mencetak QR.</p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {tables.map((t) => (
          <div key={t.id} className={`card overflow-hidden p-3 text-center ${t.is_active ? '' : 'opacity-50'}`}>
            {qr[t.number] ? <img src={qr[t.number]} alt={`QR meja ${t.number}`} className="mx-auto w-full rounded-lg" /> : <div className="aspect-square animate-pulse rounded-lg bg-espresso/10" />}
            <p className="mt-2 font-display text-lg font-semibold">Meja {t.number}</p>
            {!t.is_active && <p className="text-xs text-red-600">Nonaktif</p>}
            <div className="mt-2 flex justify-center gap-1.5">
              <button className="btn-ghost !p-2" onClick={() => download(t)} title="Download QR"><Download className="h-4 w-4" /></button>
              <button className="btn-ghost !p-2" onClick={() => print([t])} title="Cetak QR"><Printer className="h-4 w-4" /></button>
              <button className="btn-ghost !p-2" onClick={() => setForm({ ...t, number: String(t.number), label: t.label || '' })} title="Edit"><Pencil className="h-4 w-4" /></button>
              <button className="btn-ghost !p-2 text-red-600" onClick={() => remove(t)} title="Hapus"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Meja' : 'Tambah Meja'}>
        {form && (
          <div className="space-y-3">
            <div><label className="label">Nomor meja</label><input className="input" type="number" min="1" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
            <div><label className="label">Label (opsional)</label><input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Contoh: Indoor, VIP" /></div>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-[#C9A45C]" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Meja aktif</label>
            <button className="btn-gold w-full" disabled={saving} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        )}
      </Modal>
    </>
  );
}
