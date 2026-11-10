import KitchenBoard from '@/components/KitchenBoard';
import PageHeader from '@/components/PageHeader';

export default function Page() {
  return (<><PageHeader title="Daftar Pesanan" subtitle="Semua pesanan dapur hari ini." /><KitchenBoard layout="list" /></>);
}
