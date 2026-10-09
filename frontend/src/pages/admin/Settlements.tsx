import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { api, apiErrorMessage, openProtected } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { formatDateTime, money } from "../../lib/format";
import type { Page, Payable, Settlement } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, Modal, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";
import { Field, Input, Textarea } from "../../components/ui/Input";

export default function AdminSettlements() {
  const { showToast } = useToast();
  const [payables, setPayables] = useState<Payable[] | null>(null);
  const [payablesError, setPayablesError] = useState<string | null>(null);
  const [pageNo, setPageNo] = useState(0);
  const [history, setHistory] = useState<Page<Settlement> | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [paying, setPaying] = useState<Payable | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadPayables = useCallback(() => {
    setPayablesError(null);
    api
      .get<Payable[]>("/api/admin/settlements/payables")
      .then((res) => setPayables(res.data))
      .catch((err) => setPayablesError(apiErrorMessage(err, "Could not load payables")));
  }, []);

  const loadHistory = useCallback(() => {
    setHistoryError(null);
    api
      .get<Page<Settlement>>("/api/admin/settlements", { params: { page: pageNo } })
      .then((res) => setHistory(res.data))
      .catch((err) => setHistoryError(apiErrorMessage(err, "Could not load settlement history")));
  }, [pageNo]);

  useEffect(loadPayables, [loadPayables]);
  useEffect(loadHistory, [loadHistory]);

  async function pay(e: FormEvent) {
    e.preventDefault();
    if (!paying) return;
    setBusy(true);
    setPayError(null);
    try {
      await api.post("/api/admin/settlements", { vendorId: paying.vendorId, reference: reference.trim(), note: note.trim() || undefined });
      showToast(`Payout to ${paying.vendorName} recorded`, "success");
      setPaying(null);
      loadPayables();
      if (pageNo === 0) loadHistory();
      else setPageNo(0);
    } catch (err) {
      setPayError(apiErrorMessage(err, "Could not record the payout"));
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv(path: string, name: string) {
    setExporting(true);
    try {
      await openProtected(path, name);
    } catch (err) {
      showToast(apiErrorMessage(err, "Export failed"), "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settlements"
        subtitle="What is owed to vendors for completed orders, and the payouts already made."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={exporting} onClick={() => exportCsv("/api/admin/reports/settlements.csv", "coffeehub-settlements.csv")}>
              <Download size={15} /> Settlements CSV
            </Button>
            <Button variant="secondary" disabled={exporting} onClick={() => exportCsv("/api/admin/reports/transactions.csv", "coffeehub-transactions.csv")}>
              <Download size={15} /> Transactions CSV
            </Button>
          </div>
        }
      />

      <h2 className="mt-8 text-lg font-semibold text-coffee-900">Ready to pay</h2>
      <p className="mt-1 text-sm text-coffee-500">
        Recording a payout settles everything currently eligible for that vendor. Make the bank transfer first, then record its reference here.
      </p>
      <div className="mt-3">
        {payablesError ? (
          <ErrorNote>{payablesError}</ErrorNote>
        ) : !payables ? (
          <SkeletonRows count={2} />
        ) : payables.length === 0 ? (
          <EmptyState title="Nothing to pay out" hint="Vendor earnings become eligible once their orders are completed." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-coffee-600">
                <tr>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Bank details</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {payables.map((p) => (
                  <tr key={p.vendorId}>
                    <td className="px-4 py-3">
                      <Link to={`/admin/vendors/${p.vendorId}`} className="font-medium text-coffee-900 hover:underline">
                        {p.vendorName}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-coffee-900">{money(p.amount)}</td>
                    <td className="px-4 py-3 text-coffee-600">{p.orderCount}</td>
                    <td className="px-4 py-3">{p.bankStatus ? <Badge>{p.bankStatus}</Badge> : <Badge tone="DRAFT">Not added</Badge>}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        disabled={p.payoutOnHold}
                        onClick={() => {
                          setReference("");
                          setNote("");
                          setPayError(null);
                          setPaying(p);
                        }}
                      >
                        Record payout
                      </Button>
                      {p.payoutOnHold && (
                        <p className="mt-1 text-xs text-amber-700">
                          On hold: bank details are not verified.{" "}
                          <Link to={`/admin/vendors/${p.vendorId}`} className="font-semibold underline">
                            Review
                          </Link>
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-coffee-900">Settlement history</h2>
      <div className="mt-3">
        {historyError ? (
          <ErrorNote>{historyError}</ErrorNote>
        ) : !history ? (
          <SkeletonRows count={2} />
        ) : history.content.length === 0 ? (
          <EmptyState title="No payouts recorded yet" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-coffee-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {history.content.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-500">{formatDateTime(s.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-coffee-900">{s.vendorName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-700">{money(s.amount)}</td>
                    <td className="px-4 py-3 text-coffee-600">{s.orderCount}</td>
                    <td className="break-all px-4 py-3 text-coffee-600">{s.reference || "—"}</td>
                    <td className="px-4 py-3 text-coffee-500">{s.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={history} onChange={setPageNo} />
      </div>

      {paying && (
        <Modal title={`Record payout to ${paying.vendorName}`} onClose={() => setPaying(null)}>
          <form onSubmit={pay} className="space-y-4">
            <p className="text-sm text-coffee-600">
              This marks {money(paying.amount)} across {paying.orderCount} order{paying.orderCount === 1 ? "" : "s"} as settled. It does not move money:
              make the transfer from the bank first.
            </p>
            <Field label="Bank reference (UTR)">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} required />
            </Field>
            <Field label="Note (optional)">
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            </Field>
            <ErrorNote>{payError}</ErrorNote>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPaying(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !reference.trim()}>
                {busy ? "Saving…" : "Record payout"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
