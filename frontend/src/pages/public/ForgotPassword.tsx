import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { api, apiErrorMessage } from "../../api/client";
import { useBrand } from "../../context/BrandContext";
import { useSeo } from "../../lib/seo";
import Button from "../../components/ui/Button";
import { ErrorNote } from "../../components/ui/Common";
import { Field, Input } from "../../components/ui/Input";

export default function ForgotPassword() {
  const brand = useBrand();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useSeo({ title: "Forgot password" }, brand.name);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err) {
      // Only surface problems with the request itself (bad email format, rate limit, network):
      // whether an account exists is never revealed.
      if (axios.isAxiosError(err) && err.response && err.response.status >= 500) setSent(true);
      else setError(apiErrorMessage(err, "Could not send the reset link. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-coffee-900">Forgot your password?</h1>
      {sent ? (
        <>
          <p className="mt-4 rounded-lg bg-green-50 px-3 py-3 text-sm text-green-800">
            If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.
          </p>
          <Link to="/login" className="mt-6 text-sm font-semibold text-coffee-800 hover:underline">
            Back to log in
          </Link>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-coffee-500">Enter your account email and we&rsquo;ll send you a link to set a new password.</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Field label="Email">
              <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            <ErrorNote>{error}</ErrorNote>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-coffee-500">
            Remembered it?{" "}
            <Link to="/login" className="font-semibold text-coffee-800 hover:underline">
              Log in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
