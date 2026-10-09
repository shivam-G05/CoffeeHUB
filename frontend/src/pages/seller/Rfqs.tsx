import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { formatDate } from "../../lib/format";
import type { Page, Rfq, VendorProfile } from "../../types";
import Badge from "../../components/ui/Badge";
import { EmptyState, ErrorNote, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";

export default function SellerRfqs() {
  const [pageIndex, setPageIndex] = useState(0);
  const [page, setPage] = useState<Page<Rfq> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);

  useEffect(() => {
    api
      .get<VendorProfile>("/api/vendor/me")
      .then((res) => setVendor(res.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<Page<Rfq>>("/api/vendor/rfqs", { params: { page: pageIndex, size: 10 } })
      .then((res) => setPage(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load RFQs")))
      .finally(() => setLoading(false));
  }, [pageIndex]);

  const unverified = vendor !== null && vendor.status !== "APPROVED";

  return (
    <div>
      <PageHeader title="RFQs" subtitle="Buyer requirements you have been invited to quote on." />

      {unverified && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          RFQ invitations are sent to verified sellers only. They will start arriving once your business is approved.{" "}
          <Link to="/seller/verification" className="font-semibold underline">
            Check verification status
          </Link>
        </p>
      )}

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : loading || !page ? (
          <SkeletonRows />
        ) : page.content.length === 0 ? (
          <EmptyState
            title="No RFQ invitations yet"
            hint={unverified ? "Invitations arrive after your business is verified." : "When a buyer's requirement matches what you sell, you will be invited to quote here."}
          />
        ) : (
          <ul className="space-y-3">
            {page.content.map((r) => (
              <li key={r.id}>
                <Link to={`/seller/rfqs/${r.id}`} className="block rounded-2xl border border-coffee-100 bg-cream-50 p-4 shadow-sm hover:border-coffee-300">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words font-semibold text-coffee-900">{r.title}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {r.invitationStatus && <Badge>{r.invitationStatus}</Badge>}
                      <Badge>{r.status}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-coffee-500">{r.categoryName}</p>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-coffee-700">
                    <span>
                      Quantity: {r.quantity} {r.unit}
                    </span>
                    <span>Deliver to: {r.deliveryLocation}</span>
                    <span>Required by: {formatDate(r.requiredBy)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!error && !loading && <Pagination page={page} onChange={setPageIndex} />}
      </div>
    </div>
  );
}
