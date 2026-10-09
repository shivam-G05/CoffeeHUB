import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { INDIAN_STATES } from "../../lib/constants";
import type { Address } from "../../types";
import Button from "../../components/ui/Button";
import { Card, EmptyState, ErrorNote, Modal, PageHeader, SkeletonRows } from "../../components/ui/Common";
import { Field, Input, Select } from "../../components/ui/Input";

type Form = Omit<Address, "id">;

export default function CustomerAddresses() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // editingId: undefined = modal closed, null = new address
  const [editingId, setEditingId] = useState<number | null | undefined>(undefined);
  const [form, setForm] = useState<Form | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Address | null>(null);

  const load = useCallback(() => {
    return api
      .get<Address[]>("/api/addresses")
      .then((res) => {
        setAddresses(res.data);
        setError(null);
      })
      .catch((err) => setError(apiErrorMessage(err, "Could not load your addresses")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openForm(address?: Address) {
    setFormError(null);
    setEditingId(address ? address.id : null);
    setForm(
      address
        ? { ...address, label: address.label ?? "", line2: address.line2 ?? "" }
        : {
            label: "",
            name: user?.name ?? "",
            phone: user?.phone ?? "",
            line1: "",
            line2: "",
            city: "",
            state: "",
            pin: "",
            defaultAddress: addresses?.length === 0,
          },
    );
  }

  function closeForm() {
    if (saving) return;
    setEditingId(undefined);
    setForm(null);
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormError(null);
    const body = {
      label: form.label?.trim() || null,
      name: form.name.trim(),
      phone: form.phone.trim(),
      line1: form.line1.trim(),
      line2: form.line2?.trim() || null,
      city: form.city.trim(),
      state: form.state,
      pin: form.pin,
      defaultAddress: form.defaultAddress,
    };
    try {
      if (editingId == null) await api.post("/api/addresses", body);
      else await api.put(`/api/addresses/${editingId}`, body);
      showToast(editingId == null ? "Address added" : "Address updated", "success");
      setEditingId(undefined);
      setForm(null);
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err, "Could not save the address"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      await api.delete(`/api/addresses/${deleting.id}`);
      showToast("Address deleted", "info");
      setDeleting(null);
      await load();
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not delete the address"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Addresses"
        subtitle="Saved delivery addresses you can pick at checkout."
        action={addresses && <Button onClick={() => openForm()}>Add address</Button>}
      />

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !addresses ? (
          <SkeletonRows count={2} />
        ) : addresses.length === 0 ? (
          <EmptyState title="No saved addresses" hint="Add one now to check out faster." action={<Button onClick={() => openForm()}>Add address</Button>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((a) => (
              <Card key={a.id} className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 break-words font-semibold text-coffee-900">{a.label || a.name}</p>
                  {a.defaultAddress && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">Default</span>
                  )}
                </div>
                <p className="mt-2 break-words text-sm text-coffee-700">
                  {a.label && (
                    <>
                      {a.name}
                      <br />
                    </>
                  )}
                  {a.line1}
                  {a.line2 && <>, {a.line2}</>}
                  <br />
                  {a.city}, {a.state} {a.pin}
                </p>
                <p className="mt-1 text-sm text-coffee-500">Phone: {a.phone}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button variant="secondary" onClick={() => openForm(a)}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => setDeleting(a)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {form && editingId !== undefined && (
        <Modal title={editingId == null ? "Add address" : "Edit address"} onClose={closeForm}>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact name">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={255} autoComplete="name" />
              </Field>
              <Field label="Phone">
                <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required maxLength={30} autoComplete="tel" />
              </Field>
            </div>
            <Field label="Label (optional)">
              <Input value={form.label ?? ""} onChange={(e) => set("label", e.target.value)} maxLength={50} placeholder="Office, Warehouse, Home…" />
            </Field>
            <Field label="Address line 1">
              <Input value={form.line1} onChange={(e) => set("line1", e.target.value)} required maxLength={255} autoComplete="address-line1" />
            </Field>
            <Field label="Address line 2 (optional)">
              <Input value={form.line2 ?? ""} onChange={(e) => set("line2", e.target.value)} maxLength={255} autoComplete="address-line2" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} required maxLength={100} autoComplete="address-level2" />
              </Field>
              <Field label="State">
                <Select value={form.state} onChange={(e) => set("state", e.target.value)} required>
                  <option value="">Select state</option>
                  {/* keeps an older, non-listed value selectable when editing */}
                  {form.state && !INDIAN_STATES.includes(form.state) && <option value={form.state}>{form.state}</option>}
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="PIN code">
                <Input
                  value={form.pin}
                  onChange={(e) => set("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  inputMode="numeric"
                  pattern="\d{6}"
                  title="6-digit PIN code"
                  autoComplete="postal-code"
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-coffee-700">
              <input
                type="checkbox"
                checked={form.defaultAddress}
                onChange={(e) => set("defaultAddress", e.target.checked)}
                className="h-4 w-4 accent-coffee-700"
              />
              Use as my default address
            </label>

            <ErrorNote>{formError}</ErrorNote>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeForm} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save address"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete this address?" onClose={() => !saving && setDeleting(null)}>
          <p className="break-words text-sm text-coffee-700">
            {deleting.line1}, {deleting.city}, {deleting.state} {deleting.pin}
          </p>
          <p className="mt-2 text-sm text-coffee-500">Orders already placed to this address are not affected.</p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={saving}>
              Keep
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={saving}>
              {saving ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
