import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { Cafe } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function AdminCafes() {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .get<Cafe[]>("/api/admin/cafes")
      .then((res) => setCafes(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function setApproved(id: number, approved: boolean) {
    await api.put(`/api/cafes/${id}/approve`, null, { params: { approved } });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-coffee-900">Café Approvals</h1>
      <p className="mt-1 text-coffee-500">Review cafés submitted by owners.</p>

      {loading ? (
        <p className="mt-8 text-coffee-400">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
          <table className="w-full text-left text-sm">
            <thead className="bg-coffee-100 text-coffee-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee-100">
              {cafes.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-coffee-900">{c.name}</td>
                  <td className="px-4 py-3 text-coffee-500">{c.ownerName}</td>
                  <td className="px-4 py-3 text-coffee-500">{c.city}</td>
                  <td className="px-4 py-3">
                    <Badge tone={c.approved ? "approved" : "pending"}>{c.approved ? "Approved" : "Pending"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.approved ? (
                      <Button variant="secondary" onClick={() => setApproved(c.id, false)}>
                        Unpublish
                      </Button>
                    ) : (
                      <Button onClick={() => setApproved(c.id, true)}>Approve</Button>
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
