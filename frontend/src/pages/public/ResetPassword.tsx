import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { useBrand } from "../../context/BrandContext";
import { useSeo } from "../../lib/seo";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote } from "../../components/ui/Common";
import { Field, Input } from "../../components/ui/Input";

export default function ResetPassword() {
  const brand = useBrand();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useSeo({ title: "Set a new password" }, brand.name);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("The two passwords don't match");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not reset your password. The link may have expired."));
    } finally {
      setSubmitting(false);
    }
  }

  const requestNew = (
    <Link to="/forgot-password" className="text-sm font-semibold text-coffee-800 underline">
      Request a new link
    </Link>
  );

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      {!token ? (
        <EmptyState title="This reset link is incomplete" hint="Open the link from your email again, or request a new one." action={requestNew} />
      ) : done ? (
        <>
          <h1 className="text-2xl font-bold text-coffee-900">Password updated</h1>
          <p className="mt-4 rounded-lg bg-green-50 px-3 py-3 text-sm text-green-800">Your password has been changed. You can now log in with it.</p>
          <Link to="/login" className="mt-6 inline-flex justify-center rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
            Log in
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-coffee-900">Set a new password</h1>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Field label="New password">
              <Input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </Field>
            <Field label="Confirm new password">
              <Input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
            <ErrorNote>{error}</ErrorNote>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Saving…" : "Update password"}
            </Button>
          </form>
          <p className="mt-6 text-center">{requestNew}</p>
        </>
      )}
    </div>
  );
}
