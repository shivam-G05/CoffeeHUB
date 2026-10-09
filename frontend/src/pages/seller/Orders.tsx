import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { formatDate, label, money } from "../../lib/format";
import type { OrderStatus, Page, VendorOrder } from "../../types";
import Badge from "../../components/ui/Badge";
import { EmptyState, ErrorNote, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";

const FILTERS: OrderStatus[] = [
  "PLACED",
  "PAYMENT_CONFIRMED",
  "ACCEPTED",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
  "REFUNDED",
];

export default function SellerOrders() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [pageIndex, setPageIndex] = useState(0);
  const [page, setPage] = useState<Page<VendorOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<Page<VendorOrder>>("/api/vendor/orders", { params: { status: status || undefined, page: pageIndex, size: 10 } })
      .then((res) => setPage(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load orders")))
      .finally(() => setLoading(false));
  }, [status, pageIndex]);

  function pick(next: OrderStatus | "") {
    setStatus(next);
    setPageIndex(0);
  }

  const tab = (value: OrderStatus | "", text: string) => (
    <button
      key={value || "all"}
      onClick={() => pick(value)}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
        status === value ? "bg-coffee-800 text-cream-50" : "bg-coffee-100 text-coffee-700 hover:bg-coffee-200"
      }`}
    >
      {text}
    </button>
  );

  return (
    <div>
      <PageHeader title="Orders" subtitle="Orders for your products. Open one to update its fulfilment status." />

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {tab("", "All")}
        {FILTERS.map((s) => tab(s, label(s)))}
      </div>

      <div className="mt-4">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : loading || !page ? (
          <SkeletonRows />
        ) : page.content.length === 0 ? (
          <EmptyState title={status ? `No ${label(status).toLowerCase()} orders` : "No orders yet"} hint="Orders for your products will appear here." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-xs text-coffee-600">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {page.content.map((o) => (
                  <tr key={o.id} className="hover:bg-coffee-100/40">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link to={`/seller/orders/${o.id}`} className="font-semibold text-coffee-900 hover:underline">
                        {o.subOrderNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-500">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3 text-coffee-700">{o.buyerName ?? "—"}</td>
                    <td className="px-4 py-3 text-coffee-500">{o.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-coffee-800">{money(o.totalAmount)}</td>
                    <td className="px-4 py-3">{o.paymentStatus ? <Badge>{o.paymentStatus}</Badge> : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge>{o.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!error && !loading && <Pagination page={page} onChange={setPageIndex} />}
      </div>
    </div>
  );
}
