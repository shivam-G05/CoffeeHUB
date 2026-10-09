import { useEffect, useState } from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { formatDateTime } from "../../lib/format";
import type { Conversation, Page } from "../../types";
import { EmptyState, ErrorNote, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";

export default function AdminConversations() {
  const [pageNo, setPageNo] = useState(0);
  const [threads, setThreads] = useState<Page<Conversation> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [active, setActive] = useState<Conversation | null>(null);
  const [activeError, setActiveError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api
      .get<Page<Conversation>>("/api/admin/conversations", { params: { page: pageNo } })
      .then((res) => setThreads(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load flagged conversations")));
  }, [pageNo]);

  // Only fetched on an explicit click: the server writes an audit entry for every view.
  function open(id: number) {
    setActiveId(id);
    setActive(null);
    setActiveError(null);
    api
      .get<Conversation>(`/api/admin/conversations/${id}`)
      .then((res) => setActive(res.data))
      .catch((err) => setActiveError(apiErrorMessage(err, "Could not open the conversation")));
  }

  return (
    <div>
      <PageHeader title="Flagged Messages" subtitle="Buyer-seller threads where the contact-sharing filter was triggered." />

      <p className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <ShieldAlert size={18} className="mt-0.5 shrink-0" />
        <span>
          Access is limited to flagged threads: other conversations are private to the buyer and seller. Each time you open a thread, the view is recorded
          in the audit log against your account.
        </span>
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className={activeId ? "hidden lg:block" : ""}>
          {error ? (
            <ErrorNote>{error}</ErrorNote>
          ) : !threads ? (
            <SkeletonRows count={3} />
          ) : threads.content.length === 0 ? (
            <EmptyState title="No flagged conversations" hint="Threads appear here when someone tries to share a phone number or email address." />
          ) : (
            <ul className="divide-y divide-coffee-100 overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50">
              {threads.content.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => open(c.id)}
                    className={`block w-full px-4 py-3 text-left hover:bg-coffee-100/50 ${c.id === activeId ? "bg-coffee-100/70" : ""}`}
                  >
                    <p className="truncate text-sm font-medium text-coffee-800">
                      {c.buyerName} ↔ {c.vendorName}
                    </p>
                    <p className="truncate text-xs text-coffee-500">{c.subject}</p>
                    <p className="mt-0.5 text-xs text-coffee-400">{formatDateTime(c.lastMessageAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={threads} onChange={setPageNo} />
        </div>

        <div className={activeId ? "" : "hidden lg:block"}>
          {!activeId ? (
            <EmptyState title="Select a conversation" hint="Opening a thread is audit-logged." />
          ) : (
            <div>
              <button onClick={() => setActiveId(null)} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-coffee-500 lg:hidden">
                <ArrowLeft size={14} /> All flagged threads
              </button>
              {!active ? (
                activeError ? (
                  <ErrorNote>{activeError}</ErrorNote>
                ) : (
                  <SkeletonRows count={2} />
                )
              ) : (
                <div className="flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50">
                  <div className="border-b border-coffee-100 px-4 py-3">
                    <p className="font-semibold text-coffee-900">
                      {active.buyerName} (buyer) ↔ {active.vendorName} (vendor)
                    </p>
                    <p className="text-xs text-coffee-500">{active.subject} · read-only</p>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                    {active.messages.length === 0 && <p className="text-sm text-coffee-400">This thread has no messages.</p>}
                    {active.messages.map((m) => {
                      const fromBuyer = m.senderId === active.buyerId;
                      return (
                        <div key={m.id} className={`flex ${fromBuyer ? "justify-start" : "justify-end"}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                              m.flagged ? "bg-amber-100 text-coffee-900 ring-1 ring-amber-300" : "bg-coffee-100 text-coffee-900"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                            <p className="mt-1 text-[10px] text-coffee-500">
                              {m.senderName} · {formatDateTime(m.createdAt)}
                            </p>
                            {m.flagged && (
                              <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-800">
                                <ShieldAlert size={11} /> Contact details were detected and hidden
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
