import { Coffee } from 'lucide-react';

export default function Logo({ logoUrl, name = 'KAFE PRABU', light = true, size = 'md' }) {
  const box = size === 'lg' ? 'h-14 w-14' : 'h-9 w-9';
  return (
    <div className="flex items-center gap-3">
      {logoUrl ? (
        <img src={logoUrl} alt={name} className={`${box} rounded-full object-cover ring-2 ring-gold`} />
      ) : (
        <div className={`${box} flex items-center justify-center rounded-full bg-gold text-espresso`}><Coffee className={size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'} /></div>
      )}
      <span className={`font-display font-semibold tracking-[0.2em] ${size === 'lg' ? 'text-2xl' : 'text-base'} ${light ? 'text-gold' : 'text-espresso'}`}>{name}</span>
    </div>
  );
}
