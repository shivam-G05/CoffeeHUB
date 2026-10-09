import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatDateTime, money, place } from "../../lib/format";
import type { Rfq, VendorSummary } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Card, ErrorNote, Modal, PageHeader, SkeletonRows, VerifiedBadge } from "../../components/ui/Common";
import { Field, Textarea } from "../../components/ui/Input";

export default function AdminRfqDetail() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<VendorSummary[] | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [routeError, setRouteError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRfq(null);
    setError(null);
    api
      .get<Rfq>(`/api/admin/rfqs/${id}`)
      .then((res) => setRfq(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Requirement not found")));
  }, [id]);

  const routable = rfq?.status === "SUBMITTED" || rfq?.status === "OPEN";

  useEffect(() => {
    if (!routable) return;
    setSuggestError(null);
    api
      .get<VendorSummary[]>(`/api/admin/rfqs/${id}/suggested-vendors`)
      .then((res) => setSuggested(res.data))
      .catch((err) => setSuggestError(apiErrorMessage(err, "Could not load suggested vendors")));
  }, [id, routable]);

  async function route(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setRouteError(null);
    try {
      const res = await api.post<Rfq>(`/api/admin/rfqs/${id}/route`, { vendorIds: selected, note: note.trim() || undefined });
      setRfq(res.data);
      setSelected([]);
      setNote("");
      showToast("Requirement sent to the selected vendors", "success");
    } catch (err) {
      setRouteError(apiErrorMessage(err, "Could not route the requirement"));
    } finally {
      setBusy(false);
    }
  }

  async function reject(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setRejectError(null);
    try {
      const res = await api.post<Rfq>(`/api/admin/rfqs/${id}/reject`, { reason: reason.trim() });
      setRfq(res.data);
      setRejecting(false);
      showToast("Requirement rejected", "success");
    } catch (err) {
      setRejectError(apiErrorMessage(err, "Could not reject the requirement"));
    } finally {
      setBusy(false);
    }
  }

  const back = (
    <Link to="/admin/rfqs" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-coffee-500 hover:text-coffee-800">
      <ArrowLeft size={14} /> All RFQs
    </Link>
  );

  if (!rfq) {
    return (
      <div>
        {back}
        {error ? <ErrorNote>{error}</ErrorNote> : <SkeletonRows />}
      </div>
    );
  }

  const invitedIds = new Set(rfq.invitedVendors.map((v) => v.id));

  return (
    <div>
      {back}
      <PageHeader
        title={rfq.title}
        subtitle={`From ${rfq.buyerName} · posted ${formatDateTime(rfq.createdAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{rfq.status}</Badge>
            {rfq.status === "SUBMITTED" && (
              <Button
                variant="danger"
                onClick={() => {
                  setReason("");
                  setRejectError(null);
                  setRejecting(true);
                }}
              >
                Reject requirement
              </Button>
            )}
          </div>
        }
      />

      {rfq.adminNote && (
        <p className="mt-4 rounded-lg bg-coffee-100/60 px-3 py-2 text-sm text-coffee-700">
          Admin note: <span className="whitespace-pre-wrap">{rfq.adminNote}</span>
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-coffee-900">Requirement</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Fact term="Category">{rfq.categoryName}</Fact>
            <Fact term="Product">{rfq.productName}</Fact>
            <Fact term="Coffee type">{rfq.coffeeType}</Fact>
            <Fact term="Quantity">
              {rfq.quantity} {rfq.unit}
            </Fact>
            <Fact term="Target price">{rfq.targetPrice != null ? `${money(rfq.targetPrice)} / ${rfq.unit}` : undefined}</Fact>
            <Fact term="Deliver to">{rfq.deliveryLocation}</Fact>
            <Fact term="Required by">{rfq.requiredBy ? formatDate(rfq.requiredBy) : undefined}</Fact>
            <Fact term="Sample required">{rfq.sampleRequired ? "Yes" : "No"}</Fact>
            <Fact term="Private label">{rfq.privateLabelRequired ? "Yes" : "No"}</Fact>
          </dl>
          {rfq.specification && (
            <div className="mt-4 text-sm">
              <p className="text-xs text-coffee-400">Specification</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-coffee-700">{rfq.specification}</p>
            </div>
          )}
          {rfq.additionalRequirements && (
            <div className="mt-4 text-sm">
              <p className="text-xs text-coffee-400">Additional requirements</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-coffee-700">{rfq.additionalRequirements}</p>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold text-coffee-900">Invited vendors ({rfq.invitedVendors.length})</h2>
            {rfq.invitedVendors.length === 0 ? (
              <p className="mt-3 text-sm text-coffee-500">No vendor has been invited yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-coffee-100 text-sm">
                {rfq.invitedVendors.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link to={`/admin/vendors/${v.id}`} className="font-medium text-coffee-900 hover:underline">
                      {v.businessName}
                    </Link>
                    <span className="text-xs text-coffee-500">{place(v.city, v.state)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {routable && (
            <Card>
              <h2 className="text-lg font-semibold text-coffee-900">Route to vendors</h2>
              <p className="mt-1 text-sm text-coffee-500">Verified vendors selling in this category. Each selected vendor is invited to quote.</p>
              <form onSubmit={route} className="mt-3 space-y-3">
                {suggestError ? (
                  <ErrorNote>{suggestError}</ErrorNote>
                ) : !suggested ? (
                  <SkeletonRows count={2} />
                ) : suggested.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    No verified vendor currently sells in this category, so there is nobody to suggest. Check the{" "}
                    <Link to="/admin/vendors" className="font-semibold underline">
                      vendor list
                    </Link>{" "}
                    for vendors awaiting approval.
                  </p>
                ) : (
                  <ul className="max-h-72 divide-y divide-coffee-100 overflow-y-auto rounded-xl border border-coffee-100">
                    {suggested.map((v) => {
                      const invited = invitedIds.has(v.id);
                      return (
                        <li key={v.id}>
                          <label className={`flex items-start gap-3 px-3 py-2 text-sm ${invited ? "opacity-60" : "cursor-pointer hover:bg-coffee-100/40"}`}>
                            <input
                              type="checkbox"
                              className="mt-1"
                              disabled={invited}
                              checked={invited || selected.includes(v.id)}
                              onChange={(e) => setSelected((s) => (e.target.checked ? [...s, v.id] : s.filter((x) => x !== v.id)))}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2 font-medium text-coffee-900">
                                {v.businessName}
                                {v.verified && <VerifiedBadge compact />}
                                {invited && <Badge>INVITED</Badge>}
                              </span>
                              <span className="block text-xs text-coffee-500">
                                {[v.vendorTypeLabel, place(v.city, v.state), `${v.productCount} products`].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {suggested && suggested.length > 0 && (
                  <>
                    <Field label="Note (optional)">
                      <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
                    </Field>
                    <ErrorNote>{routeError}</ErrorNote>
                    <Button type="submit" disabled={busy || selected.length === 0}>
                      {busy ? "Sending…" : selected.length === 0 ? "Select vendors to invite" : `Send to ${selected.length} vendor${selected.length === 1 ? "" : "s"}`}
                    </Button>
                  </>
                )}
              </form>
            </Card>
          )}
        </div>
      </div>

      <Card className="mt-4">
        <h2 className="text-lg font-semibold text-coffee-900">Quotes ({rfq.quotes.length})</h2>
        {rfq.quotes.length === 0 ? (
          <p className="mt-3 text-sm text-coffee-500">No quotes received yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-coffee-500">
                <tr>
                  <th className="py-2 pr-4">Vendor</th>
                  <th className="py-2 pr-4">Price / unit</th>
                  <th className="py-2 pr-4">Estimated total</th>
                  <th className="py-2 pr-4">Lead time</th>
                  <th className="py-2 pr-4">Valid until</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {rfq.quotes.map((q) => (
                  <tr key={q.id} className={q.id === rfq.selectedQuoteId ? "bg-green-50" : ""}>
                    <td className="py-2 pr-4">
                      <Link to={`/admin/vendors/${q.vendorId}`} className="font-medium text-coffee-900 hover:underline">
                        {q.vendorName}
                      </Link>
                      {q.notes && <p className="max-w-xs whitespace-pre-wrap break-words text-xs text-coffee-500">{q.notes}</p>}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-4 text-coffee-700">{money(q.pricePerUnit)}</td>
                    <td className="whitespace-nowrap py-2 pr-4 text-coffee-700">{money(q.estimatedTotal)}</td>
                    <td className="whitespace-nowrap py-2 pr-4 text-coffee-600">{q.leadTimeDays != null ? `${q.leadTimeDays} days` : "—"}</td>
                    <td className="whitespace-nowrap py-2 pr-4 text-coffee-600">{formatDate(q.validUntil)}</td>
                    <td className="py-2 pr-4">
                      <Badge>{q.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {rejecting && (
        <Modal title="Reject requirement" onClose={() => setRejecting(false)}>
          <form onSubmit={reject} className="space-y-4">
            <p className="text-sm text-coffee-600">The buyer is told the requirement could not be processed, with this reason. It will not be sent to any vendor.</p>
            <Field label="Reason (shown to the buyer)">
              <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} required />
            </Field>
            <ErrorNote>{rejectError}</ErrorNote>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={busy || !reason.trim()}>
                {busy ? "Saving…" : "Reject requirement"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-coffee-400">{term}</dt>
      <dd className="break-words font-medium text-coffee-900">{children || "—"}</dd>
    </div>
  );
}
