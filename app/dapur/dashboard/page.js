import KitchenBoard from '@/components/KitchenBoard';
import PageHeader from '@/components/PageHeader';

export default function Page() {
  return (<><PageHeader title="Dapur" subtitle="Pesanan masuk otomatis setelah pembayaran dikonfirmasi kasir." /><KitchenBoard layout="kanban" /></>);
}
