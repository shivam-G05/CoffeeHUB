import { useEffect, useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "../../api/client";
import type { Product, ProductType } from "../../types";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { StarRating } from "../../components/ui/StarRating";
import { Field, Input, Select, Textarea } from "../../components/ui/Input";

interface FormState {
  id?: number;
  name: string;
  description: string;
  price: string;
  type: ProductType;
  category: string;
  stock: string;
  imageUrl: string;
}

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  type: "BEAN",
  category: "",
  stock: "0",
  imageUrl: "",
};

export default function SellerProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api
      .get<Product[]>("/api/products/mine")
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startCreate() {
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function startEdit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      type: p.type,
      category: p.category ?? "",
      stock: String(p.stock),
      imageUrl: p.imageUrl ?? "",
    });
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      type: form.type,
      category: form.category,
      stock: Number(form.stock),
      imageUrl: form.imageUrl,
    };
    try {
      if (form.id) {
        await api.put(`/api/products/${form.id}`, payload);
      } else {
        await api.post("/api/products", payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save product"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this product?")) return;
    await api.delete(`/api/products/${id}`);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-coffee-900">My Products</h1>
        <Button onClick={startCreate}>+ Add product</Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 grid gap-4 rounded-2xl border border-coffee-100 bg-cream-50 p-6 sm:grid-cols-2"
        >
          <Field label="Product name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ProductType })}>
              <option value="BEAN">Bean</option>
              <option value="MACHINE">Machine</option>
              <option value="ACCESSORY">Accessory</option>
            </Select>
          </Field>
          <Field label="Category">
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Espresso Machine" />
          </Field>
          <Field label="Price (₹)">
            <Input type="number" min="0" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </Field>
          <Field label="Stock">
            <Input type="number" min="0" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </Field>
          <Field label="Image URL (optional)">
            <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>

          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save product"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-coffee-400 sm:col-span-2">
            New or edited products need admin approval before they appear publicly.
          </p>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-coffee-400">Loading…</p>
      ) : products.length === 0 ? (
        <p className="mt-8 text-coffee-400">You haven&rsquo;t listed any products yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
          <table className="w-full text-left text-sm">
            <thead className="bg-coffee-100 text-coffee-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee-100">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-coffee-900">{p.name}</td>
                  <td className="px-4 py-3 text-coffee-500">{p.type}</td>
                  <td className="px-4 py-3 text-coffee-500">₹{p.price.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-coffee-500">{p.stock}</td>
                  <td className="px-4 py-3">
                    <StarRating rating={p.avgRating} count={p.reviewCount} size={12} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.approved ? "approved" : "pending"}>{p.approved ? "Approved" : "Pending"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(p)} className="mr-3 text-coffee-700 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
