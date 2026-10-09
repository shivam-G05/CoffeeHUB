import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { formatDate, label, money } from "../../lib/format";
import type { Order, Page } from "../../types";
import Badge from "../../components/ui/Badge";
import { EmptyState, ErrorNote, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";

export default function CustomerOrders() {
  const [page, setPage] = useState(0);
  const [orders, setOrders] = useState<Page<Order> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrders(null);
    setError(null);
    api
      .get<Page<Order>>("/api/orders/mine", { params: { page } })
      .then((res) => setOrders(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load your orders")));
  }, [page]);

  return (
    <div>
      <PageHeader title="My Orders" subtitle="Each seller ships their part of an order separately." />

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !orders ? (
          <SkeletonRows />
        ) : orders.content.length === 0 ? (
          <EmptyState
            title="No orders yet"
            hint="Products you buy on the marketplace will appear here."
            action={
              <Link to="/products" className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
                Explore Marketplace
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {orders.content.map((o) => (
              <Link
                key={o.id}
                to={`/customer/orders/${o.id}`}
                className="block rounded-2xl border border-coffee-100 bg-cream-50 p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-all font-semibold text-coffee-900">{o.orderNumber}</p>
                    <p className="text-xs text-coffee-400">{formatDate(o.createdAt)}</p>
                  </div>
                  <Badge>{o.status}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-coffee-900">{money(o.totalAmount)}</span>
                  {o.paymentMethod && <span className="text-coffee-500">· {label(o.paymentMethod)}</span>}
                  {o.paymentStatus && <Badge>{o.paymentStatus}</Badge>}
                </div>

                <ul className="mt-3 divide-y divide-coffee-100 border-t border-coffee-100 text-sm">
                  {o.vendorOrders.length > 0
                    ? o.vendorOrders.map((vo) => (
                        <li key={vo.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <span className="min-w-0 text-coffee-700">
                            <span className="break-all font-medium">{vo.subOrderNumber}</span>
                            <span className="text-coffee-500"> · {vo.vendorName}</span>
                          </span>
                          <Badge>{vo.status}</Badge>
                        </li>
                      ))
                    : o.items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                          <span className="min-w-0 text-coffee-700">
                            {item.productName} × {item.quantity}
                          </span>
                          <span className="shrink-0 text-coffee-500">{money(item.lineTotal)}</span>
                        </li>
                      ))}
                </ul>
              </Link>
            ))}
          </div>
        )}
        <Pagination page={orders} onChange={setPage} />
      </div>
    </div>
  );
}
