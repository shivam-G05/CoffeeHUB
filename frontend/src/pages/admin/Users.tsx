import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { Role, User } from "../../types";
import Badge from "../../components/ui/Badge";
import { Select } from "../../components/ui/Input";

const roleFilters: { value: Role | ""; label: string }[] = [
  { value: "", label: "All roles" },
  { value: "CUSTOMER", label: "Customers" },
  { value: "SELLER", label: "Sellers" },
  { value: "ADMIN", label: "Admins" },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [role, setRole] = useState<Role | "">("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .get<User[]>("/api/admin/users", { params: role ? { role } : {} })
      .then((res) => setUsers(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [role]);

  async function toggle(id: number) {
    await api.put(`/api/admin/users/${id}/toggle`);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-coffee-900">User Management</h1>
        <Select value={role} onChange={(e) => setRole(e.target.value as Role | "")} className="w-auto">
          {roleFilters.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <p className="mt-8 text-coffee-400">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
          <table className="w-full text-left text-sm">
            <thead className="bg-coffee-100 text-coffee-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-coffee-900">{u.name}</td>
                  <td className="px-4 py-3 text-coffee-500">{u.email}</td>
                  <td className="px-4 py-3 text-coffee-500">{u.role}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.enabled ? "approved" : "CANCELLED"}>{u.enabled ? "Active" : "Disabled"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== "ADMIN" && (
                      <button onClick={() => toggle(u.id)} className="text-coffee-700 hover:underline">
                        {u.enabled ? "Disable" : "Enable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
