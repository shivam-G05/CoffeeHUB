import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { formatDate, money } from "../../lib/format";
import type { Page, Quote } from "../../types";
import Badge from "../../components/ui/Badge";
import { EmptyState, ErrorNote, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";

export default function AdminQuotes() {
  const [pageNo, setPageNo] = useState(0);
  const [quotes, setQuotes] = useState<Page<Quote> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api
      .get<Page<Quote>>("/api/admin/quotes", { params: { page: pageNo } })
      .then((res) => setQuotes(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load quotes")));
  }, [pageNo]);

  return (
    <div>
      <PageHeader title="Quotes" subtitle="Every quote vendors have submitted against buyer requirements, newest first." />

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !quotes ? (
          <SkeletonRows />
        ) : quotes.content.length === 0 ? (
          <EmptyState title="No quotes yet" hint="Quotes appear here once invited vendors respond to an RFQ." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-coffee-600">
                <tr>
                  <th className="px-4 py-3">RFQ</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Price / unit</th>
                  <th className="px-4 py-3">Estimated total</th>
                  <th className="px-4 py-3">Lead time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {quotes.content.map((q) => (
                  <tr key={q.id}>
                    <td className="px-4 py-3">
                      <Link to={`/admin/rfqs/${q.rfqId}`} className="font-medium text-coffee-900 hover:underline">
                        {q.rfqTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-coffee-600">{q.vendorName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-600">{money(q.pricePerUnit)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-600">{money(q.estimatedTotal)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-500">{q.leadTimeDays != null ? `${q.leadTimeDays} days` : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge>{q.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-500">{formatDate(q.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={quotes} onChange={setPageNo} />
      </div>
    </div>
  );
}
