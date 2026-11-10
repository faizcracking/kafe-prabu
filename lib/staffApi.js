// Pemanggil API aksi staf (konfirmasi bayar, ubah status, batalkan).
export async function callStaff(body) {
  try {
    const res = await fetch('/api/staff/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: j.error || 'Terjadi kesalahan' };
    return { ok: true, ...j };
  } catch {
    return { ok: false, error: 'Koneksi bermasalah, coba lagi' };
  }
}
