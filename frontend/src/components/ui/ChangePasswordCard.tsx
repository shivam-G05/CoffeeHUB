import { useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import Button from "./Button";
import { Card, ErrorNote } from "./Common";
import { Field, Input } from "./Input";

export default function ChangePasswordCard() {
  const { showToast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setError("The new passwords do not match");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/users/me/password", { currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      showToast("Password changed");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not change password"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-coffee-900">Change password</h2>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Current password">
          <Input type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password (min 8 characters)">
          <Input type="password" required minLength={8} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <div className="sm:col-span-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
        <div className="sm:col-span-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Change password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
