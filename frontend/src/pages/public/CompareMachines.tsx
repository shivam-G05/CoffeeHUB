import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Cog } from "lucide-react";
import { api } from "../../api/client";
import type { Product } from "../../types";
import { StarRating } from "../../components/ui/StarRating";

export default function CompareMachines() {
  const [params] = useSearchParams();
  const ids = (params.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => !Number.isNaN(n));
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(ids.map((id) => api.get<Product>(`/api/products/${id}`).then((res) => res.data))).then((data) => {
      setProducts(data);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get("ids")]);

  const rows: { label: string; render: (p: Product) => string | number }[] = [
    { label: "Price", render: (p) => `₹${p.price.toLocaleString("en-IN")}` },
    { label: "Category", render: (p) => p.category ?? "—" },
    { label: "Rating", render: (p) => (p.avgRating > 0 ? `${p.avgRating.toFixed(1)} / 5 (${p.reviewCount})` : "No reviews yet") },
    { label: "Stock", render: (p) => (p.stock > 0 ? `${p.stock} available` : "Out of stock") },
    { label: "Seller", render: (p) => p.sellerName },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link to="/products" className="inline-flex items-center gap-1 text-sm font-medium text-coffee-500 hover:text-coffee-800">
        <ArrowLeft size={16} /> Back to Beans &amp; Machines
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-coffee-900">Compare Machines</h1>

      {loading ? (
        <p className="mt-8 text-coffee-400">Loading…</p>
      ) : products.length === 0 ? (
        <p className="mt-8 text-coffee-400">
          No machines selected. Go back to{" "}
          <Link to="/products" className="font-semibold text-coffee-700 underline">
            Beans &amp; Machines
          </Link>{" "}
          and pick a few to compare.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[600px] border-separate border-spacing-0 overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50 text-sm">
            <thead>
              <tr>
                <th className="w-40 border-b border-coffee-100 bg-coffee-100 p-4 text-left"></th>
                {products.map((p) => (
                  <th key={p.id} className="border-b border-coffee-100 bg-coffee-100 p-4 text-left">
                    <div className="flex flex-col items-start gap-2">
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-coffee-200">
                        <Cog size={24} className="text-coffee-500" />
                      </div>
                      <Link to={`/products/${p.id}`} className="font-semibold text-coffee-900 hover:underline">
                        {p.name}
                      </Link>
                      <StarRating rating={p.avgRating} count={p.reviewCount} size={12} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="border-b border-coffee-100 p-4 font-medium text-coffee-500">{row.label}</td>
                  {products.map((p) => (
                    <td key={p.id} className="border-b border-coffee-100 p-4 text-coffee-800">
                      {row.render(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
