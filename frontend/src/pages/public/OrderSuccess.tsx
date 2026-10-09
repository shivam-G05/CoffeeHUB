import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useBrand } from "../../context/BrandContext";
import { formatDateTime, money } from "../../lib/format";
import { useSeo } from "../../lib/seo";
import type { Order, OrderItem, PaymentOptions } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Card, EmptyState, ErrorNote, SkeletonRows } from "../../components/ui/Common";

const METHOD_LABELS = { COD: "Cash on delivery", BANK_TRANSFER: "Bank transfer", ONLINE: "Online payment" };

function Items({ items }: { items: OrderItem[] }) {
  return (
    <ul className="space-y-1 text-sm text-coffee-700">
      {items.map((item) => (
        <li key={item.id} className="flex justify-between gap-3">
          <span className="min-w-0 break-words">
            {item.productName} × {item.quantity}
          </span>
          <span className="shrink-0">{money(item.lineTotal)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function OrderSuccess() {
  const { id } = useParams();
  const brand = useBrand();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bankInstructions, setBankInstructions] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useSeo({ title: "Order placed" }, brand.name);

  useEffect(() => {
    api
      .get<Order>(`/api/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Order not found")));
  }, [id]);

  const awaitingTransfer = order?.paymentMethod === "BANK_TRANSFER" && order.paymentStatus === "PENDING";
  const awaitingOnline = order?.paymentMethod === "ONLINE" && (order.paymentStatus === "PENDING" || order.paymentStatus === "FAILED");

  useEffect(() => {
    if (!awaitingTransfer) return;
    api
      .get<PaymentOptions>("/api/checkout/payment-options")
      .then((res) => setBankInstructions(res.data.bankTransferInstructions))
      .catch(() => undefined); // the note below still explains what happens next
  }, [awaitingTransfer]);

  async function payNow() {
    if (!order) return;
    setPaying(true);
    setPayError(null);
    try {
      setOrder((await api.post<Order>(`/api/orders/${order.id}/pay`)).data);
    } catch (err) {
      setPayError(apiErrorMessage(err, "Payment failed"));
    } finally {
      setPaying(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState
          title={error}
          action={
            <Link to="/customer/orders" className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
              My orders
            </Link>
          }
        />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <SkeletonRows count={3} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="text-center">
        <CheckCircle2 size={44} className="mx-auto text-green-600" />
        <h1 className="mt-3 text-2xl font-bold text-coffee-900">Thank you, your order is placed</h1>
        <p className="mt-1 text-sm text-coffee-500">
          Order <strong className="text-coffee-900">{order.orderNumber}</strong> · {formatDateTime(order.createdAt)}
        </p>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-coffee-900">Payment</h2>
          {order.paymentStatus && <Badge>{order.paymentStatus}</Badge>}
        </div>
        <p className="mt-1 text-sm text-coffee-700">
          {order.paymentMethod ? METHOD_LABELS[order.paymentMethod] : "—"} · Total {money(order.totalAmount)}
        </p>

        {order.paymentMethod === "COD" && <p className="mt-3 text-sm text-coffee-600">Pay when your order is delivered. Each seller will confirm and ship their part of the order.</p>}
        {order.paymentMethod === "ONLINE" && !awaitingOnline && <p className="mt-3 text-sm text-coffee-600">Payment received. Each seller will now confirm and ship their part of the order.</p>}
        {awaitingOnline && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-amber-800">Your payment has not gone through yet. Sellers start processing once it does.</p>
            <ErrorNote>{payError}</ErrorNote>
            <Button onClick={payNow} disabled={paying}>
              {paying ? "Processing…" : "Pay now"}
            </Button>
          </div>
        )}
        {order.paymentMethod === "BANK_TRANSFER" &&
          (awaitingTransfer ? (
            <div className="mt-3 space-y-2 text-sm text-coffee-700">
              <p>
                Transfer {money(order.totalAmount)} and quote <strong>{order.orderNumber}</strong> as the reference. Your order is confirmed once payment is verified.
              </p>
              {bankInstructions && <p className="whitespace-pre-wrap rounded-lg bg-cream-100 p-3">{bankInstructions}</p>}
            </div>
          ) : (
            <p className="mt-3 text-sm text-coffee-600">Your transfer has been verified.</p>
          ))}
      </Card>

      <h2 className="mt-8 font-semibold text-coffee-900">
        {order.vendorOrders.length > 1 ? `${order.vendorOrders.length} shipments, one per seller` : "Your shipment"}
      </h2>
      <div className="mt-3 space-y-4">
        {order.vendorOrders.map((vo) => (
          <Card key={vo.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-coffee-900">{vo.subOrderNumber}</p>
                <p className="text-sm text-coffee-500">
                  Sold and shipped by{" "}
                  <Link to={`/suppliers/${vo.vendorSlug}`} className="font-medium text-coffee-800 hover:underline">
                    {vo.vendorName}
                  </Link>
                </p>
              </div>
              <Badge>{vo.status}</Badge>
            </div>
            <div className="mt-3 border-t border-coffee-100 pt-3">
              <Items items={vo.items} />
            </div>
            <dl className="mt-3 space-y-1 border-t border-coffee-100 pt-3 text-sm">
              <div className="flex justify-between text-coffee-500">
                <dt>Items</dt>
                <dd>{money(vo.itemsSubtotal)}</dd>
              </div>
              <div className="flex justify-between text-coffee-500">
                <dt>Shipping</dt>
                <dd>{vo.shippingAmount > 0 ? money(vo.shippingAmount) : "Free"}</dd>
              </div>
              {vo.taxAmount > 0 && (
                <div className="flex justify-between text-coffee-500">
                  <dt>GST (included in prices)</dt>
                  <dd>{money(vo.taxAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between font-semibold text-coffee-900">
                <dt>Total</dt>
                <dd>{money(vo.totalAmount)}</dd>
              </div>
            </dl>
          </Card>
        ))}
        {order.vendorOrders.length === 0 && order.items.length > 0 && (
          <Card>
            <Items items={order.items} />
          </Card>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link to={`/customer/orders/${order.id}`} className="inline-flex justify-center rounded-full bg-coffee-800 px-5 py-2.5 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
          Track this order
        </Link>
        <Link to="/products" className="inline-flex justify-center rounded-full border border-coffee-300 px-5 py-2.5 text-sm font-semibold text-coffee-800 hover:bg-coffee-100">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
