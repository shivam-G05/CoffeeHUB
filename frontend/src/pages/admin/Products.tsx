import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { Product } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .get<Product[]>("/api/admin/products")
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function setApproved(id: number, approved: boolean) {
    await api.put(`/api/products/${id}/approve`, null, { params: { approved } });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-coffee-900">Product Approvals</h1>
      <p className="mt-1 text-coffee-500">Review products submitted by sellers.</p>

      {loading ? (
        <p className="mt-8 text-coffee-400">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
          <table className="w-full text-left text-sm">
            <thead className="bg-coffee-100 text-coffee-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee-100">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-coffee-900">{p.name}</td>
                  <td className="px-4 py-3 text-coffee-500">{p.sellerName}</td>
                  <td className="px-4 py-3 text-coffee-500">{p.type}</td>
                  <td className="px-4 py-3 text-coffee-500">₹{p.price.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.approved ? "approved" : "pending"}>{p.approved ? "Approved" : "Pending"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.approved ? (
                      <Button variant="secondary" onClick={() => setApproved(p.id, false)}>
                        Unpublish
                      </Button>
                    ) : (
                      <Button onClick={() => setApproved(p.id, true)}>Approve</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
