import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ExternalLink, FileText, Truck } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { DISPUTE_REASONS, ORDER_FLOW } from "../../lib/constants";
import { formatDate, formatDateTime, label, money } from "../../lib/format";
import type { Conversation, DisputeReason, Order, OrderItem, PostalAddress, VendorOrder } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Card, ErrorNote, ImageUploader, Img, Modal, SkeletonRows } from "../../components/ui/Common";
import { Field, Select, Textarea } from "../../components/ui/Input";
import { productPath } from "../../components/ui/ProductCard";

type Action = { kind: "cancel" | "dispute" | "message"; vendorOrder: VendorOrder };

function AddressBlock({ title, address }: { title: string; address?: PostalAddress }) {
  if (!address) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">{title}</p>
      <p className="mt-1 text-sm text-coffee-800">
        {address.line1}
        {address.line2 && <>, {address.line2}</>}
        <br />
        {address.city}, {address.state} {address.pin}
      </p>
    </div>
  );
}

function ProgressTracker({ status }: { status: VendorOrder["status"] }) {
  const current = ORDER_FLOW.indexOf(status);
  return (
    <div>
      <ol className="flex items-start" aria-label="Order progress">
        {ORDER_FLOW.map((step, i) => (
          <li key={step} className="flex min-w-0 flex-1 flex-col items-center" aria-current={i === current ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? "invisible" : i <= current ? "bg-coffee-700" : "bg-coffee-200"}`} />
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-cream-50 ${
                  i <= current ? "bg-coffee-700" : "border-2 border-coffee-200 bg-cream-50"
                }`}
              >
                {i <= current && <Check size={12} />}
              </span>
              <span className={`h-0.5 flex-1 ${i === ORDER_FLOW.length - 1 ? "invisible" : i < current ? "bg-coffee-700" : "bg-coffee-200"}`} />
            </div>
            <span className={`mt-1 hidden px-0.5 text-center text-[10px] leading-tight lg:block ${i <= current ? "font-semibold text-coffee-800" : "text-coffee-400"}`}>
              {label(step)}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-coffee-500 lg:hidden">
        Step {current + 1} of {ORDER_FLOW.length}: <span className="font-semibold text-coffee-800">{label(status)}</span>
      </p>
    </div>
  );
}

function ItemRows({ items, reviewable }: { items: OrderItem[]; reviewable: boolean }) {
  return (
    <ul className="divide-y divide-coffee-100">
      {items.map((item) => {
        const path = productPath({ id: item.productId, slug: item.productSlug });
        return (
          <li key={item.id} className="flex gap-3 py-3">
            <Img src={item.imageUrl} alt={item.productName} className="h-14 w-14 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <Link to={path} className="text-sm font-medium text-coffee-900 hover:underline">
                {item.productName}
              </Link>
              <p className="text-xs text-coffee-500">
                {item.quantity} × {money(item.unitPrice)}
              </p>
              {reviewable && (
                <Link to={path} className="text-xs font-semibold text-coffee-700 underline">
                  Write a review
                </Link>
              )}
            </div>
            <p className="shrink-0 text-sm font-semibold text-coffee-900">{money(item.lineTotal)}</p>
          </li>
        );
      })}
    </ul>
  );
}

export default function CustomerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [text, setText] = useState("");
  const [reason, setReason] = useState<DisputeReason>("NOT_RECEIVED");
  const [evidence, setEvidence] = useState<string[]>([]);

  const load = useCallback(() => {
    return api
      .get<Order>(`/api/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Order not found")));
  }, [id]);

  useEffect(() => {
    setOrder(null);
    setError(null);
    load();
  }, [load]);

  function open(kind: Action["kind"], vendorOrder: VendorOrder) {
    setText("");
    setReason("NOT_RECEIVED");
    setEvidence([]);
    setAction({ kind, vendorOrder });
  }

  /** Runs a mutating request, then reloads the order. Returns whether it succeeded. */
  async function run(request: () => Promise<unknown>, success: string, failure: string) {
    setBusy(true);
    try {
      await request();
      showToast(success, "success");
      setAction(null);
      await load();
      return true;
    } catch (err) {
      showToast(apiErrorMessage(err, failure), "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitAction(e: FormEvent) {
    e.preventDefault();
    if (!action) return;
    const vo = action.vendorOrder;
    if (action.kind === "cancel") {
      await run(
        () => api.post(`/api/orders/vendor-orders/${vo.id}/cancel`, { reason: text.trim() || undefined }),
        "Order cancelled",
        "Could not cancel the order",
      );
    } else if (action.kind === "dispute") {
      await run(
        () => api.post("/api/disputes", { vendorOrderId: vo.id, reason, description: text.trim(), evidenceUrls: evidence }),
        "Problem reported. The seller and our team have been notified.",
        "Could not report the problem",
      );
    } else {
      setBusy(true);
      try {
        const res = await api.post<Conversation>("/api/conversations", {
          vendorId: vo.vendorId,
          contextType: "ORDER",
          contextId: vo.id,
          subject: `Order ${vo.subOrderNumber}`,
          message: text.trim(),
        });
        navigate(`/customer/messages/${res.data.id}`);
      } catch (err) {
        showToast(apiErrorMessage(err, "Could not send the message"), "error");
      } finally {
        setBusy(false);
      }
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <Link to="/customer/orders" className="inline-flex items-center gap-1 text-sm font-medium text-coffee-600 hover:underline">
          <ArrowLeft size={14} /> All orders
        </Link>
      </div>
    );
  }
  if (!order) return <SkeletonRows count={3} />;

  const awaitingBankTransfer = order.paymentMethod === "BANK_TRANSFER" && order.paymentStatus === "PENDING";
  const awaitingOnline = order.paymentMethod === "ONLINE" && order.paymentStatus === "PENDING" && order.status !== "CANCELLED";

  return (
    <div>
      <Link to="/customer/orders" className="inline-flex items-center gap-1 text-sm font-medium text-coffee-600 hover:underline">
        <ArrowLeft size={14} /> All orders
      </Link>

      <Card className="mt-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-all text-xl font-bold text-coffee-900 sm:text-2xl">{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-coffee-500">Placed {formatDateTime(order.createdAt)}</p>
          </div>
          <Badge>{order.status}</Badge>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-lg font-bold text-coffee-900">{money(order.totalAmount)}</span>
          {order.paymentMethod && <span className="text-coffee-500">· {label(order.paymentMethod)}</span>}
          {order.paymentStatus && <Badge>{order.paymentStatus}</Badge>}
        </div>

        {awaitingBankTransfer && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            We are waiting for your bank transfer. The order proceeds once the payment is verified.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {awaitingOnline && (
            <Button
              disabled={busy}
              onClick={() => run(() => api.post(`/api/orders/${order.id}/pay`), "Payment received", "Payment failed")}
            >
              {busy ? "Processing…" : "Pay now"}
            </Button>
          )}
          <Link
            to={`/customer/orders/${order.id}/invoice`}
            className="inline-flex items-center gap-2 rounded-full bg-coffee-100 px-4 py-2 text-sm font-semibold text-coffee-800 hover:bg-coffee-200"
          >
            <FileText size={15} /> View invoice
          </Link>
        </div>

        <div className="mt-5 grid gap-4 border-t border-coffee-100 pt-4 sm:grid-cols-2">
          <div>
            <AddressBlock title="Delivery address" address={order.shippingAddress} />
            {(order.contactName || order.contactPhone) && (
              <p className="mt-1 text-xs text-coffee-500">{[order.contactName, order.contactPhone].filter(Boolean).join(" · ")}</p>
            )}
          </div>
          <AddressBlock title="Billing address" address={order.billingAddress ?? order.shippingAddress} />
          {order.gstNumber && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">GST number</p>
              <p className="mt-1 break-all text-sm text-coffee-800">{order.gstNumber}</p>
            </div>
          )}
          {order.notes && (
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">Order notes</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-coffee-800">{order.notes}</p>
            </div>
          )}
        </div>
      </Card>

      {order.vendorOrders.length === 0 && order.items.length > 0 && (
        <Card className="mt-4">
          <h2 className="font-semibold text-coffee-900">Items</h2>
          <ItemRows items={order.items} reviewable={order.status === "DELIVERED" || order.status === "COMPLETED"} />
        </Card>
      )}

      <div className="mt-4 space-y-4">
        {order.vendorOrders.map((vo) => {
          const inFlow = ORDER_FLOW.includes(vo.status);
          const canCancel = vo.status === "PLACED" || vo.status === "PAYMENT_CONFIRMED" || vo.status === "ACCEPTED";
          const canConfirm = vo.status === "SHIPPED" || vo.status === "DELIVERED";
          // A disputed sub-order already has an open dispute, so point there instead of offering a second one.
          const canDispute = !["PLACED", "CANCELLED", "REFUNDED", "DISPUTED"].includes(vo.status);
          const received = vo.status === "DELIVERED" || vo.status === "COMPLETED";
          const hasTracking = vo.courierName || vo.trackingNumber || vo.trackingUrl || vo.dispatchDate;

          return (
            <Card key={vo.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-all font-semibold text-coffee-900">{vo.subOrderNumber}</p>
                  <p className="text-sm text-coffee-500">
                    Sold by{" "}
                    <Link to={`/suppliers/${vo.vendorSlug}`} className="font-medium text-coffee-800 hover:underline">
                      {vo.vendorName}
                    </Link>
                  </p>
                </div>
                <Badge>{vo.status}</Badge>
              </div>

              <div className="mt-4">
                {inFlow ? (
                  <ProgressTracker status={vo.status} />
                ) : (
                  <div className="rounded-lg bg-coffee-100/60 px-3 py-2 text-sm text-coffee-800">
                    <p className="font-semibold">{label(vo.status)}</p>
                    {vo.cancelReason && <p className="mt-0.5 whitespace-pre-wrap break-words text-coffee-600">{vo.cancelReason}</p>}
                  </div>
                )}
              </div>

              <div className="mt-3">
                <ItemRows items={vo.items} reviewable={received} />
              </div>

              <dl className="mt-2 space-y-1 border-t border-coffee-100 pt-3 text-sm">
                <div className="flex justify-between gap-2 text-coffee-600">
                  <dt>Subtotal</dt>
                  <dd>{money(vo.itemsSubtotal)}</dd>
                </div>
                <div className="flex justify-between gap-2 text-coffee-600">
                  <dt>Shipping</dt>
                  <dd>{vo.shippingAmount > 0 ? money(vo.shippingAmount) : "Free"}</dd>
                </div>
                <div className="flex justify-between gap-2 font-semibold text-coffee-900">
                  <dt>Total</dt>
                  <dd>{money(vo.totalAmount)}</dd>
                </div>
                {vo.refundAmount > 0 && (
                  <div className="flex justify-between gap-2 font-medium text-green-700">
                    <dt>Refunded</dt>
                    <dd>{money(vo.refundAmount)}</dd>
                  </div>
                )}
              </dl>

              {hasTracking && (
                <div className="mt-4 rounded-xl border border-coffee-100 bg-cream-100 px-4 py-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-coffee-900">
                    <Truck size={15} /> Tracking
                  </p>
                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-coffee-700 sm:grid-cols-2">
                    {vo.courierName && (
                      <div>
                        <dt className="inline text-coffee-500">Courier: </dt>
                        <dd className="inline">{vo.courierName}</dd>
                      </div>
                    )}
                    {vo.trackingNumber && (
                      <div>
                        <dt className="inline text-coffee-500">Tracking no: </dt>
                        <dd className="inline break-all">{vo.trackingNumber}</dd>
                      </div>
                    )}
                    {vo.dispatchDate && (
                      <div>
                        <dt className="inline text-coffee-500">Dispatched: </dt>
                        <dd className="inline">{formatDate(vo.dispatchDate)}</dd>
                      </div>
                    )}
                  </dl>
                  {vo.trackingUrl && /^https?:\/\//i.test(vo.trackingUrl) && (
                    <a
                      href={vo.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-coffee-800 underline"
                    >
                      Track shipment <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {canConfirm && (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => api.post(`/api/orders/vendor-orders/${vo.id}/confirm-delivery`),
                        "Thanks for confirming delivery",
                        "Could not confirm delivery",
                      )
                    }
                  >
                    Confirm received
                  </Button>
                )}
                <Button variant="secondary" disabled={busy} onClick={() => open("message", vo)}>
                  Message seller
                </Button>
                {canDispute && (
                  <Button variant="secondary" disabled={busy} onClick={() => open("dispute", vo)}>
                    Report a problem
                  </Button>
                )}
                {vo.status === "DISPUTED" && (
                  <Link to="/customer/disputes" className="inline-flex items-center rounded-full bg-coffee-100 px-4 py-2 text-sm font-semibold text-coffee-800 hover:bg-coffee-200">
                    View dispute
                  </Link>
                )}
                {canCancel && (
                  <Button variant="danger" disabled={busy} onClick={() => open("cancel", vo)}>
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {action && (
        <Modal
          title={
            action.kind === "cancel"
              ? `Cancel ${action.vendorOrder.subOrderNumber}?`
              : action.kind === "dispute"
                ? "Report a problem"
                : `Message ${action.vendorOrder.vendorName}`
          }
          onClose={() => !busy && setAction(null)}
        >
          <form onSubmit={submitAction} className="space-y-4">
            {action.kind === "cancel" && (
              <>
                <p className="text-sm text-coffee-600">
                  This cancels the items from {action.vendorOrder.vendorName}. Other sellers&rsquo; parts of the order are not affected.
                </p>
                <Field label="Reason (optional)">
                  <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
                </Field>
              </>
            )}

            {action.kind === "dispute" && (
              <>
                <p className="text-sm text-coffee-600">
                  Order {action.vendorOrder.subOrderNumber} from {action.vendorOrder.vendorName}. The seller is asked to respond and our team reviews the case.
                </p>
                <Field label="What went wrong?">
                  <Select value={reason} onChange={(e) => setReason(e.target.value as DisputeReason)}>
                    {DISPUTE_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Describe the problem">
                  <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} required />
                </Field>
                <div>
                  <p className="mb-1 text-xs font-semibold text-coffee-600">Photos (optional, up to 6)</p>
                  <ImageUploader value={evidence} onChange={setEvidence} max={6} />
                </div>
              </>
            )}

            {action.kind === "message" && (
              <Field label={`About order ${action.vendorOrder.subOrderNumber}`}>
                <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} required placeholder="Write a message…" />
              </Field>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" disabled={busy} onClick={() => setAction(null)}>
                {action.kind === "cancel" ? "Keep order" : "Close"}
              </Button>
              <Button
                type="submit"
                variant={action.kind === "cancel" ? "danger" : "primary"}
                disabled={busy || (action.kind !== "cancel" && !text.trim())}
              >
                {busy ? "Please wait…" : action.kind === "cancel" ? "Cancel order" : action.kind === "dispute" ? "Submit report" : "Send message"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
