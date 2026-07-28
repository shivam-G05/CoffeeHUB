import { useState, type FormEvent } from "react";
import { Copy, Gift, Sparkles } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api.put("/api/users/me", { name, phone });
      await refreshUser();
      setMessage("Profile updated.");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not update profile"));
    } finally {
      setSaving(false);
    }
  }

  function copyReferral() {
    if (!user) return;
    const link = `${window.location.origin}/register?ref=${user.referralCode}`;
    navigator.clipboard.writeText(link);
    showToast("Referral link copied to clipboard!");
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">Profile Settings</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Mobile number">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={user?.email ?? ""} disabled className="opacity-60" />
          </Field>
          <Field label="Role">
            <Input value={user?.role ?? ""} disabled className="opacity-60" />
          </Field>

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </div>

      {user?.role === "CUSTOMER" && (
        <div className="rounded-2xl border border-coffee-100 bg-cream-50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-coffee-800">
            <Sparkles size={16} className="text-amber-accent" /> Loyalty points
          </p>
          <p className="mt-1 text-2xl font-bold text-coffee-900">{user.loyaltyPoints} pts</p>
          <p className="mt-1 text-xs text-coffee-400">Earn 1 point per ₹100 spent on every order.</p>

          <div className="mt-5 border-t border-coffee-100 pt-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-coffee-800">
              <Gift size={16} className="text-amber-accent" /> Refer a friend
            </p>
            <p className="mt-1 text-xs text-coffee-400">
              You both get 50 bonus points when they sign up with your code.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-coffee-200 bg-cream-100 px-3 py-2 text-sm font-semibold tracking-wide text-coffee-800">
                {user.referralCode}
              </code>
              <button
                onClick={copyReferral}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-coffee-800 text-cream-50 hover:bg-coffee-700"
                aria-label="Copy referral link"
              >
                <Copy size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
