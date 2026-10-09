import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { ORDER_FLOW } from "../../lib/constants";
import { formatDate, formatDateTime, label, money } from "../../lib/format";
import type { Order, OrderStatus, Page, VendorOrder } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, Modal, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";
import { Field, Input, Select, Textarea } from "../../components/ui/Input";

type Dialog =
  | { kind: "payment"; order: Order }
  | { kind: "status"; sub: VendorOrder }
  | { kind: "refund"; sub: VendorOrder };

const STATUS_OPTIONS: OrderStatus[] = [...ORDER_FLOW, "CANCELLED"];

function refundable(sub: VendorOrder): number {
  return Math.max(0, Math.round((sub.totalAmount - sub.refundAmount) * 100) / 100);
}

export default function AdminOrders() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [pageNo, setPageNo] = useState(0);
  const [orders, setOrders] = useState<Page<Order> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<OrderStatus>("PLACED");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<Page<Order>>("/api/admin/orders", { params: { q: q || undefined, page: pageNo } })
      .then((res) => setOrders(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load orders")));
  }, [q, pageNo]);

  useEffect(load, [load]);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    setQ(search.trim());
    setPageNo(0);
  }

  function show(next: Dialog) {
    setText("");
    setDialogError(null);
    if (next.kind === "status") setStatus(next.sub.status);
    if (next.kind === "refund") setAmount(String(refundable(next.sub)));
    setDialog(next);
  }

  async function submitDialog(e: FormEvent) {
    e.preventDefault();
    if (!dialog) return;
    setBusy(true);
    setDialogError(null);
    try {
      const res =
        dialog.kind === "payment"
          ? await api.post<Order>(`/api/admin/orders/${dialog.order.id}/confirm-payment`, { reference: text.trim() || undefined })
          : dialog.kind === "status"
            ? await api.put<Order>(`/api/admin/vendor-orders/${dialog.sub.id}/status`, { status, reason: text.trim() || undefined })
            : await api.post<Order>(`/api/admin/vendor-orders/${dialog.sub.id}/refund`, { amount: Number(amount), reason: text.trim() });
      setOrders((p) => (p ? { ...p, content: p.content.map((o) => (o.id === res.data.id ? res.data : o)) } : p));
      showToast(dialog.kind === "payment" ? "Payment confirmed" : dialog.kind === "status" ? "Status updated" : "Refund recorded", "success");
      setDialog(null);
    } catch (err) {
      setDialogError(apiErrorMessage(err, "Could not complete the action"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Orders & Payments" subtitle="Every order with its vendor sub-orders. Payment confirmations, status overrides and refunds are audit-logged." />

      <form onSubmit={submitSearch} className="mt-6 flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order number…" aria-label="Search by order number" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="mt-4 space-y-3">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !orders ? (
          <SkeletonRows />
        ) : orders.content.length === 0 ? (
          <EmptyState title="No orders found" hint={q ? "No order number matches that search." : "Orders appear here as soon as buyers check out."} />
        ) : (
          orders.content.map((o) => {
            const expanded = open === o.id;
            const refundRequested = o.vendorOrders.some((v) => v.status === "REFUND_REQUESTED");
            return (
              <div key={o.id} className="overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-coffee-900">{o.orderNumber}</p>
                    <p className="text-sm text-coffee-500">
                      {o.customerName} · {formatDate(o.createdAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-coffee-500">
                      <Badge>{o.status}</Badge>
                      <span>{o.paymentMethod ? label(o.paymentMethod) : "Payment"}:</span>
                      {o.paymentStatus && <Badge>{o.paymentStatus}</Badge>}
                      {o.paymentReference && <span className="break-all">Ref {o.paymentReference}</span>}
                      {refundRequested && <Badge tone="REFUND_REQUESTED">Refund requested</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-coffee-900">{money(o.totalAmount)}</p>
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      {o.paymentStatus === "PENDING" && <Button onClick={() => show({ kind: "payment", order: o })}>Confirm payment received</Button>}
                      <Button variant="secondary" onClick={() => setOpen(expanded ? null : o.id)} aria-expanded={expanded}>
                        {o.vendorOrders.length} sub-order{o.vendorOrders.length === 1 ? "" : "s"}
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </Button>
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="space-y-3 border-t border-coffee-100 bg-coffee-100/30 p-4">
                    {o.vendorOrders.length === 0 && <p className="text-sm text-coffee-500">This order predates vendor sub-orders and has no breakdown.</p>}
                    {o.vendorOrders.map((sub) => (
                      <SubOrder
                        key={sub.id}
                        sub={sub}
                        canRefund={o.paymentStatus !== "PENDING" && refundable(sub) > 0}
                        onStatus={() => show({ kind: "status", sub })}
                        onRefund={() => show({ kind: "refund", sub })}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        <Pagination page={orders} onChange={setPageNo} />
      </div>

      {dialog && (
        <Modal
          title={
            dialog.kind === "payment"
              ? `Confirm payment for ${dialog.order.orderNumber}`
              : dialog.kind === "status"
                ? `Change status of ${dialog.sub.subOrderNumber}`
                : `Refund ${dialog.sub.subOrderNumber}`
          }
          onClose={() => setDialog(null)}
        >
          <form onSubmit={submitDialog} className="space-y-4">
            {dialog.kind === "payment" && (
              <>
                <p className="text-sm text-coffee-600">
                  Confirm only after {money(dialog.order.totalAmount)} has actually been received. Vendors are then told to start processing.
                </p>
                <Field label="Payment reference (UTR / transaction id)">
                  <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={100} />
                </Field>
              </>
            )}
            {dialog.kind === "status" && (
              <>
                <p className="text-sm text-coffee-600">
                  This overrides the vendor's own status. Refunds and disputes have their own actions and cannot be set here.
                </p>
                <Field label="New status">
                  <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                    {!STATUS_OPTIONS.includes(dialog.sub.status) && <option value={dialog.sub.status}>{label(dialog.sub.status)} (current)</option>}
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {label(s)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={status === "CANCELLED" ? "Reason (shown to buyer and vendor)" : "Reason (recorded in the audit log)"}>
                  <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} required={status === "CANCELLED"} />
                </Field>
              </>
            )}
            {dialog.kind === "refund" && (
              <>
                <p className="text-sm text-coffee-600">
                  Up to {money(refundable(dialog.sub))} can be refunded on this sub-order. A full refund closes it as refunded; the vendor payable is reduced
                  by the refunded amount.
                </p>
                <Field label="Refund amount (₹)">
                  <Input type="number" min={0.01} max={refundable(dialog.sub)} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </Field>
                <Field label="Reason">
                  <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} required />
                </Field>
              </>
            )}
            <ErrorNote>{dialogError}</ErrorNote>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={dialog.kind === "payment" ? "primary" : "danger"}
                disabled={
                  busy ||
                  (dialog.kind === "status" && status === dialog.sub.status) ||
                  (dialog.kind === "refund" && (!(Number(amount) > 0) || Number(amount) > refundable(dialog.sub) || !text.trim()))
                }
              >
                {busy ? "Saving…" : dialog.kind === "payment" ? "Confirm payment" : dialog.kind === "status" ? "Change status" : "Issue refund"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function SubOrder({ sub, canRefund, onStatus, onRefund }: { sub: VendorOrder; canRefund: boolean; onStatus: () => void; onRefund: () => void }) {
  const flagged = sub.status === "REFUND_REQUESTED";
  const rows: [string, string][] = [
    ["Items subtotal", money(sub.itemsSubtotal)],
    ["Tax (included)", money(sub.taxAmount)],
    ["Shipping", money(sub.shippingAmount)],
    ["Total", money(sub.totalAmount)],
    ["Platform fee", money(sub.platformFee)],
    ["Gateway fee", money(sub.gatewayFee)],
    ["Refunded", money(sub.refundAmount)],
    ["Vendor payable", money(sub.vendorPayable)],
  ];
  return (
    <div className={`rounded-xl border bg-cream-50 p-4 ${flagged ? "border-amber-400 ring-1 ring-amber-300" : "border-coffee-100"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-coffee-900">{sub.vendorName}</p>
          <p className="text-xs text-coffee-500">{sub.subOrderNumber}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{sub.status}</Badge>
          {sub.settlementStatus && <Badge tone={sub.settlementStatus}>{`Settlement: ${label(sub.settlementStatus).toLowerCase()}`}</Badge>}
        </div>
      </div>
      {flagged && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">The buyer has requested a refund on this sub-order.</p>}
      {sub.cancelReason && <p className="mt-2 text-sm text-red-700">Cancelled: {sub.cancelReason}</p>}

      <ul className="mt-3 space-y-1 text-sm text-coffee-700">
        {sub.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span className="min-w-0 break-words">
              {item.productName} × {item.quantity}
            </span>
            <span className="shrink-0">{money(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-coffee-100 pt-3 text-sm sm:grid-cols-4">
        {rows.map(([term, value]) => (
          <div key={term}>
            <dt className="text-xs text-coffee-400">{term}</dt>
            <dd className="font-medium text-coffee-900">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 break-words text-xs text-coffee-500">
        {sub.trackingNumber || sub.courierName ? (
          <>
            Tracking: {[sub.courierName, sub.trackingNumber].filter(Boolean).join(" · ")}
            {sub.dispatchDate && ` · dispatched ${formatDate(sub.dispatchDate)}`}
            {sub.trackingUrl && /^https?:\/\//i.test(sub.trackingUrl) && (
              <>
                {" · "}
                <a href={sub.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-coffee-700 underline">
                  Track
                </a>
              </>
            )}
          </>
        ) : (
          "No tracking details yet."
        )}
        {sub.deliveredAt && ` · delivered ${formatDateTime(sub.deliveredAt)}`}
      </p>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onStatus}>
          Change status
        </Button>
        {canRefund && (
          <Button variant="danger" onClick={onRefund}>
            Refund
          </Button>
        )}
      </div>
    </div>
  );
}
