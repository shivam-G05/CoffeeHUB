import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { Order, OrderStatus } from "../../types";
import Badge from "../../components/ui/Badge";
import { Select } from "../../components/ui/Input";

const statuses: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

export default function SellerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .get<Order[]>("/api/orders/seller")
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function updateStatus(id: number, status: OrderStatus) {
    await api.put(`/api/orders/${id}/status`, { status });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-coffee-900">Orders</h1>

      {loading ? (
        <p className="mt-6 text-coffee-400">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-coffee-400">No orders yet for your products.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-coffee-100 bg-cream-50 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-coffee-900">
                    Order #{o.id} — {o.customerName}
                  </p>
                  <p className="text-xs text-coffee-400">{new Date(o.createdAt).toLocaleString("en-IN")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={o.status}>{o.status}</Badge>
                  <Select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                    className="w-auto"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        Mark as {s}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="mt-4 divide-y divide-coffee-100 text-sm">
                {o.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <span className="text-coffee-700">
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="text-coffee-500">₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
