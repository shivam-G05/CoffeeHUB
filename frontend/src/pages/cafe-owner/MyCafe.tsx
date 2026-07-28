import { useEffect, useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "../../api/client";
import type { Cafe } from "../../types";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { Field, Input, Textarea } from "../../components/ui/Input";

interface FormState {
  name: string;
  description: string;
  address: string;
  city: string;
  imageUrl: string;
}

const emptyForm: FormState = { name: "", description: "", address: "", city: "", imageUrl: "" };

export default function MyCafe() {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api
      .get<Cafe[]>("/api/cafes/mine")
      .then((res) => setCafes(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function startEdit(c: Cafe) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      description: c.description ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      imageUrl: c.imageUrl ?? "",
    });
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.put(`/api/cafes/${editingId}`, form);
      } else {
        await api.post("/api/cafes", form);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save café"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-coffee-900">My Café</h1>
        <Button onClick={startCreate}>+ List a café</Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 grid gap-4 rounded-2xl border border-coffee-100 bg-cream-50 p-6 sm:grid-cols-2"
        >
          <Field label="Café name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="City">
            <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Image URL (optional)">
              <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
            </Field>
          </div>

          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save café"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-coffee-400 sm:col-span-2">
            New or edited café listings need admin approval before they appear publicly.
          </p>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-coffee-400">Loading…</p>
      ) : cafes.length === 0 ? (
        <p className="mt-8 text-coffee-400">No cafés listed yet.</p>
      ) : (
        <div className="mt-8 space-y-3">
          {cafes.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-coffee-100 bg-cream-50 px-4 py-3">
              <div>
                <p className="font-semibold text-coffee-900">{c.name}</p>
                <p className="text-xs text-coffee-400">{c.city} · {c.address}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={c.approved ? "approved" : "pending"}>{c.approved ? "Approved" : "Pending"}</Badge>
                <button onClick={() => startEdit(c)} className="text-sm text-coffee-700 hover:underline">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
