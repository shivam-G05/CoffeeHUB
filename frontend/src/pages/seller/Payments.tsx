import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { formatDate, money } from "../../lib/format";
import type { VendorPayments } from "../../types";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/ui/StatCard";
import { EmptyState, ErrorNote, PageHeader, SkeletonGrid, SkeletonRows } from "../../components/ui/Common";

export default function SellerPayments() {
  const [data, setData] = useState<VendorPayments | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<VendorPayments>("/api/vendor/payments")
      .then((res) => setData(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load your payments")));
  }, []);

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Payments" />
        <div className="mt-6 space-y-6">
          {error ? (
            <ErrorNote>{error}</ErrorNote>
          ) : (
            <>
              <SkeletonGrid count={4} className="h-28" />
              <SkeletonRows />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Payments" subtitle="What you have earned on each order, and what has been paid out to your bank account." />

      {data.payoutOnHold && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span className="font-semibold">Payouts are on hold.</span>{" "}
          {data.bankStatus ? "Your bank details have not been verified yet." : "You have not added bank details yet."}{" "}
          <Link to="/seller/verification" className="font-semibold underline">
            Review bank details
          </Link>
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending" value={money(data.pending)} hint="Orders not yet delivered and paid" />
        <StatCard label="Eligible for payout" value={money(data.eligible)} hint="Included in the next payout" />
        <StatCard label="On hold" value={money(data.onHold)} hint="Disputed or refund requested" />
        <StatCard label="Settled" value={money(data.settled)} hint="Already paid to you" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-coffee-700">
        <span>Bank account:</span>
        {data.bankStatus ? <Badge>{data.bankStatus}</Badge> : <span className="text-coffee-400">Not added</span>}
      </div>

      <h2 className="mt-8 text-lg font-bold text-coffee-900">Order ledger</h2>
      <div className="mt-3">
        {data.orders.length === 0 ? (
          <EmptyState title="No orders yet" hint="Each order's fees and your payout will be listed here." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-xs text-coffee-600">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Order value</th>
                  <th className="px-4 py-3 text-right">Platform fee</th>
                  <th className="px-4 py-3 text-right">Gateway fee</th>
                  <th className="px-4 py-3 text-right">Refund</th>
                  <th className="px-4 py-3 text-right">Your payout</th>
                  <th className="px-4 py-3">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {data.orders.map((o) => (
                  <tr key={o.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link to={`/seller/orders/${o.id}`} className="font-semibold text-coffee-900 hover:underline">
                        {o.subOrderNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-500">{formatDate(o.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-coffee-700">{money(o.totalAmount)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-coffee-500">{money(o.platformFee)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-coffee-500">{money(o.gatewayFee)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-coffee-500">{o.refundAmount > 0 ? money(o.refundAmount) : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-coffee-900">{money(o.vendorPayable)}</td>
                    <td className="px-4 py-3">{o.settlementStatus ? <Badge>{o.settlementStatus}</Badge> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="mt-8 text-lg font-bold text-coffee-900">Payout history</h2>
      <div className="mt-3">
        {data.settlements.length === 0 ? (
          <EmptyState title="No payouts yet" hint="Payouts are made for eligible orders once your bank details are verified." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-xs text-coffee-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {data.settlements.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-500">{formatDate(s.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-coffee-900">{money(s.amount)}</td>
                    <td className="px-4 py-3 text-right text-coffee-700">{s.orderCount}</td>
                    <td className="break-all px-4 py-3 text-coffee-700">{s.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
