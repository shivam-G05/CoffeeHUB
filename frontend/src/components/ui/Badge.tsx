const styles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  approved: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
};

export default function Badge({ children, tone }: { children: string; tone?: string }) {
  const cls = styles[tone ?? children] ?? "bg-coffee-100 text-coffee-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}
