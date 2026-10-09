import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { formatDate } from "../../lib/format";
import type { Page, Rfq } from "../../types";
import Badge from "../../components/ui/Badge";
import { EmptyState, ErrorNote, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";

const postLink = (
  <Link to="/post-requirement" className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
    Post Requirement
  </Link>
);

export default function CustomerRfqs() {
  const [page, setPage] = useState(0);
  const [rfqs, setRfqs] = useState<Page<Rfq> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRfqs(null);
    setError(null);
    api
      .get<Page<Rfq>>("/api/rfqs/mine", { params: { page } })
      .then((res) => setRfqs(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load your requirements")));
  }, [page]);

  return (
    <div>
      <PageHeader title="RFQs & Quotes" subtitle="Requirements you posted and the quotes suppliers sent back." action={postLink} />

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !rfqs ? (
          <SkeletonRows />
        ) : rfqs.content.length === 0 ? (
          <EmptyState
            title="No requirements yet"
            hint="Tell us what you need and verified suppliers will send you quotes to compare."
            action={postLink}
          />
        ) : (
          <div className="space-y-3">
            {rfqs.content.map((r) => (
              <Link
                key={r.id}
                to={`/customer/rfqs/${r.id}`}
                className="block rounded-2xl border border-coffee-100 bg-cream-50 p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-coffee-900">{r.title}</p>
                    <p className="text-xs text-coffee-400">
                      {r.categoryName} · Posted {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <Badge>{r.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-coffee-600">
                  <span>
                    Quantity:{" "}
                    <span className="font-semibold text-coffee-900">
                      {r.quantity} {r.unit}
                    </span>
                  </span>
                  <span>
                    Quotes: <span className="font-semibold text-coffee-900">{r.quoteCount}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <Pagination page={rfqs} onChange={setPage} />
      </div>
    </div>
  );
}
