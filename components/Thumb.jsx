import { Coffee } from 'lucide-react';

// Foto produk; kalau belum ada foto tampil placeholder elegan.
export default function Thumb({ src, name }) {
  if (src) return <img src={src} alt={name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />;
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-espresso via-[#2a2118] to-coffee">
      <Coffee className="h-9 w-9 text-gold/70" />
    </div>
  );
}
