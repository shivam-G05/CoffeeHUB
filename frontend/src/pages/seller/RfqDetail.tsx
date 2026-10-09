import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { formatDate, money } from "../../lib/format";
import type { Quote, Rfq } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Card, ErrorNote, PageHeader, SkeletonRows } from "../../components/ui/Common";
import { Field, Input, Textarea } from "../../components/ui/Input";

const EMPTY = {
  pricePerUnit: "",
  moq: "",
  availableQuantity: "",
  taxPercent: "",
  shippingCost: "",
  leadTimeDays: "",
  validUntil: "",
  sampleCost: "",
  notes: "",
};

type Form = typeof EMPTY;

const text = (value?: number | null) => (value == null ? "" : String(value));
const num = (value: string) => (value.trim() === "" ? undefined : Number(value));

function toForm(q?: Quote): Form {
  if (!q) return EMPTY;
  return {
    pricePerUnit: text(q.pricePerUnit),
    moq: text(q.moq),
    availableQuantity: text(q.availableQuantity),
    taxPercent: text(q.taxPercent),
    shippingCost: text(q.shippingCost),
    leadTimeDays: text(q.leadTimeDays),
    validUntil: q.validUntil ?? "",
    sampleCost: text(q.sampleCost),
    notes: q.notes ?? "",
  };
}

function Detail({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-coffee-500">{name}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-coffee-900">{children}</dd>
    </div>
  );
}

export default function SellerRfqDetail() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"quote" | "decline" | null>(null);

  function apply(next: Rfq) {
    setRfq(next);
    setForm(toForm(next.myQuote));
  }

  useEffect(() => {
    setRfq(null);
    setLoadError(null);
    api
      .get<Rfq>(`/api/vendor/rfqs/${id}`)
      .then((res) => apply(res.data))
      .catch((err) => setLoadError(apiErrorMessage(err, "RFQ not found")));
  }, [id]);

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submitQuote(e: FormEvent) {
    e.preventDefault();
    setBusy("quote");
    setError(null);
    try {
      const res = await api.post<Rfq>(`/api/vendor/rfqs/${id}/quote`, {
        pricePerUnit: Number(form.pricePerUnit),
        moq: num(form.moq),
        availableQuantity: num(form.availableQuantity),
        taxPercent: num(form.taxPercent),
        shippingCost: num(form.shippingCost),
        leadTimeDays: num(form.leadTimeDays),
        validUntil: form.validUntil || undefined,
        sampleCost: num(form.sampleCost),
        notes: form.notes.trim() || undefined,
      });
      apply(res.data);
      showToast("Quote submitted", "success");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not submit your quote"));
    } finally {
      setBusy(null);
    }
  }

  async function decline() {
    if (!confirm("Decline this RFQ? Any quote you submitted will be withdrawn.")) return;
    setBusy("decline");
    setError(null);
    try {
      const res = await api.post<Rfq>(`/api/vendor/rfqs/${id}/decline`);
      apply(res.data);
      showToast("RFQ declined", "info");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not decline the RFQ"));
    } finally {
      setBusy(null);
    }
  }

  const back = (
    <Link to="/seller/rfqs" className="inline-flex items-center gap-1 text-sm font-medium text-coffee-500 hover:text-coffee-800">
      <ArrowLeft size={14} /> All RFQs
    </Link>
  );

  if (!rfq) {
    return (
      <div>
        {back}
        <div className="mt-4">{loadError ? <ErrorNote>{loadError}</ErrorNote> : <SkeletonRows />}</div>
      </div>
    );
  }

  const open = rfq.status === "OPEN";
  const quote = rfq.myQuote;
  const price = Number(form.pricePerUnit) || 0;
  const goods = price * rfq.quantity;
  const tax = (goods * (Number(form.taxPercent) || 0)) / 100;
  const shipping = Number(form.shippingCost) || 0;
  const today = new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD

  return (
    <div>
      {back}
      <div className="mt-2">
        <PageHeader
          title={rfq.title}
          subtitle={`${rfq.categoryName} · received ${formatDate(rfq.createdAt)}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {rfq.invitationStatus && <Badge>{rfq.invitationStatus}</Badge>}
              <Badge>{rfq.status}</Badge>
            </div>
          }
        />
      </div>

      {quote?.status === "ACCEPTED" && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          <span className="font-semibold">Your quote was accepted.</span> The buyer selected you for this requirement.
        </p>
      )}
      {quote?.status === "REJECTED" && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-semibold">Your quote was not selected.</span> The buyer chose another supplier for this requirement.
        </p>
      )}
      {!open && quote?.status !== "ACCEPTED" && quote?.status !== "REJECTED" && (
        <p className="mt-4 rounded-lg bg-coffee-100/60 px-3 py-2 text-sm text-coffee-700">This requirement is no longer accepting quotes.</p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold text-coffee-900">Buyer's requirement</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail name="Buyer">{rfq.buyerName}</Detail>
            <Detail name="Quantity">
              {rfq.quantity} {rfq.unit}
            </Detail>
            {rfq.productName && <Detail name="Product">{rfq.productName}</Detail>}
            {rfq.coffeeType && <Detail name="Coffee type">{rfq.coffeeType}</Detail>}
            <Detail name="Target price">{rfq.targetPrice != null ? `${money(rfq.targetPrice)} / ${rfq.unit}` : "Not specified"}</Detail>
            <Detail name="Delivery location">{rfq.deliveryLocation}</Detail>
            <Detail name="Required by">{formatDate(rfq.requiredBy)}</Detail>
            <Detail name="Sample required">{rfq.sampleRequired ? "Yes" : "No"}</Detail>
            <Detail name="Private label required">{rfq.privateLabelRequired ? "Yes" : "No"}</Detail>
            {rfq.specification && (
              <div className="sm:col-span-2">
                <Detail name="Specification">{rfq.specification}</Detail>
              </div>
            )}
            {rfq.additionalRequirements && (
              <div className="sm:col-span-2">
                <Detail name="Additional requirements">{rfq.additionalRequirements}</Detail>
              </div>
            )}
          </dl>
          <p className="mt-4 text-xs text-coffee-400">Only the buyer's company or first name is shown. Keep all communication on the platform.</p>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-coffee-900">{quote ? "Your quote" : "Submit a quote"}</h2>
            {quote && <Badge>{quote.status}</Badge>}
          </div>

          <form onSubmit={submitQuote} className="mt-4">
            <fieldset disabled={!open || busy !== null} className="grid gap-4 sm:grid-cols-2">
              <Field label={`Price per ${rfq.unit} (₹) *`}>
                <Input required type="number" min="0.01" step="0.01" value={form.pricePerUnit} onChange={set("pricePerUnit")} />
              </Field>
              <Field label={`Minimum order quantity (${rfq.unit})`}>
                <Input type="number" min="0" step="any" value={form.moq} onChange={set("moq")} />
              </Field>
              <Field label={`Available quantity (${rfq.unit})`}>
                <Input type="number" min="0" step="any" value={form.availableQuantity} onChange={set("availableQuantity")} />
              </Field>
              <Field label="Tax (%)">
                <Input type="number" min="0" step="0.01" value={form.taxPercent} onChange={set("taxPercent")} />
              </Field>
              <Field label="Shipping cost (₹)">
                <Input type="number" min="0" step="0.01" value={form.shippingCost} onChange={set("shippingCost")} />
              </Field>
              <Field label="Lead time (days)">
                <Input type="number" min="0" step="1" value={form.leadTimeDays} onChange={set("leadTimeDays")} />
              </Field>
              <Field label="Quote valid until">
                <Input type="date" min={today} value={form.validUntil} onChange={set("validUntil")} />
              </Field>
              <Field label={rfq.sampleRequired ? "Sample cost (₹): buyer wants a sample" : "Sample cost (₹)"}>
                <Input type="number" min="0" step="0.01" value={form.sampleCost} onChange={set("sampleCost")} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes for the buyer">
                  <Textarea rows={3} maxLength={2000} value={form.notes} onChange={set("notes")} placeholder="Grade, packaging, payment terms…" />
                </Field>
              </div>
            </fieldset>

            <div className="mt-4 rounded-lg bg-coffee-100/60 px-3 py-3 text-sm text-coffee-700">
              <div className="flex justify-between gap-4">
                <span>
                  Goods ({rfq.quantity} {rfq.unit})
                </span>
                <span>{money(goods)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Tax</span>
                <span>{money(tax)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Shipping</span>
                <span>{money(shipping)}</span>
              </div>
              <div className="mt-1 flex justify-between gap-4 border-t border-coffee-200 pt-1 font-bold text-coffee-900">
                <span>Estimated total</span>
                <span>{money(goods + tax + shipping)}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <ErrorNote>{error}</ErrorNote>
              {open && (
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={busy !== null}>
                    {busy === "quote" ? "Submitting…" : quote && quote.status !== "WITHDRAWN" ? "Update quote" : "Submit quote"}
                  </Button>
                  {rfq.invitationStatus !== "DECLINED" && (
                    <Button type="button" variant="ghost" disabled={busy !== null} onClick={decline}>
                      {busy === "decline" ? "Declining…" : "Decline"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
