import OrderList from '@/components/OrderList';
import PageHeader from '@/components/PageHeader';

export default function Page() {
  return (<><PageHeader title="Manajemen Pesanan" subtitle="Semua pesanan: detail, ubah status, batalkan, atau izinkan masuk dapur sebelum bayar." /><OrderList scope="all" role="admin" /></>);
}
