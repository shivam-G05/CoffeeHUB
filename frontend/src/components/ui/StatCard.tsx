export default function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-coffee-100 bg-cream-50 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-coffee-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-coffee-400">{hint}</p>}
    </div>
  );
}
