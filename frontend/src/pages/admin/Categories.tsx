import { Fragment, useCallback, useEffect, useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { label } from "../../lib/format";
import type { AttributeGroup, Category } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, ImageUploader, Modal, PageHeader, SkeletonRows } from "../../components/ui/Common";
import { Field, Input, Select } from "../../components/ui/Input";

const ATTRIBUTE_GROUPS: AttributeGroup[] = [
  "GREEN_COFFEE",
  "ROASTED_COFFEE",
  "INSTANT_COFFEE",
  "EQUIPMENT",
  "ACCESSORY",
  "BUSINESS_SUPPLY",
  "GENERAL",
];

interface FormState {
  id?: number;
  name: string;
  parentId: string;
  attributeGroup: AttributeGroup;
  commissionRate: string;
  taxRate: string;
  imageUrl: string;
  active: boolean;
  featured: boolean;
  sortOrder: string;
}

const blank: FormState = {
  name: "",
  parentId: "",
  attributeGroup: "GENERAL",
  commissionRate: "",
  taxRate: "",
  imageUrl: "",
  active: true,
  featured: false,
  sortOrder: "0",
};

function toForm(c: Category): FormState {
  return {
    id: c.id,
    name: c.name,
    parentId: c.parentId != null ? String(c.parentId) : "",
    attributeGroup: c.attributeGroup,
    commissionRate: c.commissionRate != null ? String(c.commissionRate) : "",
    taxRate: c.taxRate != null ? String(c.taxRate) : "",
    imageUrl: c.imageUrl ?? "",
    active: c.active,
    featured: c.featured,
    sortOrder: String(c.sortOrder),
  };
}

export default function AdminCategories() {
  const { showToast } = useToast();
  const [tree, setTree] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api
      .get<Category[]>("/api/admin/categories")
      .then((res) => setTree(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load categories")));
  }, []);

  useEffect(load, [load]);

  function edit(next: FormState) {
    setFormError(null);
    setForm(next);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setFormError(null);
    const body = {
      name: form.name.trim(),
      parentId: form.parentId ? Number(form.parentId) : null,
      attributeGroup: form.attributeGroup,
      commissionRate: form.commissionRate === "" ? null : Number(form.commissionRate),
      taxRate: form.taxRate === "" ? null : Number(form.taxRate),
      imageUrl: form.imageUrl || null,
      active: form.active,
      featured: form.featured,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (form.id) await api.put(`/api/admin/categories/${form.id}`, body);
      else await api.post("/api/admin/categories", body);
      showToast(form.id ? "Category updated" : "Category created", "success");
      setForm(null);
      load();
    } catch (err) {
      setFormError(apiErrorMessage(err, "Could not save the category"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Category) {
    if (!window.confirm(`Delete the category "${c.name}"?`)) return;
    try {
      await api.delete(`/api/admin/categories/${c.id}`);
      showToast("Category deleted", "success");
      load();
    } catch (err) {
      // The server refuses when the category still has products or subcategories and says which.
      showToast(apiErrorMessage(err, "Could not delete the category"), "error");
    }
  }

  function row(c: Category, child: boolean) {
    return (
      <tr key={c.id} className={c.active ? "" : "opacity-60"}>
        <td className={`px-4 py-3 ${child ? "pl-9 text-coffee-700" : "font-semibold text-coffee-900"}`}>{c.name}</td>
        <td className="px-4 py-3 text-coffee-600">{c.commissionRate != null ? `${c.commissionRate}%` : <span className="text-coffee-400">Inherits</span>}</td>
        <td className="px-4 py-3 font-medium text-coffee-900">{c.effectiveCommissionRate}%</td>
        <td className="px-4 py-3 text-coffee-600">{c.effectiveTaxRate}%{c.taxRate == null && <span className="text-coffee-400"> (inherited)</span>}</td>
        <td className="px-4 py-3 text-coffee-500">{label(c.attributeGroup)}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            <Badge tone={c.active ? "approved" : "DRAFT"}>{c.active ? "Active" : "Inactive"}</Badge>
            {c.featured && <Badge tone="pending">Featured</Badge>}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2 whitespace-nowrap">
            <Button variant="secondary" onClick={() => edit(toForm(c))}>
              Edit
            </Button>
            <Button variant="ghost" onClick={() => remove(c)}>
              Delete
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  // Only top-level categories can be parents, and a category that has children cannot become a child.
  const editing = form?.id != null ? tree?.find((c) => c.id === form.id) : undefined;
  const parentOptions = (tree ?? []).filter((c) => c.id !== form?.id);
  const canHaveParent = !editing || editing.children.length === 0;

  return (
    <div>
      <PageHeader
        title="Categories & Commission"
        subtitle="The catalogue tree and what the platform earns on each category."
        action={<Button onClick={() => edit(blank)}>New category</Button>}
      />

      <p className="mt-4 rounded-2xl border border-coffee-100 bg-cream-50 px-4 py-3 text-sm text-coffee-600">
        A blank commission inherits from the parent category, and then from the platform default in Settings. The effective rate is what is actually
        charged. Rate changes only affect future orders: existing orders keep the commission they were placed with.
      </p>

      <div className="mt-4">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !tree ? (
          <SkeletonRows />
        ) : tree.length === 0 ? (
          <EmptyState title="No categories yet" hint="Create the first category so sellers can list products." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-coffee-600">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Own commission</th>
                  <th className="px-4 py-3">Effective</th>
                  <th className="px-4 py-3">Tax</th>
                  <th className="px-4 py-3">Attribute group</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {tree.map((parent) => (
                  <Fragment key={parent.id}>
                    {row(parent, false)}
                    {parent.children.map((child) => row(child, true))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <Modal title={form.id ? "Edit category" : "New category"} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Parent category">
                <Select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} disabled={!canHaveParent}>
                  <option value="">None (top level)</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Attribute group">
                <Select value={form.attributeGroup} onChange={(e) => setForm({ ...form, attributeGroup: e.target.value as AttributeGroup })}>
                  {ATTRIBUTE_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {label(g)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Commission % (blank = inherit)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.commissionRate}
                  onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                  placeholder="Inherits"
                />
              </Field>
              <Field label="Tax (GST) % (blank = inherit)">
                <Input type="number" min={0} max={100} step="0.01" placeholder="Inherits" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
              </Field>
              <Field label="Sort order">
                <Input type="number" step="1" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </Field>
            </div>
            <p className="text-xs text-coffee-500">Listed prices include GST; the tax rate is used to record the tax component of each order.</p>
            <p className="text-xs text-coffee-500">The attribute group decides which product specification fields sellers fill in for this category.</p>
            <div>
              <span className="mb-1 block text-xs font-semibold text-coffee-600">Image</span>
              <ImageUploader value={form.imageUrl ? [form.imageUrl] : []} onChange={(urls) => setForm({ ...form, imageUrl: urls[0] ?? "" })} max={1} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-coffee-800">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Active (visible to buyers and sellers)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                Featured on the homepage
              </label>
            </div>
            <ErrorNote>{formError}</ErrorNote>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !form.name.trim()}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
