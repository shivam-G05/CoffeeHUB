import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage, fileUrl } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { DISPUTE_REASONS } from "../../lib/constants";
import { formatDate, formatDateTime, label, money } from "../../lib/format";
import type { Dispute } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, Img, PageHeader, SkeletonRows } from "../../components/ui/Common";
import { Textarea } from "../../components/ui/Input";

export default function SellerDisputes() {
  const { showToast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    api
      .get<Dispute[]>("/api/vendor/disputes")
      .then((res) => setDisputes(res.data))
      .catch((err) => setLoadError(apiErrorMessage(err, "Could not load disputes")));
  }, []);

  async function respond(dispute: Dispute) {
    const response = (drafts[dispute.id] ?? "").trim();
    if (!response) return;
    setBusyId(dispute.id);
    setRowError(null);
    try {
      const res = await api.post<Dispute>(`/api/vendor/disputes/${dispute.id}/respond`, { response });
      setDisputes((list) => list?.map((d) => (d.id === dispute.id ? res.data : d)) ?? null);
      setDrafts((all) => ({ ...all, [dispute.id]: "" }));
      showToast("Response sent", "success");
    } catch (err) {
      setRowError({ id: dispute.id, message: apiErrorMessage(err, "Could not send your response") });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Disputes" subtitle="Issues buyers have raised on your orders. Respond promptly: the admin team decides the outcome." />

      <div className="mt-6">
        {loadError ? (
          <ErrorNote>{loadError}</ErrorNote>
        ) : disputes === null ? (
          <SkeletonRows />
        ) : disputes.length === 0 ? (
          <EmptyState title="No disputes" hint="If a buyer raises an issue with one of your orders, it will appear here." />
        ) : (
          <ul className="space-y-4">
            {disputes.map((d) => {
              const active = d.status === "OPEN" || d.status === "VENDOR_RESPONDED";
              const draft = drafts[d.id] ?? "";
              return (
                <li key={d.id} className="rounded-2xl border border-coffee-100 bg-cream-50 p-4 shadow-sm sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/seller/orders/${d.vendorOrderId}`} className="font-semibold text-coffee-900 hover:underline">
                        Order {d.subOrderNumber}
                      </Link>
                      <p className="text-xs text-coffee-500">
                        {DISPUTE_REASONS.find((r) => r.value === d.reason)?.label ?? label(d.reason)} · raised {formatDate(d.createdAt)} · order total{" "}
                        {money(d.orderTotal)}
                      </p>
                    </div>
                    <Badge>{d.status}</Badge>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-coffee-600">{d.buyerName} wrote</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-coffee-800">{d.description}</p>
                  </div>

                  {d.evidenceUrls.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {d.evidenceUrls.map((url, i) => (
                        <a key={url} href={fileUrl(url)} target="_blank" rel="noopener noreferrer" title="Open full image">
                          <Img src={url} alt={`Evidence ${i + 1}`} className="h-20 w-20 rounded-lg border border-coffee-200" />
                        </a>
                      ))}
                    </div>
                  )}

                  {d.vendorResponse && (
                    <div className="mt-4 rounded-lg bg-coffee-100/50 px-3 py-2">
                      <p className="text-xs font-semibold text-coffee-600">Your response · {formatDateTime(d.vendorRespondedAt)}</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-coffee-800">{d.vendorResponse}</p>
                    </div>
                  )}

                  {active ? (
                    <div className="mt-4 space-y-3">
                      <Textarea
                        rows={3}
                        maxLength={2000}
                        value={draft}
                        onChange={(e) => setDrafts((all) => ({ ...all, [d.id]: e.target.value }))}
                        placeholder={d.vendorResponse ? "Write an updated response (replaces the one above)…" : "Explain your side and what you propose…"}
                        aria-label="Your response"
                      />
                      {rowError?.id === d.id && <ErrorNote>{rowError.message}</ErrorNote>}
                      <Button onClick={() => respond(d)} disabled={busyId === d.id || !draft.trim()}>
                        {busyId === d.id ? "Sending…" : d.vendorResponse ? "Update response" : "Send response"}
                      </Button>
                    </div>
                  ) : (
                    <div className={`mt-4 rounded-lg px-3 py-2 ${d.status === "RESOLVED_REFUND" ? "bg-amber-50" : "bg-green-50"}`}>
                      <p className="text-xs font-semibold text-coffee-700">Admin resolution · {formatDate(d.resolvedAt)}</p>
                      {d.resolution && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-coffee-800">{d.resolution}</p>}
                      <p className="mt-1 text-sm font-semibold text-coffee-900">
                        {d.refundAmount != null && d.refundAmount > 0 ? `Refund to buyer: ${money(d.refundAmount)}` : "No refund issued"}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
