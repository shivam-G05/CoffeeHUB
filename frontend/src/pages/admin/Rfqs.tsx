import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { formatDate, label } from "../../lib/format";
import type { Page, Rfq, RfqStatus } from "../../types";
import Badge from "../../components/ui/Badge";
import { EmptyState, ErrorNote, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";

const TABS: (RfqStatus | "")[] = ["SUBMITTED", "OPEN", "AWARDED", "REJECTED", "CANCELLED", ""];

export default function AdminRfqs() {
  const [status, setStatus] = useState<RfqStatus | "">("SUBMITTED");
  const [pageNo, setPageNo] = useState(0);
  const [rfqs, setRfqs] = useState<Page<Rfq> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<Page<Rfq>>("/api/admin/rfqs", { params: { status: status || undefined, page: pageNo } })
      .then((res) => setRfqs(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load RFQs")));
  }, [status, pageNo]);

  useEffect(load, [load]);

  return (
    <div>
      <PageHeader title="RFQs" subtitle="Buyer requirements. New ones wait here until you route them to matching vendors or reject them." />

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t || "ALL"}
            onClick={() => {
              setStatus(t);
              setPageNo(0);
              setRfqs(null);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
              status === t ? "bg-coffee-800 text-cream-50" : "bg-coffee-100 text-coffee-700 hover:bg-coffee-200"
            }`}
          >
            {t === "SUBMITTED" ? "Awaiting review" : t ? label(t) : "All"}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !rfqs ? (
          <SkeletonRows />
        ) : rfqs.content.length === 0 ? (
          <EmptyState title="No RFQs here" hint={status === "SUBMITTED" ? "No requirements are waiting to be routed." : undefined} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-coffee-600">
                <tr>
                  <th className="px-4 py-3">Requirement</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Invited</th>
                  <th className="px-4 py-3">Quotes</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {rfqs.content.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <Link to={`/admin/rfqs/${r.id}`} className="font-medium text-coffee-900 hover:underline">
                        {r.title}
                      </Link>
                      <p className="text-xs text-coffee-400">{formatDate(r.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-coffee-600">{r.buyerName}</td>
                    <td className="px-4 py-3 text-coffee-500">{r.categoryName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-600">
                      {r.quantity} {r.unit}
                    </td>
                    <td className="px-4 py-3 text-coffee-600">{r.invitedCount}</td>
                    <td className="px-4 py-3 text-coffee-600">{r.quoteCount}</td>
                    <td className="px-4 py-3">
                      <Badge>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={rfqs} onChange={setPageNo} />
      </div>
    </div>
  );
}
