// Grafik batang sederhana (tanpa library).
const compact = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });

export default function BarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-56 items-end gap-1.5 sm:gap-2">
      {data.map((d) => (
        <div key={d.label} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${d.label}: Rp ${Math.round(d.value).toLocaleString('id-ID')}`}>
          <span className="mb-1 hidden text-[10px] font-semibold text-coffee group-hover:block sm:text-xs">{compact.format(d.value)}</span>
          <div className="w-full rounded-t-lg bg-gradient-to-t from-coffee to-gold transition-all duration-500 group-hover:opacity-80" style={{ height: `${Math.max(2, (d.value / max) * 82)}%` }} />
          <span className="mt-1 w-full truncate text-center text-[10px] text-espresso/60">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
