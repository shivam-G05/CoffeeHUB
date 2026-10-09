import { useState, type FormEvent } from "react";
import { BadgeCheck, Copy, Gift, Sparkles } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/ui/Button";
import ChangePasswordCard from "../../components/ui/ChangePasswordCard";
import { Card, ErrorNote, PageHeader } from "../../components/ui/Common";
import { Field, Input } from "../../components/ui/Input";

/** Account details, shared by the buyer and seller dashboards. The B2B fields are buyer-only. */
export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const isCustomer = user?.role === "CUSTOMER";
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [companyName, setCompanyName] = useState(user?.companyName ?? "");
  const [gstNumber, setGstNumber] = useState(user?.gstNumber ?? "");
  const [businessType, setBusinessType] = useState(user?.businessType ?? "");
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.put("/api/users/me", {
        name: name.trim(),
        phone: phone.trim(),
        ...(isCustomer ? { companyName, gstNumber: gstNumber.trim().toUpperCase(), businessType } : {}),
      });
      await refreshUser();
      showToast("Profile updated", "success");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not update profile"));
    } finally {
      setSaving(false);
    }
  }

  async function resendVerification() {
    setResending(true);
    try {
      await api.post("/api/auth/resend-verification");
      showToast("Verification email sent. Check your inbox.", "success");
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not send the verification email"), "error");
    } finally {
      setResending(false);
    }
  }

  async function copyReferral() {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/register?ref=${user.referralCode}`);
      showToast("Referral link copied to clipboard", "success");
    } catch {
      showToast("Could not copy the link", "error");
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Profile Settings" />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
            </Field>
            <Field label="Mobile number">
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
            </Field>
          </div>

          <div>
            <Field label="Email">
              <Input value={user.email} readOnly disabled className="opacity-60" />
            </Field>
            {user.emailVerified ? (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-green-700">
                <BadgeCheck size={13} /> Verified
              </p>
            ) : (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-amber-700">
                Not verified yet.
                <button type="button" onClick={resendVerification} disabled={resending} className="font-semibold underline disabled:opacity-50">
                  {resending ? "Sending…" : "Resend verification email"}
                </button>
              </p>
            )}
          </div>

          {isCustomer && (
            <div className="border-t border-coffee-100 pt-4">
              <p className="text-sm font-semibold text-coffee-800">Business details</p>
              <p className="text-xs text-coffee-400">Optional. Used on your invoices and requirements when you buy for a business.</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Company name">
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={255} />
                </Field>
                <Field label="Business type">
                  <Input
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    maxLength={100}
                    placeholder="Café, roastery, office, retailer…"
                  />
                </Field>
                <Field label="GST number">
                  <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} maxLength={20} />
                </Field>
              </div>
            </div>
          )}

          <ErrorNote>{error}</ErrorNote>

          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>

      {isCustomer && (
        <Card>
          <p className="flex items-center gap-2 text-sm font-semibold text-coffee-800">
            <Sparkles size={16} className="text-amber-accent" /> Loyalty points
          </p>
          <p className="mt-1 text-2xl font-bold text-coffee-900">{user.loyaltyPoints} pts</p>
          <p className="mt-1 text-xs text-coffee-400">Earn 1 point per ₹100 spent on every order.</p>

          <div className="mt-5 border-t border-coffee-100 pt-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-coffee-800">
              <Gift size={16} className="text-amber-accent" /> Refer a friend
            </p>
            <p className="mt-1 text-xs text-coffee-400">You both get 50 bonus points when they sign up with your code.</p>
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-coffee-200 bg-cream-100 px-3 py-2 text-sm font-semibold tracking-wide text-coffee-800">
                {user.referralCode}
              </code>
              <button
                onClick={copyReferral}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coffee-800 text-cream-50 hover:bg-coffee-700"
                aria-label="Copy referral link"
              >
                <Copy size={15} />
              </button>
            </div>
          </div>
        </Card>
      )}
      <div className="mt-6">
        <ChangePasswordCard />
      </div>
    </div>
  );
}
