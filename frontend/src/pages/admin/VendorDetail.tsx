import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, apiErrorMessage, openProtected } from "../../api/client";
import { useBrand } from "../../context/BrandContext";
import { useToast } from "../../context/ToastContext";
import { DOCUMENT_TYPES, VENDOR_TYPES } from "../../lib/constants";
import { formatDate, formatDateTime, label } from "../../lib/format";
import type { BankStatus, DocumentStatus, VendorProfile, VendorStatus } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Card, ErrorNote, Img, Modal, PageHeader, SkeletonRows } from "../../components/ui/Common";
import { Field, Input, Textarea } from "../../components/ui/Input";

type Decision = "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";

// What an admin may do from each status. A DRAFT vendor has not submitted, so there is nothing to decide.
const TRANSITIONS: Record<VendorStatus, Decision[]> = {
  DRAFT: [],
  PENDING_VERIFICATION: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["SUSPENDED"],
  REJECTED: ["UNDER_REVIEW", "APPROVED"],
  SUSPENDED: ["APPROVED"],
};

function decisionLabel(target: Decision, current: VendorStatus): string {
  if (target === "UNDER_REVIEW") return "Mark under review";
  if (target === "APPROVED") return current === "SUSPENDED" ? "Reinstate" : "Approve";
  return target === "REJECTED" ? "Reject" : "Suspend";
}

export default function AdminVendorDetail() {
  const { id } = useParams();
  const { name: brand } = useBrand();
  const { showToast } = useToast();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);

  useEffect(() => {
    setVendor(null);
    setError(null);
    api
      .get<VendorProfile>(`/api/admin/vendors/${id}`)
      .then((res) => setVendor(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Vendor not found")));
  }, [id]);

  // Every admin vendor action returns the refreshed profile.
  async function run(request: () => Promise<{ data: VendorProfile }>, done: string): Promise<boolean> {
    setBusy(true);
    try {
      setVendor((await request()).data);
      showToast(done, "success");
      return true;
    } catch (err) {
      const message = apiErrorMessage(err, "Could not complete the action");
      if (decision) setDecisionError(message);
      else showToast(message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function reviewDocument(documentId: number, status: DocumentStatus) {
    run(
      () => api.put<VendorProfile>(`/api/admin/vendors/${id}/documents/${documentId}`, { status, note: notes[documentId]?.trim() || undefined }),
      `Document ${status.toLowerCase()}`,
    );
  }

  function reviewBank(status: BankStatus) {
    run(() => api.put<VendorProfile>(`/api/admin/vendors/${id}/bank`, { status }), `Bank details ${status.toLowerCase()}`);
  }

  function toggleFeatured() {
    if (!vendor) return;
    run(
      () => api.put<VendorProfile>(`/api/admin/vendors/${id}/featured`, null, { params: { featured: !vendor.featured } }),
      vendor.featured ? "Removed from featured" : "Marked as featured",
    );
  }

  function openDecision(target: Decision) {
    setReason("");
    setDecisionError(null);
    setDecision(target);
  }

  async function submitDecision(e: FormEvent) {
    e.preventDefault();
    if (!decision) return;
    setDecisionError(null);
    const ok = await run(
      () => api.put<VendorProfile>(`/api/admin/vendors/${id}/status`, { status: decision, reason: reason.trim() || undefined }),
      `Vendor moved to ${label(decision).toLowerCase()}`,
    );
    if (ok) setDecision(null);
  }

  async function viewDocument(fileId: string) {
    try {
      await openProtected(`/api/files/${fileId}`);
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not open the document"), "error");
    }
  }

  const back = (
    <Link to="/admin/vendors" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-coffee-500 hover:text-coffee-800">
      <ArrowLeft size={14} /> All vendors
    </Link>
  );

  if (!vendor) {
    return (
      <div>
        {back}
        {error ? <ErrorNote>{error}</ErrorNote> : <SkeletonRows />}
      </div>
    );
  }

  const needsReason = decision === "REJECTED" || decision === "SUSPENDED";
  const transitions = TRANSITIONS[vendor.status];
  const address = [vendor.addressLine, vendor.city, vendor.state, vendor.pin].filter(Boolean).join(", ");

  return (
    <div>
      {back}
      <PageHeader
        title={vendor.businessName}
        subtitle={VENDOR_TYPES.find((t) => t.value === vendor.vendorType)?.label ?? "Business type not set"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{vendor.status}</Badge>
            <Button variant="secondary" disabled={busy} onClick={toggleFeatured}>
              {vendor.featured ? "Remove from featured" : "Mark as featured"}
            </Button>
          </div>
        }
      />

      {vendor.statusReason && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Reason on record: <span className="whitespace-pre-wrap">{vendor.statusReason}</span>
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-4">
          <Card>
            <h2 className="text-lg font-semibold text-coffee-900">Business profile</h2>
            <div className="mt-4 flex items-start gap-4">
              <Img src={vendor.logoUrl} alt={`${vendor.businessName} logo`} className="h-16 w-16 shrink-0 rounded-xl" />
              <dl className="grid min-w-0 flex-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                <Fact term="Contact person">{vendor.contactPerson}</Fact>
                <Fact term="Email">{vendor.email}</Fact>
                <Fact term="Phone">{vendor.phone}</Fact>
                <Fact term="Website">
                  {vendor.website && /^https?:\/\//i.test(vendor.website) ? (
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="underline">
                      {vendor.website}
                    </a>
                  ) : (
                    vendor.website
                  )}
                </Fact>
                <Fact term="GST number">{vendor.gstNumber}</Fact>
                <Fact term="PAN">{vendor.panNumber}</Fact>
                <Fact term="Address">{address}</Fact>
                <Fact term="Registered">{formatDate(vendor.createdAt)}</Fact>
                <Fact term="Submitted">{vendor.submittedAt ? formatDateTime(vendor.submittedAt) : "Not submitted"}</Fact>
                <Fact term="Approved">{vendor.approvedAt ? formatDateTime(vendor.approvedAt) : "—"}</Fact>
              </dl>
            </div>
            {vendor.about && (
              <div className="mt-4">
                <p className="text-xs text-coffee-400">About</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-coffee-700">{vendor.about}</p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-coffee-900">Documents</h2>
            {vendor.documents.length === 0 ? (
              <p className="mt-3 text-sm text-coffee-500">No documents uploaded yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-coffee-100">
                {vendor.documents.map((doc) => (
                  <li key={doc.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-coffee-900">
                          {DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label ?? label(doc.type)}
                          {doc.label ? ` (${doc.label})` : ""}
                        </p>
                        <p className="break-all text-xs text-coffee-500">
                          {doc.fileName} · uploaded {formatDate(doc.uploadedAt)}
                        </p>
                        {doc.reviewNote && <p className="mt-1 text-xs text-coffee-600">Note: {doc.reviewNote}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{doc.status}</Badge>
                        <Button variant="secondary" onClick={() => viewDocument(doc.fileId)}>
                          View
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="min-w-0 flex-1 basis-48">
                        <Input
                          value={notes[doc.id] ?? ""}
                          onChange={(e) => setNotes((n) => ({ ...n, [doc.id]: e.target.value }))}
                          placeholder="Optional note for the vendor"
                          maxLength={255}
                          aria-label="Review note"
                        />
                      </div>
                      <Button disabled={busy || doc.status === "APPROVED"} onClick={() => reviewDocument(doc.id, "APPROVED")}>
                        Approve
                      </Button>
                      <Button variant="danger" disabled={busy || doc.status === "REJECTED"} onClick={() => reviewDocument(doc.id, "REJECTED")}>
                        Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-coffee-900">Bank details</h2>
              {vendor.bank && <Badge>{vendor.bank.status}</Badge>}
            </div>
            {!vendor.bank ? (
              <p className="mt-3 text-sm text-coffee-500">The vendor has not added bank details. Payouts stay on hold until they are added and verified.</p>
            ) : (
              <>
                <dl className="mt-4 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                  <Fact term="Account holder">{vendor.bank.accountHolder}</Fact>
                  <Fact term="Account number">{vendor.bank.accountNumber}</Fact>
                  <Fact term="IFSC">{vendor.bank.ifsc}</Fact>
                  <Fact term="Bank">{vendor.bank.bankName}</Fact>
                  <Fact term="Last updated">{formatDateTime(vendor.bank.updatedAt)}</Fact>
                </dl>
                <p className="mt-3 text-xs text-coffee-500">Check these against the bank proof document. Payouts are only possible once verified.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button disabled={busy || vendor.bank.status === "VERIFIED"} onClick={() => reviewBank("VERIFIED")}>
                    Verify
                  </Button>
                  <Button variant="danger" disabled={busy || vendor.bank.status === "REJECTED"} onClick={() => reviewBank("REJECTED")}>
                    Reject
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold text-coffee-900">Decision</h2>
            {vendor.missingRequirements.length > 0 && (
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="font-semibold">Still missing</p>
                <ul className="mt-1 list-disc pl-5">
                  {vendor.missingRequirements.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            {transitions.length === 0 ? (
              <p className="mt-3 text-sm text-coffee-500">This vendor has not submitted their application yet, so there is nothing to decide.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                {transitions.map((t) => (
                  <Button
                    key={t}
                    variant={t === "APPROVED" ? "primary" : t === "UNDER_REVIEW" ? "secondary" : "danger"}
                    disabled={busy}
                    onClick={() => openDecision(t)}
                  >
                    {decisionLabel(t, vendor.status)}
                  </Button>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-coffee-400">Every decision notifies the vendor and is recorded in the audit log.</p>
          </Card>
        </div>
      </div>

      {decision && (
        <Modal title={`${decisionLabel(decision, vendor.status)}: ${vendor.businessName}`} onClose={() => setDecision(null)}>
          <form onSubmit={submitDecision} className="space-y-4">
            {decision === "APPROVED" && (
              <div className="space-y-2 text-sm text-coffee-700">
                <p>
                  Approving gives this vendor the <strong>&ldquo;{brand} Verified&rdquo;</strong> badge on their storefront and listings, and lets them sell:
                  they can submit products for approval and receive orders and RFQs.
                </p>
                {vendor.missingRequirements.length > 0 && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">Still missing: {vendor.missingRequirements.join(", ")}.</p>
                )}
                {vendor.documents.some((d) => d.status !== "APPROVED") && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">Some documents have not been approved yet.</p>
                )}
              </div>
            )}
            {decision === "UNDER_REVIEW" && <p className="text-sm text-coffee-700">The vendor is told their application is being reviewed.</p>}
            {decision === "REJECTED" && (
              <p className="text-sm text-coffee-700">The vendor is told why and can update their details and resubmit.</p>
            )}
            {decision === "SUSPENDED" && (
              <p className="text-sm text-coffee-700">The vendor loses the verified badge and can no longer sell until reinstated.</p>
            )}
            {needsReason && (
              <Field label="Reason (shown to the vendor)">
                <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} required />
              </Field>
            )}
            <ErrorNote>{decisionError}</ErrorNote>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDecision(null)}>
                Cancel
              </Button>
              <Button type="submit" variant={needsReason ? "danger" : "primary"} disabled={busy || (needsReason && !reason.trim())}>
                {busy ? "Saving…" : decisionLabel(decision, vendor.status)}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-coffee-400">{term}</dt>
      <dd className="break-words font-medium text-coffee-900">{children || "—"}</dd>
    </div>
  );
}
