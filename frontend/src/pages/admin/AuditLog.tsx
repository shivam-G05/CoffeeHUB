import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { formatDateTime, label } from "../../lib/format";
import type { AuditEntry, Page } from "../../types";
import { EmptyState, ErrorNote, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";
import { Select } from "../../components/ui/Input";

const ENTITY_TYPES = [
  "Vendor",
  "Product",
  "Category",
  "VendorOrder",
  "Order",
  "Settlement",
  "Dispute",
  "Review",
  "Rfq",
  "User",
  "PlatformSetting",
  "ContentBlock",
  "Conversation",
];

/** "VendorOrder" -> "Vendor order". */
function entityLabel(type: string): string {
  return label(type.replace(/([a-z])([A-Z])/g, "$1_$2"));
}

export default function AdminAuditLog() {
  const [entityType, setEntityType] = useState("");
  const [pageNo, setPageNo] = useState(0);
  const [entries, setEntries] = useState<Page<AuditEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api
      .get<Page<AuditEntry>>("/api/admin/audit-logs", { params: { entityType: entityType || undefined, page: pageNo } })
      .then((res) => setEntries(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load the audit log")));
  }, [entityType, pageNo]);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="A permanent, read-only record of sensitive admin actions."
        action={
          <Select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPageNo(0);
            }}
            className="w-auto"
            aria-label="Filter by entity type"
          >
            <option value="">All entities</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {entityLabel(t)}
              </option>
            ))}
          </Select>
        }
      />

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !entries ? (
          <SkeletonRows />
        ) : entries.content.length === 0 ? (
          <EmptyState title="No audit entries" hint={entityType ? "Nothing has been recorded for this entity type." : undefined} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-coffee-600">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100 align-top">
                {entries.content.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-500">{formatDateTime(a.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="text-coffee-800">{a.actorEmail ?? "System"}</p>
                      {a.actorRole && <p className="text-xs text-coffee-400">{label(a.actorRole)}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-coffee-900">{label(a.action)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-600">
                      {a.entityType ? `${entityLabel(a.entityType)}${a.entityId ? ` #${a.entityId}` : ""}` : "—"}
                    </td>
                    <td className="min-w-48 max-w-md whitespace-pre-wrap break-words px-4 py-3 text-coffee-600">{a.details || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-400">{a.ip || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={entries} onChange={setPageNo} />
      </div>
    </div>
  );
}
