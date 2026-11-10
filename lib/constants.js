// Konstanta status pesanan, pembayaran, dan role.

export const ORDER_STATUS = {
  baru: { label: 'Menunggu pembayaran', color: 'bg-amber-100 text-amber-800' },
  menunggu_diproses: { label: 'Menunggu diproses', color: 'bg-sky-100 text-sky-800' },
  dimasak: { label: 'Sedang dimasak', color: 'bg-orange-100 text-orange-800' },
  siap: { label: 'Siap disajikan', color: 'bg-emerald-100 text-emerald-800' },
  selesai: { label: 'Selesai', color: 'bg-neutral-200 text-neutral-700' },
  dibatalkan: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
};
export const PAYMENT_STATUS = {
  menunggu: { label: 'Belum dibayar', color: 'bg-amber-100 text-amber-800' },
  lunas: { label: 'LUNAS', color: 'bg-emerald-100 text-emerald-800' },
  dibatalkan: { label: 'Batal', color: 'bg-red-100 text-red-700' },
};
export const PAYMENT_METHOD = { tunai: 'Tunai', qris: 'QRIS' };
export const ROLE_LABEL = { admin: 'Admin IT', kasir: 'Kasir', dapur: 'Dapur' };
export const ROLE_HOME = { admin: '/admin/dashboard', kasir: '/kasir/dashboard', dapur: '/dapur/dashboard' };
export const KITCHEN_STATUSES = ['menunggu_diproses', 'dimasak', 'siap', 'selesai'];

// Urutan perpindahan status oleh dapur/kasir
export const NEXT_STATUS = {
  menunggu_diproses: ['dimasak', 'Mulai masak'],
  dimasak: ['siap', 'Tandai siap disajikan'],
  siap: ['selesai', 'Selesai (sudah diantar)'],
};

// Langkah-langkah tracking untuk pelanggan
export function customerSteps(o) {
  const idx = { baru: 1, menunggu_diproses: 2, dimasak: 3, siap: 4, selesai: 5 }[o.status] ?? 1;
  const paid = o.payment_status === 'lunas';
  const payLabel = paid ? 'Pembayaran dikonfirmasi' : o.status === 'baru' ? 'Menunggu konfirmasi pembayaran' : 'Pembayaran diselesaikan di kasir';
  const labels = ['Pesanan diterima', payLabel, 'Sedang diproses dapur', 'Sedang disiapkan', 'Pesanan siap diantar', 'Pesanan selesai'];
  return labels.map((label, i) => ({
    label,
    done: i < idx || (o.status === 'selesai' && i === 5),
    current: i === idx && o.status !== 'selesai',
  }));
}
