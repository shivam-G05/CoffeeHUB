import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { VENDOR_TYPES } from "../../lib/constants";
import { formatDate, label, place } from "../../lib/format";
import type { Page, VendorProfile, VendorStatus } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";
import { Input } from "../../components/ui/Input";

const TABS: (VendorStatus | "")[] = ["PENDING_VERIFICATION", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED", "DRAFT", ""];

export default function AdminVendors() {
  const [status, setStatus] = useState<VendorStatus | "">("PENDING_VERIFICATION");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [pageNo, setPageNo] = useState(0);
  const [vendors, setVendors] = useState<Page<VendorProfile> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<Page<VendorProfile>>("/api/admin/vendors", { params: { status: status || undefined, q: q || undefined, page: pageNo } })
      .then((res) => setVendors(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load vendors")));
  }, [status, q, pageNo]);

  useEffect(load, [load]);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    setQ(search.trim());
    setPageNo(0);
  }

  return (
    <div>
      <PageHeader title="Vendor Verification" subtitle="Review business details and documents before a vendor is allowed to sell." />

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t || "ALL"}
            onClick={() => {
              setStatus(t);
              setPageNo(0);
              setVendors(null);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
              status === t ? "bg-coffee-800 text-cream-50" : "bg-coffee-100 text-coffee-700 hover:bg-coffee-200"
            }`}
          >
            {t ? label(t) : "All"}
          </button>
        ))}
      </div>

      <form onSubmit={submitSearch} className="mt-3 flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors…" aria-label="Search vendors" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="mt-4">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !vendors ? (
          <SkeletonRows />
        ) : vendors.content.length === 0 ? (
          <EmptyState
            title="No vendors here"
            hint={status === "PENDING_VERIFICATION" ? "The verification queue is clear." : "Try a different status or search."}
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-coffee-600">
                <tr>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {vendors.content.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3">
                      <Link to={`/admin/vendors/${v.id}`} className="font-medium text-coffee-900 hover:underline">
                        {v.businessName}
                      </Link>
                      {v.featured && <p className="text-xs text-amber-700">Featured</p>}
                    </td>
                    <td className="px-4 py-3 text-coffee-500">{VENDOR_TYPES.find((t) => t.value === v.vendorType)?.label ?? "—"}</td>
                    <td className="px-4 py-3 text-coffee-500">{place(v.city, v.state) || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-500">{formatDate(v.submittedAt)}</td>
                    <td className="px-4 py-3">
                      <Badge>{v.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-coffee-500">{v.documents.length}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/vendors/${v.id}`} className="whitespace-nowrap font-semibold text-coffee-700 hover:underline">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={vendors} onChange={setPageNo} />
      </div>
    </div>
  );
}
