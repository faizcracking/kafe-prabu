import OrderList from '@/components/OrderList';
import PageHeader from '@/components/PageHeader';

export default function Page() {
  return (<><PageHeader title="Riwayat Transaksi" subtitle="Pesanan selesai & dibatalkan. Filter tanggal, cari nomor pesanan, cetak struk." /><OrderList scope="history" role="kasir" /></>);
}
