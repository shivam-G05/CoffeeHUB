import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import type { AttributeDef, Category, Product } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Card, ErrorNote, ImageUploader, PageHeader, SkeletonRows } from "../../components/ui/Common";
import { Field, Input, Select, Textarea } from "../../components/ui/Input";

const EMPTY = {
  name: "",
  description: "",
  categoryId: "",
  price: "",
  priceUnit: "",
  moq: "",
  stock: "0",
  shippingCharge: "",
  dispatchDays: "",
  shipsFrom: "",
};

type Form = typeof EMPTY;

const num = (value: string) => (value.trim() === "" ? undefined : Number(value));

export default function SellerProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [images, setImages] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitAfterSave = useRef(false);

  useEffect(() => {
    api
      .get<Category[]>("/api/categories")
      .then((res) => setCategories(res.data))
      .catch((err) => setLoadError(apiErrorMessage(err, "Could not load categories")));
  }, []);

  useEffect(() => {
    if (!id) return;
    api
      .get<Product>(`/api/products/${id}`)
      .then((res) => {
        const p = res.data;
        setProduct(p);
        setForm({
          name: p.name,
          description: p.description ?? "",
          categoryId: p.categoryId ? String(p.categoryId) : "",
          price: String(p.price),
          priceUnit: p.priceUnit ?? "",
          moq: p.moq != null ? String(p.moq) : "",
          stock: String(p.stock),
          shippingCharge: p.shippingCharge != null ? String(p.shippingCharge) : "",
          dispatchDays: p.dispatchDays != null ? String(p.dispatchDays) : "",
          shipsFrom: p.shipsFrom ?? "",
        });
        setAttributes(p.attributes ?? {});
        setImages(p.imageUrls?.length ? p.imageUrls : p.imageUrl ? [p.imageUrl] : []);
      })
      .catch((err) => setLoadError(apiErrorMessage(err, "Product not found")));
  }, [id]);

  // Products are listed under leaf categories: a parent's children, or a parent that has none.
  const leaves = useMemo(() => (categories ?? []).flatMap((c) => (c.children.length > 0 ? c.children : [c])), [categories]);
  const category = leaves.find((c) => String(c.id) === form.categoryId);
  const defs: AttributeDef[] = category?.attributes ?? [];

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setAttribute = (key: string, value: string) => setAttributes((a) => ({ ...a, [key]: value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    const thenSubmit = submitAfterSave.current;
    setSaving(true);
    setError(null);

    // Only this category's attributes, and only the ones that were filled in.
    const filled: Record<string, string> = {};
    for (const def of defs) {
      const value = (attributes[def.key] ?? "").trim();
      if (def.type === "BOOLEAN") filled[def.key] = value === "true" ? "true" : "false";
      else if (value) filled[def.key] = value;
    }

    const body = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      priceUnit: form.priceUnit.trim() || undefined,
      moq: num(form.moq),
      categoryId: Number(form.categoryId),
      stock: num(form.stock) ?? 0,
      imageUrl: images[0],
      imageUrls: images,
      attributes: filled,
      shippingCharge: num(form.shippingCharge),
      dispatchDays: num(form.dispatchDays),
      shipsFrom: form.shipsFrom.trim() || undefined,
    };

    let saved: Product;
    try {
      saved = (id ? await api.put<Product>(`/api/products/${id}`, body) : await api.post<Product>("/api/products", body)).data;
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save the product"));
      setSaving(false);
      return;
    }

    // Saving a live listing already sends it back for review, so there is nothing left to submit.
    if (thenSubmit && (saved.status === "DRAFT" || saved.status === "REJECTED")) {
      try {
        await api.post(`/api/products/${saved.id}/submit`);
      } catch (err) {
        const message = apiErrorMessage(err, "Could not submit the product for review");
        setSaving(false);
        if (id) {
          setProduct(saved);
          setError(`Saved as a draft, but not submitted. ${message}`);
        } else {
          // The draft now exists: continue on its edit page rather than creating a duplicate on retry.
          showToast(`Saved as a draft, but not submitted. ${message}`, "error");
          navigate(`/seller/products/${saved.id}/edit`, { replace: true });
        }
        return;
      }
      showToast("Product submitted for review", "success");
    } else {
      showToast(saved.status === "PENDING" ? "Saved. The listing is awaiting review." : "Draft saved", "success");
    }
    navigate("/seller/products");
  }

  const title = id ? "Edit product" : "Add product";
  const back = (
    <Link to="/seller/products" className="inline-flex items-center gap-1 text-sm font-medium text-coffee-500 hover:text-coffee-800">
      <ArrowLeft size={14} /> All products
    </Link>
  );

  if (loadError || !categories || (id && !product)) {
    return (
      <div>
        {back}
        <div className="mt-2">
          <PageHeader title={title} />
        </div>
        <div className="mt-6">{loadError ? <ErrorNote>{loadError}</ErrorNote> : <SkeletonRows />}</div>
      </div>
    );
  }

  const isLive = product?.status === "APPROVED" || product?.status === "OUT_OF_STOCK" || product?.status === "PENDING";
  const suspended = product?.status === "SUSPENDED";
  // A category that has since been deactivated or given sub-categories still has to show for an existing product.
  const orphanCategory = product && form.categoryId === String(product.categoryId) && !category;

  return (
    <div>
      {back}
      <div className="mt-2">
        <PageHeader title={title} subtitle="Fields change with the category you choose." action={product ? <Badge>{product.status}</Badge> : undefined} />
      </div>

      {product?.rejectionReason && (product.status === "REJECTED" || suspended) && (
        <p className="mt-4 whitespace-pre-wrap rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-semibold">{suspended ? "Suspended: " : "Rejected: "}</span>
          {product.rejectionReason}
        </p>
      )}

      <form onSubmit={save} className="mt-6 space-y-6">
        <Card>
          <h2 className="font-bold text-coffee-900">Basics</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Product name *">
                <Input required maxLength={255} value={form.name} onChange={set("name")} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Category *">
                <Select required value={form.categoryId} onChange={set("categoryId")}>
                  <option value="">Select a category</option>
                  {orphanCategory && <option value={form.categoryId}>{product.categoryName ?? "Current category"}</option>}
                  {categories.map((c) =>
                    c.children.length > 0 ? (
                      <optgroup key={c.id} label={c.name}>
                        {c.children.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    )
                  )}
                </Select>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea rows={5} maxLength={2000} value={form.description} onChange={set("description")} />
              </Field>
            </div>
          </div>
        </Card>

        {category && defs.length > 0 && (
          <Card>
            <h2 className="font-bold text-coffee-900">{category.name} details</h2>
            <p className="mt-1 text-xs text-coffee-500">Fields marked * are needed before the product can be submitted for review.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {defs.map((def) => {
                const text = `${def.label}${def.unit ? ` (${def.unit})` : ""}${def.required ? " *" : ""}`;
                const value = attributes[def.key] ?? "";
                if (def.type === "BOOLEAN") {
                  return (
                    <label key={def.key} className="flex items-center gap-2 self-end py-2 text-sm text-coffee-800">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-coffee-800"
                        checked={value === "true"}
                        onChange={(e) => setAttribute(def.key, e.target.checked ? "true" : "false")}
                      />
                      {def.label}
                    </label>
                  );
                }
                return (
                  <Field key={def.key} label={text}>
                    {def.type === "SELECT" ? (
                      <Select value={value} onChange={(e) => setAttribute(def.key, e.target.value)}>
                        <option value="">Select</option>
                        {value && !def.options.includes(value) && <option value={value}>{value}</option>}
                        {def.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </Select>
                    ) : def.type === "NUMBER" ? (
                      <Input type="number" step="any" value={value} onChange={(e) => setAttribute(def.key, e.target.value)} />
                    ) : (
                      <Input value={value} onChange={(e) => setAttribute(def.key, e.target.value)} />
                    )}
                  </Field>
                );
              })}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-bold text-coffee-900">Pricing & stock</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Price (₹) *">
              <Input required type="number" min="0" step="0.01" value={form.price} onChange={set("price")} />
            </Field>
            <Field label="Price unit">
              <Input maxLength={30} value={form.priceUnit} onChange={set("priceUnit")} placeholder="e.g. kg, pack, unit" />
            </Field>
            <Field label="Minimum order quantity (optional)">
              <Input type="number" min="1" step="1" value={form.moq} onChange={set("moq")} />
            </Field>
            <Field label="Stock / available quantity *">
              <Input required type="number" min="0" step="1" value={form.stock} onChange={set("stock")} />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-coffee-900">Images</h2>
          <div className="mt-4">
            <ImageUploader value={images} onChange={setImages} max={8} />
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-coffee-900">Shipping</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Shipping charge (₹)">
              <Input type="number" min="0" step="0.01" value={form.shippingCharge} onChange={set("shippingCharge")} placeholder="0 for free shipping" />
            </Field>
            <Field label="Dispatch time (days)">
              <Input type="number" min="0" step="1" value={form.dispatchDays} onChange={set("dispatchDays")} />
            </Field>
            <Field label="Ships from">
              <Input maxLength={150} value={form.shipsFrom} onChange={set("shipsFrom")} placeholder="City, State" />
            </Field>
          </div>
        </Card>

        <ErrorNote>{error}</ErrorNote>

        {!suspended && (
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant={isLive ? "primary" : "secondary"} disabled={saving} onClick={() => (submitAfterSave.current = false)}>
              {saving ? "Saving…" : isLive ? "Save changes" : "Save draft"}
            </Button>
            {!isLive && (
              <Button type="submit" disabled={saving} onClick={() => (submitAfterSave.current = true)}>
                {saving ? "Saving…" : "Save and submit for review"}
              </Button>
            )}
          </div>
        )}

        <p className="text-xs text-coffee-500">
          {suspended
            ? "This listing was suspended and cannot be edited. Contact support to restore it."
            : "Editing a live listing sends it back for review before the changes appear publicly. A product needs at least one image, a description, a price and shipping details to be submitted. To change only stock or price without a new review, use the Inventory page."}
        </p>
      </form>
    </div>
  );
}
