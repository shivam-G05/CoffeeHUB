import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/format";
import type { Conversation, Page } from "../../types";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, PageHeader, SkeletonRows } from "../../components/ui/Common";
import { Textarea } from "../../components/ui/Input";

/**
 * Buyer-seller messaging, shared by both dashboards. `basePath` is the dashboard's
 * messages route; `/:id` after it opens a thread.
 */
export default function Messages({ basePath }: { basePath: string }) {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Conversation[] | null>(null);
  const [active, setActive] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const isSeller = user?.role === "SELLER";

  const loadThreads = useCallback(() => {
    api.get<Page<Conversation>>("/api/conversations").then((res) => setThreads(res.data.content));
  }, []);

  useEffect(loadThreads, [loadThreads]);

  useEffect(() => {
    if (!id) {
      setActive(null);
      return;
    }
    setError(null);
    api
      .get<Conversation>(`/api/conversations/${id}`)
      .then((res) => {
        setActive(res.data);
        loadThreads(); // opening a thread marks it read
      })
      .catch((err) => setError(apiErrorMessage(err, "Conversation not found")));
  }, [id, loadThreads]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [active?.messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.post<Conversation>(`/api/conversations/${active.id}/messages`, { message: draft.trim() });
      setActive(res.data);
      setDraft("");
      loadThreads();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not send message"));
    } finally {
      setSending(false);
    }
  }

  const counterpart = (c: Conversation) => (isSeller ? c.buyerName : c.vendorName);

  return (
    <div>
      <PageHeader title="Messages" subtitle="Conversations stay on the platform. Phone numbers and email addresses are hidden automatically." />

      <div className="mt-6 grid gap-4 lg:grid-cols-[20rem_1fr]">
        {/* Thread list: hidden on small screens while a thread is open */}
        <div className={id ? "hidden lg:block" : ""}>
          {threads === null ? (
            <SkeletonRows count={3} />
          ) : threads.length === 0 ? (
            <EmptyState
              title="No conversations yet"
              hint={isSeller ? "Buyers can message you from your products, RFQs and orders." : "Start one from a supplier's storefront, a product page or an order."}
            />
          ) : (
            <ul className="divide-y divide-coffee-100 overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50">
              {threads.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => navigate(`${basePath}/${c.id}`)}
                    className={`block w-full px-4 py-3 text-left hover:bg-coffee-100/50 ${String(c.id) === id ? "bg-coffee-100/70" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm ${c.unread ? "font-bold text-coffee-900" : "font-medium text-coffee-800"}`}>{counterpart(c)}</p>
                      {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-accent" aria-label="Unread" />}
                    </div>
                    <p className="truncate text-xs text-coffee-500">{c.subject}</p>
                    <p className="mt-0.5 truncate text-xs text-coffee-400">{c.lastMessagePreview}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Open thread */}
        <div className={id ? "" : "hidden lg:block"}>
          {!id ? (
            <EmptyState title="Select a conversation" />
          ) : !active ? (
            error ? <ErrorNote>{error}</ErrorNote> : <SkeletonRows count={2} />
          ) : (
            <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50">
              <div className="border-b border-coffee-100 px-4 py-3">
                <Link to={basePath} className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-coffee-500 lg:hidden">
                  <ArrowLeft size={14} /> All messages
                </Link>
                <p className="font-semibold text-coffee-900">{counterpart(active)}</p>
                <p className="text-xs text-coffee-500">{active.subject}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {active.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? "bg-coffee-800 text-cream-50" : "bg-coffee-100 text-coffee-900"}`}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${m.mine ? "text-coffee-200" : "text-coffee-400"}`}>
                        {m.senderName} · {formatDateTime(m.createdAt)}
                      </p>
                      {m.flagged && (
                        <p className={`mt-1 flex items-center gap-1 text-[10px] ${m.mine ? "text-amber-200" : "text-amber-700"}`}>
                          <ShieldAlert size={11} /> Contact details were hidden
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottom} />
              </div>

              <form onSubmit={send} className="border-t border-coffee-100 p-3">
                <ErrorNote>{error}</ErrorNote>
                <div className="flex items-end gap-2">
                  <Textarea
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message…"
                    maxLength={4000}
                    aria-label="Message"
                  />
                  <Button type="submit" disabled={sending || !draft.trim()}>
                    {sending ? "Sending…" : "Send"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
