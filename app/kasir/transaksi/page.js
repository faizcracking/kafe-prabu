import OrderList from '@/components/OrderList';
import PageHeader from '@/components/PageHeader';

export default function Page() {
  return (<><PageHeader title="Konfirmasi Pembayaran" subtitle="Tunai: terima uang dari pelanggan. QRIS: cek dulu dana masuk. Lalu tekan KONFIRMASI PEMBAYARAN." /><OrderList scope="payment" role="kasir" /></>);
}
