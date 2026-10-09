import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useBrand } from "../../context/BrandContext";
import { formatDate, label, money } from "../../lib/format";
import type { Order, OrderItem, PostalAddress } from "../../types";
import Button from "../../components/ui/Button";
import { ErrorNote, SkeletonRows } from "../../components/ui/Common";

function AddressBlock({ title, address, name }: { title: string; address?: PostalAddress; name?: string }) {
  if (!address) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">{title}</p>
      <p className="mt-1 text-sm text-coffee-800">
        {name && (
          <>
            <span className="font-semibold">{name}</span>
            <br />
          </>
        )}
        {address.line1}
        {address.line2 && <>, {address.line2}</>}
        <br />
        {address.city}, {address.state} {address.pin}
      </p>
    </div>
  );
}

function ItemTable({ items }: { items: OrderItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-coffee-200 text-xs uppercase tracking-wide text-coffee-400">
            <th className="py-2 pr-3 font-semibold">Item</th>
            <th className="px-3 py-2 text-right font-semibold">Qty</th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">Unit price</th>
            <th className="whitespace-nowrap py-2 pl-3 text-right font-semibold">Line total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-coffee-100">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-2 pr-3 text-coffee-800">{item.productName}</td>
              <td className="px-3 py-2 text-right text-coffee-700">{item.quantity}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right text-coffee-700">{money(item.unitPrice)}</td>
              <td className="whitespace-nowrap py-2 pl-3 text-right font-medium text-coffee-900">{money(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CustomerInvoice() {
  const { id } = useParams();
  const brand = useBrand();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Order>(`/api/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Order not found")));
  }, [id]);

  return (
    <div className="min-h-screen bg-cream-100 px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link to={`/customer/orders/${id}`} className="inline-flex items-center gap-1 text-sm font-medium text-coffee-600 hover:underline">
            <ArrowLeft size={14} /> Back to order
          </Link>
          <Button onClick={() => window.print()} disabled={!order}>
            <Printer size={15} /> Print
          </Button>
        </div>

        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !order ? (
          <SkeletonRows count={3} />
        ) : (
          <div className="rounded-2xl border border-coffee-100 bg-white p-5 shadow-sm sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-coffee-200 pb-4">
              <div>
                <p className="text-2xl font-bold text-coffee-900">{brand.name}</p>
                <p className="text-xs text-coffee-500">{brand.tagline}</p>
              </div>
              <div className="text-left sm:text-right">
                <h1 className="text-lg font-bold uppercase tracking-wide text-coffee-900">Tax Invoice</h1>
                <p className="break-all text-sm text-coffee-700">Order {order.orderNumber}</p>
                <p className="text-sm text-coffee-500">Date: {formatDate(order.createdAt)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <AddressBlock title="Billed to" name={order.contactName ?? order.customerName} address={order.billingAddress ?? order.shippingAddress} />
              <AddressBlock title="Shipped to" name={order.contactName ?? order.customerName} address={order.shippingAddress} />
              {!order.shippingAddress && !order.billingAddress && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">Buyer</p>
                  <p className="mt-1 text-sm font-semibold text-coffee-800">{order.customerName}</p>
                </div>
              )}
              <div className="text-sm text-coffee-700">
                {order.contactPhone && <p>Phone: {order.contactPhone}</p>}
                {order.contactEmail && <p className="break-all">Email: {order.contactEmail}</p>}
                {order.gstNumber && (
                  <p>
                    Buyer GST number: <span className="break-all font-semibold">{order.gstNumber}</span>
                  </p>
                )}
              </div>
            </div>

            {order.vendorOrders.map((vo) => (
              <section key={vo.id} className="mt-6 break-inside-avoid border-t border-coffee-200 pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold text-coffee-900">Sold by {vo.vendorName}</h2>
                  <p className="break-all text-xs text-coffee-500">{vo.subOrderNumber}</p>
                  {vo.vendorAddress && <p className="text-xs text-coffee-500">{vo.vendorAddress}</p>}
                  {vo.vendorGstNumber && <p className="text-xs text-coffee-500">GSTIN: {vo.vendorGstNumber}</p>}
                </div>
                <div className="mt-2">
                  <ItemTable items={vo.items} />
                </div>
                <dl className="ml-auto mt-3 max-w-xs space-y-1 text-sm">
                  <div className="flex justify-between gap-4 text-coffee-600">
                    <dt>Subtotal</dt>
                    <dd>{money(vo.itemsSubtotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-coffee-600">
                    <dt>Shipping</dt>
                    <dd>{money(vo.shippingAmount)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 font-semibold text-coffee-900">
                    <dt>Total</dt>
                    <dd>{money(vo.totalAmount)}</dd>
                  </div>
                  <p className="text-right text-xs text-coffee-500">Includes GST of {money(vo.taxAmount)}</p>
                  {vo.refundAmount > 0 && (
                    <div className="flex justify-between gap-4 text-coffee-600">
                      <dt>Refunded</dt>
                      <dd>{money(vo.refundAmount)}</dd>
                    </div>
                  )}
                </dl>
              </section>
            ))}

            {order.vendorOrders.length === 0 && order.items.length > 0 && (
              <section className="mt-6 border-t border-coffee-200 pt-4">
                <ItemTable items={order.items} />
              </section>
            )}

            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t-2 border-coffee-800 pt-4">
              <div className="text-sm text-coffee-700">
                <p>
                  Payment method: <span className="font-semibold">{order.paymentMethod ? label(order.paymentMethod) : "—"}</span>
                </p>
                <p>
                  Payment status: <span className="font-semibold">{order.paymentStatus ? label(order.paymentStatus) : "—"}</span>
                </p>
                {order.paymentReference && <p className="break-all">Reference: {order.paymentReference}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">Grand total</p>
                <p className="text-2xl font-bold text-coffee-900">{money(order.totalAmount)}</p>
                {order.taxTotal != null && order.taxTotal > 0 && <p className="text-xs text-coffee-500">Includes GST of {money(order.taxTotal)}</p>}
              </div>
            </div>

            <p className="mt-6 border-t border-coffee-100 pt-4 text-xs leading-relaxed text-coffee-500">
              {brand.name} is a marketplace. The goods on this invoice are sold and fulfilled by the third-party sellers named above, who are
              responsible for the products, their dispatch and the applicable taxes. For help with this order contact {brand.supportEmail}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
