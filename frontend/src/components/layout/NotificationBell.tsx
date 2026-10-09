import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/format";
import type { Notification, Page } from "../../types";

const POLL_MS = 60_000;

/** In-app notifications: unread badge (polled), dropdown of the latest, click-through to the linked page. */
export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const wrapper = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);

  const loadCount = useCallback(() => {
    api
      .get<{ count: number }>("/api/notifications/unread-count")
      .then((res) => setUnread(res.data.count))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadCount();
    const timer = setInterval(loadCount, POLL_MS);
    return () => clearInterval(timer);
  }, [user, loadCount]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!user) return null;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      api.get<Page<Notification>>("/api/notifications", { params: { size: 10 } }).then((res) => setItems(res.data.content));
    }
  }

  async function openNotification(n: Notification) {
    setOpen(false);
    if (!n.read) {
      await api.post(`/api/notifications/${n.id}/read`).catch(() => undefined);
      loadCount();
    }
    if (n.link) navigate(n.link);
  }

  async function markAllRead() {
    await api.post("/api/notifications/read-all");
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  return (
    <div ref={wrapper} className="relative">
      <button
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-coffee-700 hover:bg-coffee-100/70"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50 shadow-lg">
          <div className="flex items-center justify-between border-b border-coffee-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-coffee-900">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-coffee-500 hover:text-coffee-800">
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-coffee-400">You're all caught up.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-coffee-100 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openNotification(n)}
                    className={`block w-full px-4 py-3 text-left hover:bg-coffee-100/50 ${n.read ? "" : "bg-amber-accent/10"}`}
                  >
                    <p className="text-sm font-medium text-coffee-900">{n.title}</p>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-coffee-500">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-coffee-400">{formatDateTime(n.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
