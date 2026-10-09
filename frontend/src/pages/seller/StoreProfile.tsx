import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { INDIAN_STATES, VENDOR_TYPES } from "../../lib/constants";
import type { VendorProfile } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Card, ErrorNote, ImageUploader, PageHeader, SkeletonRows } from "../../components/ui/Common";
import { Field, Input, Select, Textarea } from "../../components/ui/Input";

const EMPTY = {
  businessName: "",
  contactPerson: "",
  email: "",
  phone: "",
  vendorType: "",
  website: "",
  addressLine: "",
  city: "",
  state: "",
  pin: "",
  gstNumber: "",
  panNumber: "",
  about: "",
  logoUrl: "",
};

type Form = typeof EMPTY;

function toForm(v: VendorProfile): Form {
  return {
    businessName: v.businessName,
    contactPerson: v.contactPerson ?? "",
    email: v.email ?? "",
    phone: v.phone ?? "",
    vendorType: v.vendorType ?? "",
    website: v.website ?? "",
    addressLine: v.addressLine ?? "",
    city: v.city ?? "",
    state: v.state ?? "",
    pin: v.pin ?? "",
    gstNumber: v.gstNumber ?? "",
    panNumber: v.panNumber ?? "",
    about: v.about ?? "",
    logoUrl: v.logoUrl ?? "",
  };
}

export default function SellerStoreProfile() {
  const { showToast } = useToast();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<VendorProfile>("/api/vendor/me")
      .then((res) => {
        setVendor(res.data);
        setForm(toForm(res.data));
      })
      .catch((err) => setLoadError(apiErrorMessage(err, "Could not load your store profile")));
  }, []);

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const optional = (value: string) => value.trim() || undefined;
    try {
      const res = await api.put<VendorProfile>("/api/vendor/me", {
        businessName: form.businessName.trim(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        vendorType: form.vendorType,
        website: optional(form.website),
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        state: form.state,
        pin: form.pin.trim(),
        gstNumber: optional(form.gstNumber),
        panNumber: optional(form.panNumber),
        about: optional(form.about),
        logoUrl: form.logoUrl || undefined,
      });
      setVendor(res.data);
      setForm(toForm(res.data));
      showToast("Store profile saved", "success");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save your store profile"));
    } finally {
      setSaving(false);
    }
  }

  if (loadError || !vendor) {
    return (
      <div>
        <PageHeader title="Store Profile" />
        <div className="mt-6">{loadError ? <ErrorNote>{loadError}</ErrorNote> : <SkeletonRows />}</div>
      </div>
    );
  }

  const storefrontPath = `/suppliers/${vendor.slug}`;
  // A state saved before the dropdown existed must stay selectable.
  const states = form.state && !INDIAN_STATES.includes(form.state) ? [form.state, ...INDIAN_STATES] : INDIAN_STATES;

  return (
    <div>
      <PageHeader title="Store Profile" subtitle="Your business details and what buyers see on your storefront." />

      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-coffee-900">Public storefront</h2>
          <Badge>{vendor.status}</Badge>
        </div>
        <p className="mt-2 break-all text-sm text-coffee-700">
          {vendor.status === "APPROVED" ? (
            <Link to={storefrontPath} className="font-semibold underline">
              {window.location.origin}
              {storefrontPath}
            </Link>
          ) : (
            <span>
              {window.location.origin}
              {storefrontPath}
            </span>
          )}
        </p>
        {vendor.status !== "APPROVED" && (
          <p className="mt-1 text-xs text-coffee-500">Your storefront becomes visible to buyers once your business is approved.</p>
        )}
      </Card>

      <form onSubmit={save} className="mt-6 space-y-6">
        <Card>
          <h2 className="font-bold text-coffee-900">Business</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Business name *">
              <Input required maxLength={255} value={form.businessName} onChange={set("businessName")} />
            </Field>
            <Field label="Business type *">
              <Select required value={form.vendorType} onChange={set("vendorType")}>
                <option value="">Select a type</option>
                {VENDOR_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Contact person *">
              <Input required maxLength={255} value={form.contactPerson} onChange={set("contactPerson")} />
            </Field>
            <Field label="Business email *">
              <Input required type="email" maxLength={255} value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Phone *">
              <Input required type="tel" maxLength={30} value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label="Website">
              <Input maxLength={255} value={form.website} onChange={set("website")} placeholder="https://" />
            </Field>
            <Field label="GST number">
              <Input maxLength={20} value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="PAN number">
              <Input maxLength={20} value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })} />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-coffee-900">Business address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Address *">
                <Input required maxLength={500} value={form.addressLine} onChange={set("addressLine")} />
              </Field>
            </div>
            <Field label="City *">
              <Input required maxLength={100} value={form.city} onChange={set("city")} />
            </Field>
            <Field label="State *">
              <Select required value={form.state} onChange={set("state")}>
                <option value="">Select a state</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="PIN code *">
              <Input
                required
                inputMode="numeric"
                pattern="\d{6}"
                title="6-digit PIN code"
                maxLength={6}
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="font-bold text-coffee-900">Storefront</h2>
          <div className="mt-4 space-y-4">
            <div>
              <span className="mb-1 block text-xs font-semibold text-coffee-600">Logo</span>
              <ImageUploader value={form.logoUrl ? [form.logoUrl] : []} onChange={(urls) => setForm({ ...form, logoUrl: urls[0] ?? "" })} max={1} />
            </div>
            <Field label="About your business">
              <Textarea
                rows={6}
                maxLength={3000}
                value={form.about}
                onChange={set("about")}
                placeholder="What you produce or supply, where you source from, capacity, certifications…"
              />
            </Field>
          </div>
        </Card>

        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
