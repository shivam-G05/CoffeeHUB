import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { Order } from "../../types";
import Badge from "../../components/ui/Badge";

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Order[]>("/api/orders")
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-coffee-900">All Orders</h1>

      {loading ? (
        <p className="mt-8 text-coffee-400">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="mt-8 text-coffee-400">No orders placed yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
          <table className="w-full text-left text-sm">
            <thead className="bg-coffee-100 text-coffee-600">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee-100">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium text-coffee-900">#{o.id}</td>
                  <td className="px-4 py-3 text-coffee-500">{o.customerName}</td>
                  <td className="px-4 py-3 text-coffee-500">{o.items.length} item(s)</td>
                  <td className="px-4 py-3 text-coffee-500">₹{o.totalAmount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <Badge tone={o.status}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-coffee-400">{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
