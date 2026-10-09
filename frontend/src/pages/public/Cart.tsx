import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, Truck } from "lucide-react";
import { useBrand } from "../../context/BrandContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { money } from "../../lib/format";
import { useSeo } from "../../lib/seo";
import type { CartLine } from "../../types";
import Button from "../../components/ui/Button";
import { Card, EmptyState, ErrorNote, Img, PageHeader, SkeletonRows, VerifiedBadge } from "../../components/ui/Common";
import { productPath } from "../../components/ui/ProductCard";

export default function Cart() {
  const brand = useBrand();
  const navigate = useNavigate();
  const { cart, refresh, setQuantity, remove } = useCart();
  const { showToast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useSeo({ title: "Cart" }, brand.name);

  // Prices and stock may have changed since the cart was last fetched.
  useEffect(() => {
    refresh().finally(() => setLoaded(true));
  }, [refresh]);

  async function change(line: CartLine, action: () => Promise<void>) {
    setBusyId(line.id);
    try {
      await action();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update cart", "error");
    } finally {
      setBusyId(null);
    }
  }

  const browse = (
    <Link to="/products" className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
      Explore marketplace
    </Link>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title="Your cart" subtitle="Items from different sellers are packed and shipped separately by each seller." />

      <div className="mt-6">
        {!loaded ? (
          <SkeletonRows count={3} />
        ) : cart === null ? (
          <div className="space-y-3">
            <ErrorNote>Could not load your cart.</ErrorNote>
            <Button variant="secondary" onClick={() => refresh()}>
              Try again
            </Button>
          </div>
        ) : cart.groups.length === 0 ? (
          <EmptyState title="Your cart is empty" hint="Add products from verified suppliers, or post a requirement for bulk orders." action={browse} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="min-w-0 space-y-4">
              {cart.groups.map((group) => (
                <Card key={group.vendorId ?? group.vendorName} className="!p-0">
                  <div className="flex flex-wrap items-center gap-2 border-b border-coffee-100 px-4 py-3 text-sm">
                    <Truck size={16} className="text-coffee-500" />
                    <span className="text-coffee-500">Sold and shipped by</span>
                    {group.vendorSlug ? (
                      <Link to={`/suppliers/${group.vendorSlug}`} className="font-semibold text-coffee-900 hover:underline">
                        {group.vendorName}
                      </Link>
                    ) : (
                      <span className="font-semibold text-coffee-900">{group.vendorName}</span>
                    )}
                    {group.vendorVerified && <VerifiedBadge compact />}
                  </div>

                  <ul className="divide-y divide-coffee-100">
                    {group.items.map((line) => {
                      const min = Math.max(1, line.moq ?? 1);
                      const busy = busyId === line.id;
                      const path = productPath({ id: line.productId, slug: line.productSlug });
                      return (
                        <li key={line.id} className="flex gap-3 px-4 py-4">
                          <Link to={path} className="shrink-0">
                            <Img src={line.imageUrl} alt={line.name} className="h-20 w-20 rounded-xl" />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <Link to={path} className="line-clamp-2 font-semibold text-coffee-900 hover:underline">
                                {line.name}
                              </Link>
                              <p className="shrink-0 font-bold text-coffee-900">{money(line.lineTotal)}</p>
                            </div>
                            <p className="text-xs text-coffee-500">
                              {money(line.price)}
                              {line.priceUnit ? ` / ${line.priceUnit}` : ""}
                              {min > 1 ? ` · MOQ ${min}` : ""}
                            </p>
                            {line.issue && <p className="mt-1 text-sm font-medium text-red-600">{line.issue}</p>}
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              <div className="inline-flex items-center rounded-full border border-coffee-200">
                                <button
                                  onClick={() => change(line, () => setQuantity(line.id, line.quantity - 1))}
                                  disabled={busy || line.quantity <= min}
                                  aria-label={`Decrease quantity of ${line.name}`}
                                  className="flex h-9 w-9 items-center justify-center text-coffee-700 disabled:opacity-40"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="min-w-8 text-center text-sm font-semibold text-coffee-900" aria-live="polite">
                                  {line.quantity}
                                </span>
                                <button
                                  onClick={() => change(line, () => setQuantity(line.id, line.quantity + 1))}
                                  disabled={busy || line.quantity >= line.stock}
                                  aria-label={`Increase quantity of ${line.name}`}
                                  className="flex h-9 w-9 items-center justify-center text-coffee-700 disabled:opacity-40"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              {/* lets the buyer fix a line that is over stock or under the MOQ in one step */}
                              {line.available && line.stock >= min && (line.quantity > line.stock || line.quantity < min) && (
                                <button
                                  onClick={() => change(line, () => setQuantity(line.id, line.quantity > line.stock ? line.stock : min))}
                                  disabled={busy}
                                  className="text-xs font-semibold text-coffee-700 underline"
                                >
                                  Set to {line.quantity > line.stock ? line.stock : min}
                                </button>
                              )}
                              <button
                                onClick={() => change(line, () => remove(line.id))}
                                disabled={busy}
                                className="inline-flex items-center gap-1 text-xs font-medium text-coffee-500 hover:text-red-600 disabled:opacity-40"
                              >
                                <Trash2 size={14} /> Remove
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t border-coffee-100 px-4 py-3 text-sm text-coffee-600">
                    <span>
                      Subtotal <strong className="text-coffee-900">{money(group.subtotal)}</strong>
                    </span>
                    <span>
                      Shipping <strong className="text-coffee-900">{group.shipping > 0 ? money(group.shipping) : "Free"}</strong>
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            <aside>
              <Card>
                <h2 className="font-semibold text-coffee-900">Order summary</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-coffee-500">Items ({cart.itemCount})</dt>
                    <dd className="text-coffee-800">{money(cart.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-coffee-500">Shipping</dt>
                    <dd className="text-coffee-800">{cart.shippingTotal > 0 ? money(cart.shippingTotal) : "Free"}</dd>
                  </div>
                  <div className="flex justify-between border-t border-coffee-100 pt-2 text-base font-bold text-coffee-900">
                    <dt>Total</dt>
                    <dd>{money(cart.total)}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs text-coffee-400">Prices include GST.</p>
                {!cart.readyForCheckout && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Fix the items marked in red before checking out.</p>
                )}
                <Button className="mt-4 w-full" disabled={!cart.readyForCheckout} onClick={() => navigate("/checkout")}>
                  Proceed to Checkout
                </Button>
                <p className="mt-3 text-xs text-coffee-400">
                  {cart.groups.length > 1 ? `Your order will arrive as ${cart.groups.length} separate shipments, one per seller.` : "Each seller ships their items separately."}
                </p>
              </Card>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
