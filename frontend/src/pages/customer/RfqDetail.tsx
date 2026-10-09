import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { api, apiErrorMessage, track } from "../../api/client";
import { useBrand } from "../../context/BrandContext";
import { useToast } from "../../context/ToastContext";
import { formatDate, money } from "../../lib/format";
import type { Quote, Rfq } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Card, EmptyState, ErrorNote, Modal, SkeletonRows, VerifiedBadge } from "../../components/ui/Common";
import { StarRating } from "../../components/ui/StarRating";

const dash = <span className="text-coffee-300">—</span>;

function Best({ children, tag }: { children: ReactNode; tag: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 font-bold text-green-700">
      {children}
      <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-800">{tag}</span>
    </span>
  );
}

function isExpired(quote: Quote) {
  if (!quote.validUntil) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return quote.validUntil.slice(0, 10) < today;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-coffee-400">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-coffee-800">{children}</dd>
    </div>
  );
}

export default function CustomerRfqDetail() {
  const { id } = useParams();
  const brand = useBrand();
  const { showToast } = useToast();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState<Quote | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    api
      .get<Rfq>(`/api/rfqs/${id}`)
      .then((res) => setRfq(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Requirement not found")));
  }, [id]);

  useEffect(() => {
    setRfq(null);
    setError(null);
    load();
  }, [load]);

  async function selectSupplier() {
    if (!rfq || !selecting) return;
    setBusy(true);
    try {
      const res = await api.post<Rfq>(`/api/rfqs/${rfq.id}/quotes/${selecting.id}/select`);
      track("quote_accepted", selecting.id);
      setRfq(res.data);
      setSelecting(null);
      showToast(`${selecting.vendorName} selected`, "success");
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not select this supplier"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function cancelRfq() {
    if (!rfq) return;
    setBusy(true);
    try {
      const res = await api.post<Rfq>(`/api/rfqs/${rfq.id}/cancel`);
      setRfq(res.data);
      setCancelling(false);
      showToast("Requirement cancelled", "success");
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not cancel the requirement"), "error");
    } finally {
      setBusy(false);
    }
  }

  const back = (
    <Link to="/customer/rfqs" className="inline-flex items-center gap-1 text-sm font-medium text-coffee-600 hover:underline">
      <ArrowLeft size={14} /> All requirements
    </Link>
  );

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        {back}
      </div>
    );
  }
  if (!rfq) return <SkeletonRows count={3} />;

  const quotes = rfq.quotes ?? [];
  const selected = quotes.find((q) => q.id === rfq.selectedQuoteId);
  const comparable = quotes.filter((q) => q.status !== "WITHDRAWN");
  const lowestTotal = comparable.length > 1 ? Math.min(...comparable.map((q) => q.estimatedTotal)) : null;
  const leadTimes = comparable.flatMap((q) => (q.leadTimeDays != null ? [q.leadTimeDays] : []));
  const shortestLead = leadTimes.length > 1 ? Math.min(...leadTimes) : null;
  const canSelect = (q: Quote) => rfq.status === "OPEN" && q.status === "SUBMITTED";

  const explanation: Record<Rfq["status"], string> = {
    SUBMITTED: `Your requirement is being reviewed by the ${brand.name} team. Once approved it is sent to matching verified suppliers.`,
    OPEN:
      rfq.invitedCount > 0
        ? `Your requirement is with ${rfq.invitedCount} ${rfq.invitedCount === 1 ? "supplier" : "suppliers"}. Quotes appear below as they arrive.`
        : "Your requirement is open. Quotes appear below as they arrive.",
    AWARDED: selected ? `You selected ${selected.vendorName} for this requirement.` : "You selected a supplier for this requirement.",
    REJECTED: "This requirement could not be sent to suppliers.",
    CANCELLED: "You cancelled this requirement. Suppliers can no longer quote on it.",
  };

  const rows: { label: string; render: (q: Quote) => ReactNode }[] = [
    { label: `Price / ${rfq.unit}`, render: (q) => <span className="font-semibold text-coffee-900">{money(q.pricePerUnit)}</span> },
    {
      label: "Estimated total",
      render: (q) =>
        lowestTotal != null && q.status !== "WITHDRAWN" && q.estimatedTotal === lowestTotal ? (
          <Best tag="Lowest">{money(q.estimatedTotal)}</Best>
        ) : (
          <span className="font-semibold text-coffee-900">{money(q.estimatedTotal)}</span>
        ),
    },
    { label: "MOQ", render: (q) => (q.moq != null ? `${q.moq} ${rfq.unit}` : dash) },
    { label: "Available quantity", render: (q) => (q.availableQuantity != null ? `${q.availableQuantity} ${rfq.unit}` : dash) },
    { label: "Tax", render: (q) => (q.taxPercent != null ? `${q.taxPercent}%` : dash) },
    { label: "Shipping", render: (q) => (q.shippingCost != null ? (q.shippingCost > 0 ? money(q.shippingCost) : "Free") : dash) },
    {
      label: "Lead time",
      render: (q) => {
        if (q.leadTimeDays == null) return dash;
        const text = `${q.leadTimeDays} ${q.leadTimeDays === 1 ? "day" : "days"}`;
        return shortestLead != null && q.status !== "WITHDRAWN" && q.leadTimeDays === shortestLead ? <Best tag="Fastest">{text}</Best> : text;
      },
    },
    {
      label: "Quote valid until",
      render: (q) =>
        q.validUntil ? (
          <span className={isExpired(q) ? "text-red-600" : ""}>
            {formatDate(q.validUntil)}
            {isExpired(q) && " (expired)"}
          </span>
        ) : (
          dash
        ),
    },
    { label: "Sample cost", render: (q) => (q.sampleCost != null ? (q.sampleCost > 0 ? money(q.sampleCost) : "Free") : dash) },
    { label: "Verification", render: (q) => (q.vendorVerified ? <VerifiedBadge compact /> : <span className="text-coffee-400">Not verified</span>) },
    { label: "Rating", render: (q) => <StarRating rating={q.vendorRating} count={q.vendorReviewCount} size={12} /> },
    { label: "Location", render: (q) => q.vendorLocation || dash },
    { label: "Notes", render: (q) => (q.notes ? <span className="whitespace-pre-wrap break-words">{q.notes}</span> : dash) },
  ];

  const quoteActions = (q: Quote) => (
    <div className="flex flex-col items-start gap-2">
      {canSelect(q) && (
        <Button onClick={() => setSelecting(q)} disabled={busy || isExpired(q)} title={isExpired(q) ? "This quote has expired" : undefined}>
          Select Supplier
        </Button>
      )}
      <Link to={`/suppliers/${q.vendorSlug}`} className="text-xs font-semibold text-coffee-700 underline">
        View storefront
      </Link>
    </div>
  );

  return (
    <div>
      {back}

      <Card className="mt-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold text-coffee-900 sm:text-2xl">{rfq.title}</h1>
            <p className="mt-1 text-sm text-coffee-500">
              {rfq.categoryName} · Posted {formatDate(rfq.createdAt)}
            </p>
          </div>
          <Badge>{rfq.status}</Badge>
        </div>

        <div className="mt-4 rounded-lg bg-coffee-100/60 px-3 py-2 text-sm text-coffee-800">
          <p>{explanation[rfq.status]}</p>
          {rfq.status === "REJECTED" && rfq.adminNote && <p className="mt-1 whitespace-pre-wrap break-words font-medium">Reason: {rfq.adminNote}</p>}
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Quantity">
            {rfq.quantity} {rfq.unit}
          </Fact>
          <Fact label="Target price">{rfq.targetPrice != null ? `${money(rfq.targetPrice)} / ${rfq.unit}` : "Not specified"}</Fact>
          <Fact label="Delivery location">{rfq.deliveryLocation}</Fact>
          <Fact label="Required by">{rfq.requiredBy ? formatDate(rfq.requiredBy) : "Flexible"}</Fact>
          {rfq.coffeeType && <Fact label="Coffee type">{rfq.coffeeType}</Fact>}
          {rfq.productName && (
            <Fact label="Related product">
              {rfq.productId ? (
                <Link to={`/products/${rfq.productId}`} className="underline">
                  {rfq.productName}
                </Link>
              ) : (
                rfq.productName
              )}
            </Fact>
          )}
          <Fact label="Sample required">{rfq.sampleRequired ? "Yes" : "No"}</Fact>
          <Fact label="Private label">{rfq.privateLabelRequired ? "Yes" : "No"}</Fact>
          {rfq.specification && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Fact label="Specification">{rfq.specification}</Fact>
            </div>
          )}
          {rfq.additionalRequirements && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Fact label="Additional requirements">{rfq.additionalRequirements}</Fact>
            </div>
          )}
        </dl>

        {(rfq.status === "SUBMITTED" || rfq.status === "OPEN") && (
          <div className="mt-5 border-t border-coffee-100 pt-4">
            <Button variant="danger" disabled={busy} onClick={() => setCancelling(true)}>
              Cancel requirement
            </Button>
          </div>
        )}
      </Card>

      {selected && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-green-800">
            <Trophy size={15} /> Selected supplier
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/suppliers/${selected.vendorSlug}`} className="text-lg font-bold text-coffee-900 hover:underline">
                  {selected.vendorName}
                </Link>
                {selected.vendorVerified && <VerifiedBadge compact />}
              </div>
              <p className="mt-1 text-sm text-coffee-700">
                {money(selected.pricePerUnit)} / {rfq.unit} · Estimated total{" "}
                <span className="font-semibold text-coffee-900">{money(selected.estimatedTotal)}</span>
                {selected.leadTimeDays != null && <> · {selected.leadTimeDays} days lead time</>}
              </p>
            </div>
            <Link to="/customer/messages" className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
              Message supplier
            </Link>
          </div>
          <p className="mt-2 text-xs text-coffee-600">A conversation with this supplier has been opened in your messages to finalise the order.</p>
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold text-coffee-900">
        Compare quotes{quotes.length > 0 && <span className="font-normal text-coffee-400"> ({quotes.length})</span>}
      </h2>

      <div className="mt-3">
        {quotes.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            hint={
              rfq.status === "SUBMITTED"
                ? "Suppliers can quote once your requirement has been reviewed."
                : rfq.status === "OPEN"
                  ? "Invited suppliers have been notified. Check back soon."
                  : "No supplier quoted on this requirement."
            }
          />
        ) : (
          <>
            {/* Desktop: one column per supplier */}
            <div className="hidden overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50 shadow-sm md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-coffee-100 align-top">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-coffee-400">Supplier</th>
                    {quotes.map((q) => (
                      <th key={q.id} className={`min-w-[11rem] px-4 py-3 font-normal ${q.id === rfq.selectedQuoteId ? "bg-green-50" : ""}`}>
                        <Link to={`/suppliers/${q.vendorSlug}`} className="font-semibold text-coffee-900 hover:underline">
                          {q.vendorName}
                        </Link>
                        {q.status !== "SUBMITTED" && (
                          <div className="mt-1">
                            <Badge>{q.status}</Badge>
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-100">
                  {rows.map((row) => (
                    <tr key={row.label} className="align-top">
                      <th scope="row" className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-coffee-500">
                        {row.label}
                      </th>
                      {quotes.map((q) => (
                        <td key={q.id} className={`px-4 py-2.5 text-coffee-700 ${q.id === rfq.selectedQuoteId ? "bg-green-50" : ""}`}>
                          {row.render(q)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="align-top">
                    <td />
                    {quotes.map((q) => (
                      <td key={q.id} className={`px-4 py-3 ${q.id === rfq.selectedQuoteId ? "bg-green-50" : ""}`}>
                        {quoteActions(q)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile: one card per quote, same rows */}
            <div className="space-y-4 md:hidden">
              {quotes.map((q) => (
                <div
                  key={q.id}
                  className={`rounded-2xl border p-4 shadow-sm ${q.id === rfq.selectedQuoteId ? "border-green-200 bg-green-50" : "border-coffee-100 bg-cream-50"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link to={`/suppliers/${q.vendorSlug}`} className="min-w-0 break-words font-semibold text-coffee-900 hover:underline">
                      {q.vendorName}
                    </Link>
                    {q.status !== "SUBMITTED" && <Badge>{q.status}</Badge>}
                  </div>
                  <dl className="mt-3 divide-y divide-coffee-100 text-sm">
                    {rows.map((row) => (
                      <div key={row.label} className="flex items-start justify-between gap-4 py-2">
                        <dt className="shrink-0 text-xs font-semibold text-coffee-500">{row.label}</dt>
                        <dd className="min-w-0 text-right text-coffee-700">{row.render(q)}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-3">{quoteActions(q)}</div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-coffee-400">
              Estimated total = price per {rfq.unit} × {rfq.quantity} {rfq.unit}, plus tax and shipping.
            </p>
          </>
        )}
      </div>

      {selecting && (
        <Modal title="Select this supplier?" onClose={() => !busy && setSelecting(null)}>
          <p className="text-sm text-coffee-700">
            You are selecting <span className="font-semibold text-coffee-900">{selecting.vendorName}</span> at {money(selecting.pricePerUnit)} / {rfq.unit}{" "}
            (estimated total {money(selecting.estimatedTotal)}).
          </p>
          <p className="mt-2 text-sm text-coffee-500">
            The other quotes will be declined and the requirement closes. A conversation opens with the supplier so you can finalise the order.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => setSelecting(null)}>
              Not yet
            </Button>
            <Button disabled={busy} onClick={selectSupplier}>
              {busy ? "Selecting…" : "Confirm selection"}
            </Button>
          </div>
        </Modal>
      )}

      {cancelling && (
        <Modal title="Cancel this requirement?" onClose={() => !busy && setCancelling(false)}>
          <p className="text-sm text-coffee-700">Suppliers will no longer be able to quote, and quotes already received cannot be selected.</p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => setCancelling(false)}>
              Keep it open
            </Button>
            <Button variant="danger" disabled={busy} onClick={cancelRfq}>
              {busy ? "Cancelling…" : "Cancel requirement"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
