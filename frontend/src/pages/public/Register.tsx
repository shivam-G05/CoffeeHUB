import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { dashboardHome } from "../../routes/roleHome";
import Button from "../../components/ui/Button";
import { Field, Input, Select } from "../../components/ui/Input";
import type { Role } from "../../types";

const roleOptions: { value: Role; label: string }[] = [
  { value: "CUSTOMER", label: "Customer — I want to buy & discover" },
  { value: "SELLER", label: "Seller — I sell machines / beans / accessories" },
  { value: "CAFE_OWNER", label: "Café Owner — I run a café" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetRole = params.get("role");
  const referralCode = params.get("ref") ?? "";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: (roleOptions.some((r) => r.value === presetRole) ? presetRole : "CUSTOMER") as Role,
    referralCode,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await register(form);
      navigate(dashboardHome(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold text-coffee-900">Create your account</h1>
      <p className="mt-1 text-sm text-coffee-500">Join CoffeeHub India in under a minute.</p>

      {referralCode && (
        <p className="mt-4 rounded-lg bg-amber-accent/15 px-4 py-2 text-sm font-medium text-coffee-800">
          🎉 You were invited with code <strong>{referralCode}</strong> — you'll both get 50 bonus points!
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field label="I am a...">
          <Select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
          >
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Full name">
          <Input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Priya Sharma"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Mobile number">
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="98765 43210"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="At least 6 characters"
          />
        </Field>

        <Field label="Referral code (optional)">
          <Input
            value={form.referralCode}
            onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })}
            placeholder="e.g. CHM887LZ"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-coffee-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-coffee-800 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
