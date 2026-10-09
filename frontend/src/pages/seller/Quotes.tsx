import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { formatDate, money } from "../../lib/format";
import type { Page, Quote } from "../../types";
import Badge from "../../components/ui/Badge";
import { EmptyState, ErrorNote, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";

export default function SellerQuotes() {
  const [pageIndex, setPageIndex] = useState(0);
  const [page, setPage] = useState<Page<Quote> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<Page<Quote>>("/api/vendor/quotes", { params: { page: pageIndex, size: 10 } })
      .then((res) => setPage(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load your quotes")))
      .finally(() => setLoading(false));
  }, [pageIndex]);

  return (
    <div>
      <PageHeader title="Quotes" subtitle="Every quote you have sent in response to an RFQ." />

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : loading || !page ? (
          <SkeletonRows />
        ) : page.content.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            hint="Open an RFQ you were invited to and submit a quote."
            action={
              <Link to="/seller/rfqs" className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
                View RFQs
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-xs text-coffee-600">
                <tr>
                  <th className="px-4 py-3">RFQ</th>
                  <th className="px-4 py-3">Price / unit</th>
                  <th className="px-4 py-3">Estimated total</th>
                  <th className="px-4 py-3">Lead time</th>
                  <th className="px-4 py-3">Valid until</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {page.content.map((q) => (
                  <tr key={q.id}>
                    <td className="min-w-[10rem] px-4 py-3">
                      <Link to={`/seller/rfqs/${q.rfqId}`} className="font-semibold text-coffee-900 hover:underline">
                        {q.rfqTitle}
                      </Link>
                      <p className="text-xs text-coffee-400">Sent {formatDate(q.createdAt)}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-700">{money(q.pricePerUnit)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-coffee-800">{money(q.estimatedTotal)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-500">{q.leadTimeDays != null ? `${q.leadTimeDays} days` : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-500">{formatDate(q.validUntil)}</td>
                    <td className="px-4 py-3">
                      <Badge>{q.status}</Badge>
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
