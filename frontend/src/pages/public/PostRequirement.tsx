import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api, apiErrorMessage, track } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import { useSeo } from "../../lib/seo";
import type { Category, Product, Rfq } from "../../types";
import Button from "../../components/ui/Button";
import { Card, ErrorNote, PageHeader } from "../../components/ui/Common";
import { Field, Input, Select, Textarea } from "../../components/ui/Input";

// A guest's entries are kept across the detour through login.
const DRAFT_KEY = "coffeehub_rfq_draft";

const emptyForm = {
  title: "",
  categoryId: "",
  coffeeType: "",
  specification: "",
  quantity: "",
  unit: "kg",
  targetPrice: "",
  deliveryLocation: "",
  requiredBy: "",
  sampleRequired: false,
  privateLabelRequired: false,
  additionalRequirements: "",
};

function initialForm(): typeof emptyForm {
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    return saved ? { ...emptyForm, ...(JSON.parse(saved) as Partial<typeof emptyForm>) } : emptyForm;
  } catch {
    return emptyForm;
  }
}

const UNITS = ["kg", "g", "tonnes", "bags", "units", "boxes", "litres"];

const STEPS = [
  { title: "We review it", text: "Our team checks your requirement before it goes to suppliers." },
  { title: "Routed to verified suppliers", text: "It is shared only with verified suppliers who match the category." },
  { title: "Compare quotes", text: "See price, lead time and supplier ratings side by side, then select one." },
];

/** Categories a requirement can be filed under: the leaves of the tree, labelled with their parent. */
function leafCategories(tree: Category[]): { id: number; name: string }[] {
  return tree.flatMap((root) =>
    root.children.length === 0 ? [{ id: root.id, name: root.name }] : root.children.map((child) => ({ id: child.id, name: `${root.name} › ${child.name}` })),
  );
}

export default function PostRequirement() {
  const brand = useBrand();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const productId = Number(params.get("productId")) || null;

  const [categories, setCategories] = useState<{ id: number; name: string }[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSeo(
    {
      title: "Post a requirement",
      description: `Post your bulk coffee, equipment or supplies requirement on ${brand.name} and compare quotes from verified suppliers.`,
      canonicalPath: "/post-requirement",
    },
    brand.name,
  );

  useEffect(() => {
    track("rfq_started");
    sessionStorage.removeItem(DRAFT_KEY); // already read into the form's initial state
    api
      .get<Category[]>("/api/categories")
      .then((res) => setCategories(leafCategories(res.data)))
      .catch((err) => setLoadError(apiErrorMessage(err, "Could not load categories")));
  }, []);

  useEffect(() => {
    if (!productId) return;
    api
      .get<Product>(`/api/products/${productId}`)
      .then((res) => {
        const p = res.data;
        setProduct(p);
        // prefill only what the buyer has not already typed
        setForm((prev) => ({
          ...prev,
          title: prev.title || `Quote for ${p.name}`.slice(0, 200),
          categoryId: prev.categoryId || (p.categoryId != null ? String(p.categoryId) : ""),
          unit: p.priceUnit && UNITS.includes(p.priceUnit) ? p.priceUnit : prev.unit,
        }));
      })
      .catch(() => undefined); // the form still works as a general requirement
  }, [productId]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      navigate("/login", { state: { from: location.pathname + location.search } });
      return;
    }
    if (user.role !== "CUSTOMER") return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<Rfq>("/api/rfqs", {
        title: form.title.trim(),
        categoryId: Number(form.categoryId),
        productId: product?.id,
        coffeeType: form.coffeeType.trim() || undefined,
        specification: form.specification.trim() || undefined,
        quantity: Number(form.quantity),
        unit: form.unit,
        targetPrice: form.targetPrice ? Number(form.targetPrice) : undefined,
        deliveryLocation: form.deliveryLocation.trim(),
        requiredBy: form.requiredBy || undefined,
        sampleRequired: form.sampleRequired,
        privateLabelRequired: form.privateLabelRequired,
        additionalRequirements: form.additionalRequirements.trim() || undefined,
      });
      track("rfq_submitted");
      navigate(`/customer/rfqs/${res.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not post your requirement"));
      setSubmitting(false);
    }
  }

  const today = new Date().toLocaleDateString("en-CA"); // yyyy-mm-dd in local time
  const blockedRole = user && user.role !== "CUSTOMER";
  // the product's own category is offered even if it is not a leaf
  const options =
    categories && product?.categoryId != null && !categories.some((c) => c.id === product.categoryId)
      ? [{ id: product.categoryId, name: product.categoryName ?? "Product category" }, ...categories]
      : categories;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader title="Post a requirement" subtitle="Tell verified suppliers what you need and compare their quotes. Posting is free and there is no obligation to buy." />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          {product && (
            <p className="mb-4 rounded-lg bg-coffee-100/60 px-3 py-2 text-sm text-coffee-700">
              Requesting a quote for <strong className="text-coffee-900">{product.name}</strong>
              {product.vendorName ? ` from ${product.vendorName}` : ""}.
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Requirement title">
              <Input required maxLength={200} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 500 kg Arabica AA green beans, monthly" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <Select required value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} disabled={!options}>
                  <option value="">{options ? "Select…" : "Loading…"}</option>
                  {options?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Coffee type (optional)">
                <Input maxLength={100} value={form.coffeeType} onChange={(e) => set("coffeeType", e.target.value)} placeholder="Arabica, Robusta, blend…" />
              </Field>
            </div>
            <ErrorNote>{loadError}</ErrorNote>
            <Field label="Grade / specification (optional)">
              <Textarea rows={2} maxLength={1000} value={form.specification} onChange={(e) => set("specification", e.target.value)} placeholder="Grade, screen size, roast level, processing, certifications…" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Quantity">
                <Input type="number" required min={0.01} step="any" inputMode="decimal" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
              </Field>
              <Field label="Unit">
                <Select required value={form.unit} onChange={(e) => set("unit", e.target.value)}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={`Target price per ${form.unit} (₹, optional)`}>
                <Input type="number" min={0} step="any" inputMode="decimal" value={form.targetPrice} onChange={(e) => set("targetPrice", e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Delivery location">
                <Input required maxLength={200} value={form.deliveryLocation} onChange={(e) => set("deliveryLocation", e.target.value)} placeholder="City, state" />
              </Field>
              <Field label="Required by (optional)">
                <Input type="date" min={today} value={form.requiredBy} onChange={(e) => set("requiredBy", e.target.value)} />
              </Field>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="flex items-center gap-2 text-sm text-coffee-800">
                <input type="checkbox" checked={form.sampleRequired} onChange={(e) => set("sampleRequired", e.target.checked)} className="h-4 w-4 accent-coffee-800" />
                Sample required
              </label>
              <label className="flex items-center gap-2 text-sm text-coffee-800">
                <input type="checkbox" checked={form.privateLabelRequired} onChange={(e) => set("privateLabelRequired", e.target.checked)} className="h-4 w-4 accent-coffee-800" />
                Private label required
              </label>
            </div>
            <Field label="Additional requirements (optional)">
              <Textarea rows={3} maxLength={2000} value={form.additionalRequirements} onChange={(e) => set("additionalRequirements", e.target.value)} placeholder="Packaging, payment terms, delivery schedule…" />
            </Field>

            <ErrorNote>{error}</ErrorNote>

            {blockedRole ? (
              <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">
                Requirements can only be posted from a buyer account. You are signed in as {user.role === "SELLER" ? "a seller" : "an admin"}
                {user.role === "SELLER" ? (
                  <>
                    : requirements routed to you appear under{" "}
                    <Link to="/seller/rfqs" className="font-semibold underline">
                      RFQs
                    </Link>{" "}
                    in your dashboard.
                  </>
                ) : (
                  "."
                )}
              </p>
            ) : (
              <div>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? "Posting…" : user ? "Post requirement" : "Log in to post requirement"}
                </Button>
                {!user && (
                  <p className="mt-2 text-xs text-coffee-400">
                    You need a buyer account to post. New here?{" "}
                    <Link to="/register" state={{ from: location.pathname + location.search }} className="underline">
                      Create one
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}
          </form>
        </Card>

        <aside>
          <Card>
            <h2 className="font-semibold text-coffee-900">What happens next</h2>
            <ol className="mt-4 space-y-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coffee-800 text-xs font-bold text-cream-50">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-coffee-800">{step.title}</p>
                    <p className="text-sm text-coffee-500">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs text-coffee-400">Your contact details are not shown to suppliers. Quotes and messages stay on {brand.name}.</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
