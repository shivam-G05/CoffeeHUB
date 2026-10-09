import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiErrorMessage, track } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { INDIAN_STATES } from "../../lib/constants";
import { money } from "../../lib/format";
import { useSeo } from "../../lib/seo";
import type { Address, Order, PaymentMethod, PaymentOptions, PostalAddress } from "../../types";
import Button from "../../components/ui/Button";
import { Card, ErrorNote, PageHeader, SkeletonRows, VerifiedBadge } from "../../components/ui/Common";
import { Field, Input, Select, Textarea } from "../../components/ui/Input";

const emptyAddress: PostalAddress = { line1: "", line2: "", city: "", state: "", pin: "" };

const METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: "Cash on delivery",
  BANK_TRANSFER: "Bank transfer",
  ONLINE: "Pay online",
};

function AddressFields({ value, onChange }: { value: PostalAddress; onChange: (next: PostalAddress) => void }) {
  const set = (key: keyof PostalAddress, v: string) => onChange({ ...value, [key]: v });
  // a saved address may carry a state spelled differently from the list
  const states = value.state && !INDIAN_STATES.includes(value.state) ? [value.state, ...INDIAN_STATES] : INDIAN_STATES;
  return (
    <div className="space-y-4">
      <Field label="Address line 1">
        <Input required maxLength={255} autoComplete="address-line1" value={value.line1} onChange={(e) => set("line1", e.target.value)} />
      </Field>
      <Field label="Address line 2 (optional)">
        <Input maxLength={255} autoComplete="address-line2" value={value.line2 ?? ""} onChange={(e) => set("line2", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City">
          <Input required maxLength={100} value={value.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="State">
          <Select required value={value.state} onChange={(e) => set("state", e.target.value)}>
            <option value="">Select…</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="PIN code">
          <Input
            required
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            title="6-digit PIN code"
            value={value.pin}
            onChange={(e) => set("pin", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
      </div>
    </div>
  );
}

function toInput(a: PostalAddress): PostalAddress {
  return { line1: a.line1.trim(), line2: a.line2?.trim() || undefined, city: a.city.trim(), state: a.state, pin: a.pin };
}

export default function Checkout() {
  const brand = useBrand();
  const { user } = useAuth();
  const { cart, refresh } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [cartLoaded, setCartLoaded] = useState(false);
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [savedId, setSavedId] = useState("");

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [shipping, setShipping] = useState<PostalAddress>(emptyAddress);
  const [billingSame, setBillingSame] = useState(true);
  const [billing, setBilling] = useState<PostalAddress>(emptyAddress);
  const [gstNumber, setGstNumber] = useState(user?.gstNumber ?? "");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const placed = useRef(false);

  useSeo({ title: "Checkout" }, brand.name);

  function applySaved(address: Address) {
    setSavedId(String(address.id));
    setShipping({ line1: address.line1, line2: address.line2 ?? "", city: address.city, state: address.state, pin: address.pin });
    setName(address.name);
    setPhone(address.phone);
  }

  useEffect(() => {
    track("checkout_started");
    refresh().finally(() => setCartLoaded(true));
    api
      .get<PaymentOptions>("/api/checkout/payment-options")
      .then((res) => {
        setOptions(res.data);
        setMethod(res.data.methods[0] ?? "");
      })
      .catch((err) => setOptionsError(apiErrorMessage(err, "Could not load payment options")));
    api
      .get<Address[]>("/api/addresses")
      .then((res) => {
        setAddresses(res.data);
        const preferred = res.data.find((a) => a.defaultAddress);
        if (preferred) applySaved(preferred);
      })
      .catch(() => undefined); // saved addresses are a convenience; the form works without them
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEmpty = cartLoaded && (cart === null || cart.groups.length === 0);

  // `placed` stops this firing when the cart empties because the order just went through.
  useEffect(() => {
    if (isEmpty && !placed.current) navigate("/cart", { replace: true });
  }, [isEmpty, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!method) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<Order>("/api/checkout", {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        shippingAddress: toInput(shipping),
        billingAddress: billingSame ? null : toInput(billing),
        gstNumber: gstNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        paymentMethod: method,
      });
      const order = res.data;
      placed.current = true;
      if (method === "ONLINE") {
        try {
          await api.post<Order>(`/api/orders/${order.id}/pay`);
        } catch (err) {
          // the order exists either way; payment can be retried from the confirmation page
          showToast(apiErrorMessage(err, "Order placed, but the payment did not go through"), "error");
        }
      }
      await refresh();
      track("purchase", order.orderNumber);
      navigate(`/order-success/${order.id}`, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Could not place your order"));
      setSubmitting(false);
      refresh(); // stock or prices may have changed
    }
  }

  if (!cartLoaded || !cart || isEmpty) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SkeletonRows count={3} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title="Checkout" subtitle="One payment covers all sellers. Each seller ships their items separately." />

      <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <h2 className="font-semibold text-coffee-900">Contact details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <Input required maxLength={255} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Mobile number">
                <Input type="tel" required minLength={10} maxLength={30} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Email">
                  <Input type="email" required maxLength={255} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-coffee-900">Delivery address</h2>
            {addresses.length > 0 && (
              <div className="mt-4">
                <Field label="Use a saved address">
                  <Select
                    value={savedId}
                    onChange={(e) => {
                      const picked = addresses.find((a) => String(a.id) === e.target.value);
                      if (picked) applySaved(picked);
                      else setSavedId("");
                    }}
                  >
                    <option value="">Enter a new address</option>
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {[a.label, a.name, a.line1, a.city].filter(Boolean).join(", ")}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
            <div className="mt-4">
              <AddressFields
                value={shipping}
                onChange={(next) => {
                  setShipping(next);
                  setSavedId("");
                }}
              />
            </div>

            <label className="mt-5 flex items-center gap-2 text-sm text-coffee-800">
              <input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} className="h-4 w-4 accent-coffee-800" />
              Billing address is the same as delivery
            </label>
            {!billingSame && (
              <div className="mt-4 border-t border-coffee-100 pt-4">
                <h3 className="mb-4 text-sm font-semibold text-coffee-900">Billing address</h3>
                <AddressFields value={billing} onChange={setBilling} />
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold text-coffee-900">Invoice &amp; notes</h2>
            <div className="mt-4 space-y-4">
              <Field label="GST number (optional, for a GST invoice)">
                <Input maxLength={20} value={gstNumber} onChange={(e) => setGstNumber(e.target.value.toUpperCase())} />
              </Field>
              <Field label="Order notes (optional)">
                <Textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the sellers should know about this order" />
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-coffee-900">Payment method</h2>
            <div className="mt-4 space-y-3">
              {optionsError ? (
                <ErrorNote>{optionsError}</ErrorNote>
              ) : options === null ? (
                <SkeletonRows count={1} />
              ) : (
                <fieldset className="space-y-3">
                  <legend className="sr-only">Payment method</legend>
                  {options.methods.map((m) => (
                    <label key={m} className={`block cursor-pointer rounded-2xl border p-4 ${method === m ? "border-coffee-700 bg-coffee-100/40" : "border-coffee-100"}`}>
                      <span className="flex items-center gap-3 text-sm font-semibold text-coffee-900">
                        <input type="radio" name="paymentMethod" value={m} checked={method === m} onChange={() => setMethod(m)} className="h-4 w-4 accent-coffee-800" />
                        {METHOD_LABELS[m]}
                        {m === "ONLINE" && options.onlineIsTestMode && <span className="font-normal text-coffee-500">(test mode)</span>}
                      </span>
                      {m === "COD" && <span className="mt-1 block pl-7 text-xs text-coffee-500">Pay when your order is delivered.</span>}
                      {m === "ONLINE" && options.onlineIsTestMode && (
                        <span className="mt-1 block pl-7 text-xs text-coffee-500">No real money is charged: the payment is simulated.</span>
                      )}
                      {m === "BANK_TRANSFER" && (
                        <span className="mt-1 block pl-7 text-xs text-coffee-500">
                          Your order is confirmed once we verify your transfer.
                          {method === m && options.bankTransferInstructions && (
                            <span className="mt-2 block whitespace-pre-wrap rounded-lg bg-cream-100 p-3 text-coffee-700">{options.bankTransferInstructions}</span>
                          )}
                        </span>
                      )}
                    </label>
                  ))}
                </fieldset>
              )}
            </div>
          </Card>
        </div>

        <aside className="min-w-0">
          <Card className="lg:sticky lg:top-32">
            <h2 className="font-semibold text-coffee-900">Order summary</h2>
            <div className="mt-3 space-y-4">
              {cart.groups.map((group) => (
                <div key={group.vendorId ?? group.vendorName} className="border-b border-coffee-100 pb-3 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-coffee-800">
                    {group.vendorName} {group.vendorVerified && <VerifiedBadge compact />}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {group.items.map((line) => (
                      <li key={line.id} className="flex justify-between gap-3 text-coffee-600">
                        <span className="min-w-0 break-words">
                          {line.name} × {line.quantity}
                        </span>
                        <span className="shrink-0">{money(line.lineTotal)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 flex justify-between text-xs text-coffee-500">
                    <span>Shipping</span>
                    <span>{group.shipping > 0 ? money(group.shipping) : "Free"}</span>
                  </p>
                </div>
              ))}
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-coffee-500">Items</dt>
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
            <p className="mt-1 text-xs text-coffee-400">Prices include GST.</p>

            {!cart.readyForCheckout && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Some items need attention.{" "}
                <Link to="/cart" className="font-semibold underline">
                  Review your cart
                </Link>
              </p>
            )}
            <div className="mt-3">
              <ErrorNote>{error}</ErrorNote>
            </div>
            <Button type="submit" className="mt-3 w-full" disabled={submitting || !method || !cart.readyForCheckout}>
              {submitting ? "Placing order…" : method === "ONLINE" ? "Pay and place order" : "Place order"}
            </Button>
            <p className="mt-3 text-xs text-coffee-400">
              By placing this order you agree to the{" "}
              <Link to="/policies/terms-conditions" className="underline">
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link to="/policies/refund-cancellation" className="underline">
                Refund &amp; Cancellation
              </Link>{" "}
              policy.
            </p>
          </Card>
        </aside>
      </form>
    </div>
  );
}
