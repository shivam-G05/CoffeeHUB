import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LifeBuoy } from "lucide-react";
import { api, apiErrorMessage, fileUrl } from "../../api/client";
import { useBrand } from "../../context/BrandContext";
import { DISPUTE_REASONS } from "../../lib/constants";
import { formatDate, formatDateTime, money } from "../../lib/format";
import type { Dispute } from "../../types";
import Badge from "../../components/ui/Badge";
import { Card, EmptyState, ErrorNote, Img, PageHeader, SkeletonRows } from "../../components/ui/Common";

const reasonLabel = (reason: Dispute["reason"]) => DISPUTE_REASONS.find((r) => r.value === reason)?.label ?? reason;

export default function CustomerDisputes() {
  const brand = useBrand();
  const [disputes, setDisputes] = useState<Dispute[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Dispute[]>("/api/disputes/mine")
      .then((res) => setDisputes(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load your disputes")));
  }, []);

  return (
    <div>
      <PageHeader title="Support & Disputes" subtitle="Problems you reported on orders, and how they were resolved." />

      <Card className="mt-6">
        <p className="flex items-center gap-2 font-semibold text-coffee-900">
          <LifeBuoy size={17} /> Need help with an order?
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-coffee-600">
          <li>
            Open the order from{" "}
            <Link to="/customer/orders" className="font-semibold text-coffee-800 underline">
              My Orders
            </Link>{" "}
            and choose &ldquo;Report a problem&rdquo; on the seller&rsquo;s part of the order. Add photos if you can.
          </li>
          <li>The seller is asked to respond, then the {brand.name} team reviews the case and decides on any refund.</li>
          <li>
            Answers to common questions are in the{" "}
            <Link to="/help" className="font-semibold text-coffee-800 underline">
              Help Centre
            </Link>
            .
          </li>
          <li>
            For anything else, email{" "}
            <a href={`mailto:${brand.supportEmail}`} className="break-all font-semibold text-coffee-800 underline">
              {brand.supportEmail}
            </a>
            .
          </li>
        </ul>
      </Card>

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !disputes ? (
          <SkeletonRows count={2} />
        ) : disputes.length === 0 ? (
          <EmptyState title="No disputes" hint="You have not reported a problem with any order." />
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => {
              const resolved = d.status === "RESOLVED_REFUND" || d.status === "RESOLVED_NO_REFUND";
              return (
                <Card key={d.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/customer/orders/${d.orderId}`} className="break-all font-semibold text-coffee-900 underline">
                        {d.subOrderNumber}
                      </Link>
                      <p className="text-xs text-coffee-400">
                        {d.vendorName} · Order total {money(d.orderTotal)} · Raised {formatDate(d.createdAt)}
                      </p>
                    </div>
                    <Badge>{d.status}</Badge>
                  </div>

                  <p className="mt-3 text-sm font-semibold text-coffee-800">{reasonLabel(d.reason)}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-coffee-700">{d.description}</p>

                  {d.evidenceUrls.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {d.evidenceUrls.map((url, i) => (
                        <a key={url} href={fileUrl(url)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-coffee-200">
                          <Img src={url} alt={`Evidence ${i + 1}`} className="h-16 w-16" />
                        </a>
                      ))}
                    </div>
                  )}

                  {d.vendorResponse && (
                    <div className="mt-4 rounded-xl bg-coffee-100/60 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-coffee-500">
                        Seller&rsquo;s response{d.vendorRespondedAt && <span className="font-normal normal-case"> · {formatDateTime(d.vendorRespondedAt)}</span>}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-coffee-800">{d.vendorResponse}</p>
                    </div>
                  )}

                  {resolved ? (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
                        Resolution{d.resolvedAt && <span className="font-normal normal-case"> · {formatDate(d.resolvedAt)}</span>}
                      </p>
                      {d.resolution && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-coffee-800">{d.resolution}</p>}
                      {d.refundAmount != null && d.refundAmount > 0 && (
                        <p className="mt-1 text-sm font-semibold text-green-800">Refund: {money(d.refundAmount)}</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-coffee-400">
                      {d.vendorResponse ? `The ${brand.name} team is reviewing this case.` : "Waiting for the seller to respond."}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
