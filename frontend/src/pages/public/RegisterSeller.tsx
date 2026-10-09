import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import { INDIAN_STATES, VENDOR_TYPES } from "../../lib/constants";
import { useSeo } from "../../lib/seo";
import type { VendorType } from "../../types";
import Button from "../../components/ui/Button";
import { Card, ErrorNote } from "../../components/ui/Common";
import { Field, Input, Select } from "../../components/ui/Input";

const STEPS = [
  { title: "Register", text: "Create your seller account with your business details." },
  { title: "Upload documents", text: "Add GST, PAN, bank proof and address proof from your dashboard." },
  { title: "Admin verification", text: "Our team reviews your business and documents." },
  { title: "List products", text: "Once approved, your listings and storefront go live." },
];

export default function RegisterSeller() {
  const { registerSeller } = useAuth();
  const brand = useBrand();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    businessName: "",
    contactPerson: "",
    email: "",
    phone: "",
    password: "",
    vendorType: "" as VendorType | "",
    website: "",
    addressLine: "",
    city: "",
    state: "",
    pin: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useSeo(
    {
      title: `Sell on ${brand.name}`,
      description: `Register your coffee business on ${brand.name}, get verified and reach buyers across India.`,
      canonicalPath: "/register/seller",
    },
    brand.name,
  );

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.vendorType) return;
    setError(null);
    setSubmitting(true);
    try {
      await registerSeller({
        businessName: form.businessName.trim(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        vendorType: form.vendorType,
        website: form.website.trim() || undefined,
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        state: form.state,
        pin: form.pin,
      });
      navigate("/seller/verification", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-coffee-900 sm:text-3xl">Sell on {brand.name}</h1>
      <p className="mt-1 max-w-2xl text-sm text-coffee-500">
        For coffee estates, roasters, brands, equipment and packaging suppliers. Registration is free; you can start
        selling only after your business has been verified and approved.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business / brand name">
                <Input required maxLength={255} autoComplete="organization" value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
              </Field>
              <Field label="Contact person">
                <Input required maxLength={255} autoComplete="name" value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" required maxLength={255} autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input type="tel" required minLength={10} maxLength={30} autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="At least 8 characters"
                />
              </Field>
              <Field label="Business type">
                <Select required value={form.vendorType} onChange={(e) => set("vendorType", e.target.value)}>
                  <option value="">Select…</option>
                  {VENDOR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Website (optional)">
              <Input type="url" maxLength={255} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Business address">
              <Input required maxLength={500} autoComplete="street-address" value={form.addressLine} onChange={(e) => set("addressLine", e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City">
                <Input required maxLength={100} value={form.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="State">
                <Select required value={form.state} onChange={(e) => set("state", e.target.value)}>
                  <option value="">Select…</option>
                  {INDIAN_STATES.map((s) => (
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
                  value={form.pin}
                  onChange={(e) => set("pin", e.target.value.replace(/\D/g, ""))}
                />
              </Field>
            </div>

            <ErrorNote>{error}</ErrorNote>

            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Creating account…" : "Register as a seller"}
            </Button>
            <p className="text-xs text-coffee-400">
              By registering you agree to the{" "}
              <Link to="/policies/seller-terms" className="underline">
                Seller Terms
              </Link>
              . Looking to buy?{" "}
              <Link to="/register" className="underline">
                Create a buyer account
              </Link>{" "}
              · Already registered?{" "}
              <Link to="/login" className="underline">
                Log in
              </Link>
            </p>
          </form>
        </Card>

        <aside>
          <Card>
            <h2 className="font-semibold text-coffee-900">How it works</h2>
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
            <p className="mt-5 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-800">
              You cannot publish products or receive orders until an admin approves your business.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
