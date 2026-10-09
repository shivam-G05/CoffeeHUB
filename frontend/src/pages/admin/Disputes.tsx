import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, apiErrorMessage, fileUrl } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { DISPUTE_REASONS } from "../../lib/constants";
import { formatDateTime, label, money } from "../../lib/format";
import type { Dispute, Page } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, Img, Modal, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";
import { Field, Input, Textarea } from "../../components/ui/Input";

export default function AdminDisputes() {
  const { showToast } = useToast();
  const [pageNo, setPageNo] = useState(0);
  const [disputes, setDisputes] = useState<Page<Dispute> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [refund, setRefund] = useState("0");
  const [busy, setBusy] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<Page<Dispute>>("/api/admin/disputes", { params: { page: pageNo } })
      .then((res) => setDisputes(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load disputes")));
  }, [pageNo]);

  useEffect(load, [load]);

  async function resolve(e: FormEvent) {
    e.preventDefault();
    if (!resolving) return;
    setBusy(true);
    setResolveError(null);
    try {
      await api.post(`/api/admin/disputes/${resolving.id}/resolve`, { resolution: resolution.trim(), refundAmount: Number(refund) || 0 });
      showToast("Dispute resolved", "success");
      setResolving(null);
      load();
    } catch (err) {
      setResolveError(apiErrorMessage(err, "Could not resolve the dispute"));
    } finally {
      setBusy(false);
    }
  }

  const refundValue = Number(refund) || 0;

  return (
    <div>
      <PageHeader title="Disputes" subtitle="Read both sides, then decide. Your resolution and any refund are final and recorded in the audit log." />

      <div className="mt-6 space-y-3">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !disputes ? (
          <SkeletonRows />
        ) : disputes.content.length === 0 ? (
          <EmptyState title="No disputes" hint="Disputes raised by buyers appear here." />
        ) : (
          disputes.content.map((d) => {
            const active = d.status === "OPEN" || d.status === "VENDOR_RESPONDED";
            return (
              <div key={d.id} className="rounded-2xl border border-coffee-100 bg-cream-50 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-coffee-900">
                      {d.subOrderNumber} · {DISPUTE_REASONS.find((r) => r.value === d.reason)?.label ?? label(d.reason)}
                    </p>
                    <p className="text-sm text-coffee-500">
                      {d.buyerName} vs {d.vendorName} · order total {money(d.orderTotal)} · raised {formatDateTime(d.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{d.status}</Badge>
                    {active && (
                      <Button
                        onClick={() => {
                          setResolution("");
                          setRefund("0");
                          setResolveError(null);
                          setResolving(d);
                        }}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">Buyer</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-coffee-700">{d.description}</p>
                    {d.evidenceUrls.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {d.evidenceUrls
                          .filter((url) => /^https?:\/\//i.test(fileUrl(url) ?? ""))
                          .map((url, i) => (
                            <a key={url} href={fileUrl(url)} target="_blank" rel="noopener noreferrer" title="Open full size">
                              <Img src={url} alt={`Evidence ${i + 1}`} className="h-20 w-20 rounded-lg border border-coffee-200" />
                            </a>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">Vendor response</p>
                    {d.vendorResponse ? (
                      <>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-coffee-700">{d.vendorResponse}</p>
                        <p className="mt-1 text-xs text-coffee-400">{formatDateTime(d.vendorRespondedAt)}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-coffee-400">The vendor has not responded yet.</p>
                    )}
                  </div>
                </div>

                {!active && (
                  <div className="mt-4 rounded-xl bg-coffee-100/50 p-3 text-sm">
                    <p className="font-semibold text-coffee-900">
                      Resolution · {d.refundAmount ? `${money(d.refundAmount)} refunded` : "no refund"} · {formatDateTime(d.resolvedAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-coffee-700">{d.resolution}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
        <Pagination page={disputes} onChange={setPageNo} />
      </div>

      {resolving && (
        <Modal title={`Resolve dispute on ${resolving.subOrderNumber}`} onClose={() => setResolving(null)}>
          <form onSubmit={resolve} className="space-y-4">
            <Field label="Resolution (shown to the buyer and the vendor)">
              <Textarea rows={4} value={resolution} onChange={(e) => setResolution(e.target.value)} maxLength={2000} required />
            </Field>
            <Field label={`Refund amount in ₹ (0 = no refund, up to ${money(resolving.orderTotal)})`}>
              <Input type="number" min={0} max={resolving.orderTotal} step="0.01" value={refund} onChange={(e) => setRefund(e.target.value)} required />
            </Field>
            <p className="text-sm text-coffee-600">
              {refundValue > 0
                ? `${money(refundValue)} will be refunded to the buyer and deducted from what the vendor is paid.`
                : "The dispute will be closed with no refund."}
            </p>
            <ErrorNote>{resolveError}</ErrorNote>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setResolving(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !resolution.trim() || refundValue < 0 || refundValue > resolving.orderTotal}>
                {busy ? "Saving…" : refundValue > 0 ? "Resolve with refund" : "Resolve without refund"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
