import './globals.css';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import { CartProvider } from '@/lib/cart';
import { ToastProvider } from '@/components/Toast';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' });
const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });

export const metadata = {
  title: 'KAFE PRABU — Pesan Langsung dari Meja Anda',
  description: 'Sistem pemesanan dine-in berbasis QR Code untuk Kafe Prabu.',
};
export const viewport = { themeColor: '#171717', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${sans.variable} ${display.variable}`}>
      <body>
        <ToastProvider>
          <CartProvider>{children}</CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
