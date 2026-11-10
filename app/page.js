import Link from 'next/link';
import { QrCode, UtensilsCrossed, Wallet, ArrowRight, Coffee } from 'lucide-react';

export default function Home() {
  const steps = [
    [QrCode, 'Scan QR di meja', 'Duduk, lalu scan QR Code di meja Anda. Nomor meja terbaca otomatis.'],
    [UtensilsCrossed, 'Pilih menu favorit', 'Telusuri menu, tambahkan catatan khusus, lalu checkout tanpa daftar akun.'],
    [Wallet, 'Bayar & nikmati', 'Pilih Tunai atau QRIS. Pantau status pesanan Anda secara langsung.'],
  ];
  return (
    <main>
      <section className="relative overflow-hidden bg-espresso text-cream">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-coffee/40 blur-3xl" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-5xl flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-8 flex h-20 w-20 animate-fade-up items-center justify-center rounded-full bg-gold text-espresso shadow-2xl shadow-gold/30"><Coffee className="h-10 w-10" /></div>
          <p className="animate-fade-up text-xs uppercase tracking-[0.5em] text-gold">Modern Luxury Café</p>
          <h1 className="mt-4 animate-fade-up font-display text-5xl font-semibold tracking-[0.12em] sm:text-7xl">KAFE <span className="text-gold">PRABU</span></h1>
          <p className="mt-6 max-w-xl animate-fade-up text-base text-cream/70 sm:text-lg">Pesan langsung dari meja Anda. Tanpa antre, tanpa registrasi — cukup scan, pilih, dan nikmati.</p>
          <div className="mt-10 flex animate-fade-up flex-wrap justify-center gap-3">
            <Link href="/menu" className="btn-gold px-7 py-3.5 text-base">Lihat Menu <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <p className="mt-6 text-sm text-cream/50">Untuk memesan, scan QR Code yang tersedia di meja Anda.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center font-display text-3xl font-semibold">Cara Memesan</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {steps.map(([Icon, title, text], i) => (
            <div key={title} className="card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-espresso text-gold"><Icon className="h-6 w-6" /></div>
              <p className="text-xs font-bold text-gold-dark">LANGKAH {i + 1}</p>
              <h3 className="mt-1 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-espresso/65">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-espresso/10 py-6 text-center text-xs text-espresso/50">
        © {new Date().getFullYear()} KAFE PRABU · <Link href="/login" className="underline hover:text-coffee">Login Staf</Link>
      </footer>
    </main>
  );
}
