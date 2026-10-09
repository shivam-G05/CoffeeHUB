import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { track } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import { useSeo } from "../../lib/seo";
import Button from "../../components/ui/Button";
import { ErrorNote } from "../../components/ui/Common";
import { Field, Input, Select } from "../../components/ui/Input";

const BUSINESS_TYPES = ["Café / Restaurant", "Hotel / Hospitality", "Office / Corporate", "Retailer", "Roaster", "Distributor", "Exporter", "Other"];

export default function Register() {
  const { registerBuyer } = useAuth();
  const brand = useBrand();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = (location.state as { from?: string } | null)?.from;

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    companyName: "",
    gstNumber: "",
    businessType: "",
    referralCode: (params.get("ref") ?? "").toUpperCase(),
  });
  const [businessOpen, setBusinessOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useSeo({ title: "Create a buyer account", description: `Register to buy coffee, equipment and supplies on ${brand.name}.` }, brand.name);

  useEffect(() => {
    track("signup_started", "buyer");
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerBuyer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        companyName: form.companyName.trim() || undefined,
        gstNumber: form.gstNumber.trim() || undefined,
        businessType: form.businessType || undefined,
        referralCode: form.referralCode.trim() || undefined,
      });
      navigate(from ?? "/customer", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-coffee-900">Create a buyer account</h1>
      <p className="mt-1 text-sm text-coffee-500">Buy from verified suppliers and post bulk requirements on {brand.name}.</p>

      <p className="mt-4 rounded-lg bg-coffee-100/60 px-3 py-2 text-sm text-coffee-700">
        Want to sell instead?{" "}
        <Link to="/register/seller" className="font-semibold text-coffee-900 underline">
          Register as a seller
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Full name">
          <Input required maxLength={255} autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Mobile number">
          <Input
            type="tel"
            required
            minLength={10}
            maxLength={30}
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="9876543210"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            required
            maxLength={255}
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
          />
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

        <div className="rounded-2xl border border-coffee-100">
          <button
            type="button"
            onClick={() => setBusinessOpen((o) => !o)}
            aria-expanded={businessOpen}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-coffee-800"
          >
            Buying for a business? <span className="font-normal text-coffee-400">(optional)</span>
            <ChevronDown size={16} className={`ml-auto shrink-0 transition ${businessOpen ? "rotate-180" : ""}`} />
          </button>
          {businessOpen && (
            <div className="space-y-4 border-t border-coffee-100 px-4 py-4">
              <Field label="Company name">
                <Input maxLength={255} autoComplete="organization" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
              </Field>
              <Field label="GST number">
                <Input maxLength={20} value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value.toUpperCase())} placeholder="15-character GSTIN" />
              </Field>
              <Field label="Business type">
                <Select value={form.businessType} onChange={(e) => set("businessType", e.target.value)}>
                  <option value="">Select…</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
        </div>

        <Field label="Referral code (optional)">
          <Input maxLength={20} value={form.referralCode} onChange={(e) => set("referralCode", e.target.value.toUpperCase())} />
        </Field>

        <ErrorNote>{error}</ErrorNote>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-xs text-coffee-400">
          By registering you agree to the{" "}
          <Link to="/policies/terms-conditions" className="underline">
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link to="/policies/privacy-policy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-coffee-500">
        Already have an account?{" "}
        <Link to="/login" state={from ? { from } : undefined} className="font-semibold text-coffee-800 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
