export default function StatCard({ label, value, hint, icon: Icon, dark = false }) {
  return (
    <div className={`card p-5 ${dark ? '!bg-espresso !text-cream' : ''}`}>
      <div className="flex items-start justify-between">
        <p className={`text-xs font-semibold uppercase tracking-wide ${dark ? 'text-gold' : 'text-coffee'}`}>{label}</p>
        {Icon && <Icon className={`h-5 w-5 ${dark ? 'text-gold' : 'text-gold-dark'}`} />}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{value}</p>
      {hint && <p className={`mt-1 text-xs ${dark ? 'text-cream/60' : 'text-espresso/50'}`}>{hint}</p>}
    </div>
  );
}
