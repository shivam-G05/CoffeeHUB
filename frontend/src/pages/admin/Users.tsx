import { useCallback, useEffect, useState } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatDateTime, label } from "../../lib/format";
import type { Page, Role, User } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, Modal, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";
import { Select } from "../../components/ui/Input";

interface LoginEvent {
  id: number;
  identifier: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

const roleFilters: { value: Role | ""; label: string }[] = [
  { value: "", label: "All roles" },
  { value: "CUSTOMER", label: "Buyers" },
  { value: "SELLER", label: "Sellers" },
  { value: "ADMIN", label: "Admins" },
];

export default function AdminUsers() {
  const { showToast } = useToast();
  const [role, setRole] = useState<Role | "">("");
  const [pageNo, setPageNo] = useState(0);
  const [users, setUsers] = useState<Page<User> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [historyFor, setHistoryFor] = useState<User | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<Page<User>>("/api/admin/users", { params: { role: role || undefined, page: pageNo } })
      .then((res) => setUsers(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load users")));
  }, [role, pageNo]);

  useEffect(load, [load]);

  async function toggle(u: User) {
    if (u.enabled && !window.confirm(`Block ${u.name}? They will not be able to sign in until unblocked.`)) return;
    setBusyId(u.id);
    try {
      await api.put(`/api/admin/users/${u.id}/toggle`);
      showToast(u.enabled ? "User blocked" : "User unblocked", "success");
      load();
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not update the user"), "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Every account on the platform. Blocking and unblocking is recorded in the audit log."
        action={
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role | "");
              setPageNo(0);
            }}
            className="w-auto"
            aria-label="Filter by role"
          >
            {roleFilters.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        }
      />

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !users ? (
          <SkeletonRows />
        ) : users.content.length === 0 ? (
          <EmptyState title="No users found" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-coffee-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {users.content.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-coffee-900">{u.name}</td>
                    <td className="px-4 py-3 text-coffee-500">{u.email}</td>
                    <td className="px-4 py-3 text-coffee-500">{u.phone || "—"}</td>
                    <td className="px-4 py-3 text-coffee-500">{u.role === "CUSTOMER" ? "Buyer" : label(u.role)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-500">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={u.enabled ? "approved" : "CANCELLED"}>{u.enabled ? "Active" : "Blocked"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        <Button variant="ghost" onClick={() => setHistoryFor(u)}>
                          Login history
                        </Button>
                        {u.role !== "ADMIN" && (
                          <Button variant={u.enabled ? "danger" : "secondary"} disabled={busyId === u.id} onClick={() => toggle(u)}>
                            {u.enabled ? "Block" : "Unblock"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={users} onChange={setPageNo} />
      </div>

      {historyFor && <LoginHistory user={historyFor} onClose={() => setHistoryFor(null)} />}
    </div>
  );
}

function LoginHistory({ user, onClose }: { user: User; onClose: () => void }) {
  const [pageNo, setPageNo] = useState(0);
  const [events, setEvents] = useState<Page<LoginEvent> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api
      .get<Page<LoginEvent>>(`/api/admin/users/${user.id}/logins`, { params: { page: pageNo } })
      .then((res) => setEvents(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load login history")));
  }, [user.id, pageNo]);

  return (
    <Modal title={`Login history: ${user.name}`} onClose={onClose}>
      {error ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !events ? (
        <SkeletonRows count={3} />
      ) : events.content.length === 0 ? (
        <p className="text-sm text-coffee-500">No sign-in attempts recorded for this account.</p>
      ) : (
        <ul className="divide-y divide-coffee-100">
          {events.content.map((e) => (
            <li key={e.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-coffee-800">{formatDateTime(e.createdAt)}</span>
                <Badge tone={e.success ? "approved" : "FAILED"}>{e.success ? "Success" : "Failed"}</Badge>
              </div>
              <p className="mt-1 break-all text-xs text-coffee-500">
                {e.identifier} · IP {e.ip || "unknown"}
              </p>
              {e.userAgent && <p className="mt-0.5 break-all text-xs text-coffee-400">{e.userAgent}</p>}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={events} onChange={setPageNo} />
    </Modal>
  );
}
