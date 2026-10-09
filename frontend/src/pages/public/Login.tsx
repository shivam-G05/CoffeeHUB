import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import { useSeo } from "../../lib/seo";
import { dashboardHome } from "../../routes/roleHome";
import Button from "../../components/ui/Button";
import { ErrorNote } from "../../components/ui/Common";
import { Field, Input } from "../../components/ui/Input";

export default function Login() {
  const { login } = useAuth();
  const brand = useBrand();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const from = (location.state as { from?: string } | null)?.from;

  useSeo({ title: "Log in" }, brand.name);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(identifier.trim(), password);
      navigate(from ?? dashboardHome(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-coffee-900">Welcome back</h1>
      <p className="mt-1 text-sm text-coffee-500">Log in to your {brand.name} buyer or seller account.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field label="Email or mobile number">
          <Input
            required
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com or 9876543210"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-coffee-600 hover:underline">
            Forgot password?
          </Link>
        </div>

        <ErrorNote>{error}</ErrorNote>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm text-coffee-500">
        <p>
          New buyer?{" "}
          <Link to="/register" state={from ? { from } : undefined} className="font-semibold text-coffee-800 hover:underline">
            Create a buyer account
          </Link>
        </p>
        <p>
          Want to sell?{" "}
          <Link to="/register/seller" className="font-semibold text-coffee-800 hover:underline">
            Register as a seller
          </Link>
        </p>
      </div>
    </div>
  );
}
