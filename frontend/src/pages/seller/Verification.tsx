import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { api, apiErrorMessage, openProtected } from "../../api/client";
import { useBrand } from "../../context/BrandContext";
import { useToast } from "../../context/ToastContext";
import { DOCUMENT_TYPES } from "../../lib/constants";
import { formatDate } from "../../lib/format";
import type { DocumentType, UploadedFile, VendorProfile, VendorStatus } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Card, DocumentUploadButton, ErrorNote, PageHeader, SkeletonRows, VerifiedBadge } from "../../components/ui/Common";
import { Field, Input } from "../../components/ui/Input";

const STATUS_TEXT: Record<VendorStatus, string> = {
  DRAFT: "You have not submitted your business for verification yet. Complete the checklist below, then submit.",
  PENDING_VERIFICATION: "Your details are submitted and waiting for an admin to pick them up.",
  UNDER_REVIEW: "An admin is reviewing your documents. We will notify you about the outcome.",
  APPROVED: "Your business is verified. You can submit products, receive orders and quote on RFQs.",
  REJECTED: "Your verification was not approved. Fix the points below and submit again.",
  SUSPENDED: "Your seller account is suspended. Your listings are hidden and you cannot take new orders.",
};

export default function SellerVerification() {
  const { name: brand } = useBrand();
  const { showToast } = useToast();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [busyDoc, setBusyDoc] = useState(false);
  const [certLabel, setCertLabel] = useState("");
  const [bank, setBank] = useState({ accountHolder: "", accountNumber: "", ifsc: "", bankName: "" });
  const [bankError, setBankError] = useState<string | null>(null);
  const [savingBank, setSavingBank] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<VendorProfile>("/api/vendor/me")
      .then((res) => {
        setVendor(res.data);
        const b = res.data.bank;
        // The stored account number comes back masked, so it is never prefilled.
        if (b) setBank({ accountHolder: b.accountHolder, accountNumber: "", ifsc: b.ifsc, bankName: b.bankName ?? "" });
      })
      .catch((err) => setLoadError(apiErrorMessage(err, "Could not load your verification details")));
  }, []);

  async function addDocument(type: DocumentType, file: UploadedFile) {
    setBusyDoc(true);
    setDocError(null);
    try {
      const res = await api.post<VendorProfile>("/api/vendor/me/documents", {
        type,
        label: type === "CERTIFICATION" ? certLabel.trim() : undefined,
        fileId: file.id,
      });
      setVendor(res.data);
      if (type === "CERTIFICATION") setCertLabel("");
      showToast("Document uploaded", "success");
    } catch (err) {
      setDocError(apiErrorMessage(err, "Could not save the document"));
    } finally {
      setBusyDoc(false);
    }
  }

  async function removeDocument(id: number) {
    if (!confirm("Remove this document?")) return;
    setBusyDoc(true);
    setDocError(null);
    try {
      const res = await api.delete<VendorProfile>(`/api/vendor/me/documents/${id}`);
      setVendor(res.data);
    } catch (err) {
      setDocError(apiErrorMessage(err, "Could not remove the document"));
    } finally {
      setBusyDoc(false);
    }
  }

  async function viewDocument(fileId: string) {
    setDocError(null);
    try {
      await openProtected(`/api/files/${fileId}`);
    } catch (err) {
      setDocError(apiErrorMessage(err, "Could not open the document"));
    }
  }

  async function saveBank(e: FormEvent) {
    e.preventDefault();
    setSavingBank(true);
    setBankError(null);
    try {
      const res = await api.put<VendorProfile>("/api/vendor/me/bank", {
        accountHolder: bank.accountHolder.trim(),
        accountNumber: bank.accountNumber.trim(),
        ifsc: bank.ifsc.trim().toUpperCase(),
        bankName: bank.bankName.trim() || undefined,
      });
      setVendor(res.data);
      setBank((b) => ({ ...b, accountNumber: "" }));
      showToast("Bank details saved", "success");
    } catch (err) {
      setBankError(apiErrorMessage(err, "Could not save bank details"));
    } finally {
      setSavingBank(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.post<VendorProfile>("/api/vendor/me/submit");
      setVendor(res.data);
      showToast("Submitted for verification", "success");
    } catch (err) {
      setSubmitError(apiErrorMessage(err, "Could not submit for verification"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError || !vendor) {
    return (
      <div>
        <PageHeader title="Verification & Documents" />
        <div className="mt-6">{loadError ? <ErrorNote>{loadError}</ErrorNote> : <SkeletonRows />}</div>
      </div>
    );
  }

  const missing = vendor.missingRequirements;
  const canSubmit = (vendor.status === "DRAFT" || vendor.status === "REJECTED") && missing.length === 0;

  return (
    <div>
      <PageHeader title="Verification & Documents" subtitle={`${brand} reviews every seller's business documents before they can sell.`} />

      <div className="mt-6 space-y-6">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-coffee-900">Status</h2>
            <Badge>{vendor.status}</Badge>
            {vendor.status === "APPROVED" && <VerifiedBadge />}
          </div>
          <p className="mt-2 text-sm text-coffee-700">{STATUS_TEXT[vendor.status]}</p>
          {vendor.statusReason && (
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <span className="font-semibold">Note from the reviewer: </span>
              {vendor.statusReason}
            </p>
          )}
          {vendor.submittedAt && <p className="mt-2 text-xs text-coffee-400">Last submitted {formatDate(vendor.submittedAt)}</p>}
          <p className="mt-3 rounded-lg bg-coffee-100/60 px-3 py-2 text-xs text-coffee-600">
            Uploading documents does not by itself grant the verified badge. An admin must review and approve your business first.
          </p>
        </Card>

        <Card>
          <h2 className="font-bold text-coffee-900">Checklist</h2>
          {missing.length === 0 ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-green-800">
              <CheckCircle2 size={16} /> Everything required has been provided.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {missing.map((m) => (
                <li key={m} className="flex items-center gap-2 text-sm text-coffee-700">
                  <Circle size={14} className="shrink-0 text-amber-600" />
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-coffee-400">Business type and address are set on the Store Profile page.</p>
        </Card>

        <Card>
          <h2 className="font-bold text-coffee-900">Documents</h2>
          <p className="mt-1 text-xs text-coffee-500">PDF or image. Documents are private: only you and the admin team can open them.</p>
          <div className="mt-3">
            <ErrorNote>{docError}</ErrorNote>
          </div>

          <ul className="mt-3 divide-y divide-coffee-100">
            {DOCUMENT_TYPES.map((type) => {
              const docs = vendor.documents.filter((d) => d.type === type.value);
              const isCert = type.value === "CERTIFICATION";
              return (
                <li key={type.value} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-coffee-900">
                      {type.label}
                      <span className="ml-2 text-xs font-normal text-coffee-400">{type.required ? "Required" : "Optional"}</span>
                    </p>
                    {docs.length === 0 && <span className="text-xs text-coffee-400">Not uploaded</span>}
                  </div>

                  {docs.map((d) => (
                    <div key={d.id} className="mt-2 rounded-lg bg-coffee-100/40 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0 break-all text-sm text-coffee-800">
                          {d.label ? `${d.label} · ` : ""}
                          {d.fileName}
                          <span className="ml-2 text-xs text-coffee-400">{formatDate(d.uploadedAt)}</span>
                        </p>
                        <div className="flex items-center gap-3">
                          <Badge>{d.status}</Badge>
                          <button onClick={() => viewDocument(d.fileId)} className="text-xs font-semibold text-coffee-700 hover:underline">
                            View
                          </button>
                          {d.status !== "APPROVED" && (
                            <button
                              onClick={() => removeDocument(d.id)}
                              disabled={busyDoc}
                              className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                      {d.reviewNote && <p className="mt-1 whitespace-pre-wrap text-xs text-coffee-600">Reviewer note: {d.reviewNote}</p>}
                    </div>
                  ))}

                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    {isCert && (
                      <div className="w-full sm:w-64">
                        <Field label="Certification name">
                          <Input value={certLabel} onChange={(e) => setCertLabel(e.target.value)} maxLength={100} placeholder="e.g. Organic, Fairtrade" />
                        </Field>
                      </div>
                    )}
                    {isCert && !certLabel.trim() ? (
                      <span className="pb-2 text-xs text-coffee-400">Enter the certification name to upload its file.</span>
                    ) : (
                      <DocumentUploadButton onUploaded={(file) => addDocument(type.value, file)}>
                        {docs.length > 0 && !isCert ? "Upload a new version" : "Upload"}
                      </DocumentUploadButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-coffee-900">Bank details for payouts</h2>
            {vendor.bank && <Badge>{vendor.bank.status}</Badge>}
          </div>
          {vendor.bank && (
            <p className="mt-2 text-sm text-coffee-700">
              Current account: {vendor.bank.accountHolder} · {vendor.bank.accountNumber} · {vendor.bank.ifsc}
              {vendor.bank.bankName ? ` · ${vendor.bank.bankName}` : ""}
            </p>
          )}
          {vendor.bank && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Changing your bank details puts payouts on hold until the new account is verified by an admin.
            </p>
          )}

          <form onSubmit={saveBank} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Account holder name *">
              <Input required maxLength={255} value={bank.accountHolder} onChange={(e) => setBank({ ...bank, accountHolder: e.target.value })} />
            </Field>
            <Field label="Account number *">
              <Input
                required
                inputMode="numeric"
                pattern="\d{6,20}"
                title="6 to 20 digits"
                autoComplete="off"
                value={bank.accountNumber}
                onChange={(e) => setBank({ ...bank, accountNumber: e.target.value.replace(/\D/g, "") })}
                placeholder={vendor.bank ? "Re-enter the full account number" : ""}
              />
            </Field>
            <Field label="IFSC code *">
              <Input
                required
                maxLength={11}
                pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}"
                title="11 characters, e.g. HDFC0001234"
                value={bank.ifsc}
                onChange={(e) => setBank({ ...bank, ifsc: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Bank name">
              <Input maxLength={255} value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} />
            </Field>
            <div className="space-y-3 sm:col-span-2">
              <ErrorNote>{bankError}</ErrorNote>
              <Button type="submit" disabled={savingBank}>
                {savingBank ? "Saving…" : vendor.bank ? "Update bank details" : "Save bank details"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="font-bold text-coffee-900">Submit for verification</h2>
          <p className="mt-1 text-sm text-coffee-600">
            {vendor.status === "DRAFT" || vendor.status === "REJECTED"
              ? missing.length > 0
                ? "Complete the checklist above to enable submission."
                : "Everything is in place. Submit your business for review."
              : vendor.status === "APPROVED"
                ? "Your business is already verified."
                : vendor.status === "SUSPENDED"
                  ? "A suspended account cannot be resubmitted here. Contact support."
                  : "Already submitted. There is nothing more to do until the review is complete."}
          </p>
          <div className="mt-3 space-y-3">
            <ErrorNote>{submitError}</ErrorNote>
            <Button onClick={submit} disabled={!canSubmit || submitting}>
              {submitting ? "Submitting…" : "Submit for verification"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
