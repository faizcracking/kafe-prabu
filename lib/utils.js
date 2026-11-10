// Fungsi bantu umum (format Rupiah, tanggal zona WIB, dll).
export const cn = (...a) => a.filter(Boolean).join(' ');

export const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
// Versi sederhana untuk PDF/Excel
export const rp = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');

export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });

// ---- Tanggal dalam zona WIB (UTC+7). "key" = string 'YYYY-MM-DD' ----
const WIB = 7 * 3600 * 1000;
export const wibKey = (d) => new Date(new Date(d).getTime() + WIB).toISOString().slice(0, 10);
export const todayKey = () => wibKey(Date.now());
export const startOfDayISO = (key) => new Date(`${key}T00:00:00+07:00`).toISOString();
export const addDays = (key, n) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Bunyi notifikasi singkat (dipakai kasir/dapur saat ada pesanan baru)
export function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [880, 1175].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f; o.type = 'sine';
      o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.start(t); o.stop(t + 0.18);
    });
  } catch {}
}
