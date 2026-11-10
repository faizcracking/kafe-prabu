import OrderList from '@/components/OrderList';
import PageHeader from '@/components/PageHeader';

export default function Page() {
  return (<><PageHeader title="Pesanan Masuk" subtitle="Semua pesanan yang masih berjalan (realtime)." /><OrderList scope="active" role="kasir" /></>);
}
