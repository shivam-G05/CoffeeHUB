import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatDateTime, label, money } from "../../lib/format";
import type { OrderStatus, VendorOrder } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Card, ErrorNote, Img, Modal, PageHeader, SkeletonRows } from "../../components/ui/Common";
import { Field, Input, Textarea } from "../../components/ui/Input";

// Statuses only move forward; each one offers just its next step.
const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; text: string }>> = {
  PLACED: { status: "ACCEPTED", text: "Accept order" },
  PAYMENT_CONFIRMED: { status: "ACCEPTED", text: "Accept order" },
  ACCEPTED: { status: "PROCESSING", text: "Start processing" },
  PROCESSING: { status: "READY_TO_SHIP", text: "Ready to ship" },
  READY_TO_SHIP: { status: "SHIPPED", text: "Mark shipped" },
  SHIPPED: { status: "DELIVERED", text: "Mark delivered" },
};

const CANCELLABLE: OrderStatus[] = ["PLACED", "PAYMENT_CONFIRMED", "ACCEPTED", "PROCESSING", "READY_TO_SHIP"];

function Row({ name, children, strong = false }: { name: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 py-1.5 text-sm ${strong ? "font-bold text-coffee-900" : "text-coffee-700"}`}>
      <span className={strong ? "" : "text-coffee-500"}>{name}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export default function SellerOrderDetail() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"ship" | "cancel" | null>(null);
  const [ship, setShip] = useState({ courierName: "", trackingNumber: "", trackingUrl: "", dispatchDate: "" });
  const [reason, setReason] = useState("");

  useEffect(() => {
    setOrder(null);
    setLoadError(null);
    api
      .get<VendorOrder>(`/api/vendor/orders/${id}`)
      .then((res) => {
        setOrder(res.data);
        setShip((s) => ({ ...s, courierName: res.data.courierName ?? "", trackingNumber: res.data.trackingNumber ?? "", trackingUrl: res.data.trackingUrl ?? "" }));
      })
      .catch((err) => setLoadError(apiErrorMessage(err, "Order not found")));
  }, [id]);

  /** Returns true when the server accepted the change. */
  async function update(body: Record<string, string | undefined>, done: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await api.put<VendorOrder>(`/api/vendor/orders/${id}/status`, body);
      setOrder(res.data);
      showToast(done, "success");
      return true;
    } catch (err) {
      setError(apiErrorMessage(err, "Could not update the order"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitShip(e: FormEvent) {
    e.preventDefault();
    const ok = await update(
      {
        status: "SHIPPED",
        courierName: ship.courierName.trim(),
        trackingNumber: ship.trackingNumber.trim(),
        trackingUrl: ship.trackingUrl.trim() || undefined,
        dispatchDate: ship.dispatchDate || undefined,
      },
      "Order marked as shipped"
    );
    if (ok) setDialog(null);
  }

  async function submitCancel(e: FormEvent) {
    e.preventDefault();
    const ok = await update({ status: "CANCELLED", reason: reason.trim() }, "Order cancelled");
    if (ok) setDialog(null);
  }

  function openDialog(which: "ship" | "cancel") {
    setError(null);
    setDialog(which);
  }

  const back = (
    <Link to="/seller/orders" className="inline-flex items-center gap-1 text-sm font-medium text-coffee-500 hover:text-coffee-800">
      <ArrowLeft size={14} /> All orders
    </Link>
  );

  if (!order) {
    return (
      <div>
        {back}
        <div className="mt-4">{loadError ? <ErrorNote>{loadError}</ErrorNote> : <SkeletonRows />}</div>
      </div>
    );
  }

  const next = NEXT_STEP[order.status];
  const cancellable = CANCELLABLE.includes(order.status);
  const awaitingPayment = order.paymentMethod !== "COD" && order.paymentStatus !== "PAID";
  const address = order.shippingAddress;

  return (
    <div>
      {back}
      <div className="mt-2">
        <PageHeader
          title={`Order ${order.subOrderNumber}`}
          subtitle={`Placed ${formatDateTime(order.createdAt)}`}
          action={<Badge>{order.status}</Badge>}
        />
      </div>

      {(next || cancellable) && (
        <Card className="mt-6">
          <h2 className="font-bold text-coffee-900">Fulfilment</h2>
          {awaitingPayment && next && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Awaiting payment confirmation. You can fulfil this order once the buyer's payment is confirmed.
            </p>
          )}
          {!dialog && (
            <div className="mt-3">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            {next && (
              <Button
                disabled={busy || awaitingPayment}
                onClick={() => (next.status === "SHIPPED" ? openDialog("ship") : update({ status: next.status }, `Order marked as ${label(next.status).toLowerCase()}`))}
              >
                {busy && !dialog ? "Updating…" : next.text}
              </Button>
            )}
            {cancellable && (
              <Button variant="danger" disabled={busy} onClick={() => openDialog("cancel")}>
                Cancel order
              </Button>
            )}
          </div>
        </Card>
      )}

      {order.status === "CANCELLED" && order.cancelReason && (
        <p className="mt-6 whitespace-pre-wrap rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-semibold">Cancelled: </span>
          {order.cancelReason}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <h2 className="font-bold text-coffee-900">Items</h2>
          <ul className="mt-3 divide-y divide-coffee-100">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <Img src={item.imageUrl} alt={item.productName} className="h-14 w-14 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-coffee-900">{item.productName}</p>
                  <p className="text-xs text-coffee-500">
                    {item.quantity} × {money(item.unitPrice)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-coffee-800">{money(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-bold text-coffee-900">Delivery details</h2>
          <div className="mt-3 text-sm text-coffee-700">
            <p className="font-semibold text-coffee-900">{order.buyerName ?? "Buyer"}</p>
            {order.buyerPhone && <p>{order.buyerPhone}</p>}
            {address ? (
              <p className="mt-2 whitespace-pre-wrap break-words">
                {[address.line1, address.line2].filter(Boolean).join("\n")}
                {"\n"}
                {address.city}, {address.state} {address.pin}
              </p>
            ) : (
              <p className="mt-2 text-coffee-400">No delivery address on record.</p>
            )}
          </div>
          {order.notes && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-coffee-600">Buyer's note</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-coffee-700">{order.notes}</p>
            </div>
          )}

          {(order.courierName || order.trackingNumber) && (
            <div className="mt-4 border-t border-coffee-100 pt-3">
              <p className="text-xs font-semibold text-coffee-600">Shipment</p>
              <Row name="Courier">{order.courierName ?? "—"}</Row>
              <Row name="Tracking number">
                <span className="break-all">{order.trackingNumber ?? "—"}</span>
              </Row>
              {order.dispatchDate && <Row name="Dispatched">{formatDate(order.dispatchDate)}</Row>}
              {order.deliveredAt && <Row name="Delivered">{formatDate(order.deliveredAt)}</Row>}
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold text-coffee-700 underline">
                  Open tracking link
                </a>
              )}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-bold text-coffee-900">Payment & payout</h2>
          <div className="mt-3">
            <Row name="Payment method">{order.paymentMethod ? label(order.paymentMethod) : "—"}</Row>
            <Row name="Payment status">{order.paymentStatus ? <Badge>{order.paymentStatus}</Badge> : "—"}</Row>
          </div>
          <div className="mt-3 border-t border-coffee-100 pt-3">
            <Row name="Items subtotal">{money(order.itemsSubtotal)}</Row>
            <Row name="Tax included">{money(order.taxAmount)}</Row>
            <Row name="Shipping">{money(order.shippingAmount)}</Row>
            <Row name="Order value">{money(order.totalAmount)}</Row>
            <Row name="Platform fee">− {money(order.platformFee)}</Row>
            <Row name="Payment gateway fee">− {money(order.gatewayFee)}</Row>
            {order.refundAmount > 0 && <Row name="Refunded to buyer">− {money(order.refundAmount)}</Row>}
          </div>
          <div className="mt-3 border-t border-coffee-100 pt-3">
            <Row name="Your payout" strong>
              {money(order.vendorPayable)}
            </Row>
            <Row name="Settlement status">{order.settlementStatus ? <Badge>{order.settlementStatus}</Badge> : "—"}</Row>
          </div>
        </Card>
      </div>

      {dialog === "ship" && (
        <Modal title="Mark as shipped" onClose={() => setDialog(null)}>
          <form onSubmit={submitShip} className="space-y-4">
            <Field label="Courier name *">
              <Input required maxLength={100} value={ship.courierName} onChange={(e) => setShip({ ...ship, courierName: e.target.value })} />
            </Field>
            <Field label="Tracking number *">
              <Input required maxLength={100} value={ship.trackingNumber} onChange={(e) => setShip({ ...ship, trackingNumber: e.target.value })} />
            </Field>
            <Field label="Tracking link (optional)">
              <Input type="url" maxLength={500} placeholder="https://" value={ship.trackingUrl} onChange={(e) => setShip({ ...ship, trackingUrl: e.target.value })} />
            </Field>
            <Field label="Dispatch date (optional, defaults to today)">
              <Input type="date" value={ship.dispatchDate} onChange={(e) => setShip({ ...ship, dispatchDate: e.target.value })} />
            </Field>
            <ErrorNote>{error}</ErrorNote>
            <Button type="submit" disabled={busy || !ship.courierName.trim() || !ship.trackingNumber.trim()}>
              {busy ? "Saving…" : "Mark shipped"}
            </Button>
          </form>
        </Modal>
      )}

      {dialog === "cancel" && (
        <Modal title="Cancel this order" onClose={() => setDialog(null)}>
          <form onSubmit={submitCancel} className="space-y-4">
            <p className="text-sm text-coffee-600">The buyer is notified and shown your reason. This cannot be undone.</p>
            <Field label="Reason for cancelling *">
              <Textarea required rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <ErrorNote>{error}</ErrorNote>
            <Button type="submit" variant="danger" disabled={busy || !reason.trim()}>
              {busy ? "Cancelling…" : "Cancel order"}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
