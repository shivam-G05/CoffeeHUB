import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { Order } from "../../types";
import Badge from "../../components/ui/Badge";

export default function CustomerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Order[]>("/api/orders/mine")
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-coffee-900">My Orders</h1>

      {loading ? (
        <p className="mt-6 text-coffee-400">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-coffee-400">You haven&rsquo;t placed any orders yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-coffee-100 bg-cream-50 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-coffee-900">Order #{o.id}</p>
                  <p className="text-xs text-coffee-400">{new Date(o.createdAt).toLocaleString("en-IN")}</p>
                </div>
                <Badge tone={o.status}>{o.status}</Badge>
              </div>
              <div className="mt-4 divide-y divide-coffee-100 text-sm">
                {o.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <span className="text-coffee-700">
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="text-coffee-500">
                      ₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end border-t border-coffee-100 pt-3 text-sm font-semibold text-coffee-900">
                Total: ₹{o.totalAmount.toLocaleString("en-IN")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
