import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../lib/format";
import type { ContentBlock, ContentType } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, ImageUploader, Img, Modal, PageHeader, SkeletonRows } from "../../components/ui/Common";
import { Field, Input, Textarea } from "../../components/ui/Input";

const TABS: { type: ContentType; label: string; singular: string; hint: string }[] = [
  { type: "BANNER", label: "Homepage banners", singular: "banner", hint: "Shown at the top of the homepage in sort order." },
  { type: "FAQ", label: "FAQs", singular: "FAQ", hint: "Title is the question, body is the answer. Shown on the Help page." },
  { type: "ARTICLE", label: "Blog / articles", singular: "article", hint: "Long-form content for buyers and sellers." },
  { type: "POLICY", label: "Policy pages", singular: "policy page", hint: "Legal and policy pages linked from the footer." },
  { type: "FOOTER_LINK", label: "Footer links", singular: "footer link", hint: "Extra links in the site footer. Title is the link text." },
];

const WITH_IMAGE: ContentType[] = ["BANNER", "ARTICLE"];

interface FormState {
  id?: number;
  type: ContentType;
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: string;
  active: boolean;
}

export default function AdminContent() {
  const { showToast } = useToast();
  const [blocks, setBlocks] = useState<ContentBlock[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<ContentType>("BANNER");
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api
      .get<ContentBlock[]>("/api/admin/content")
      .then((res) => setBlocks(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load content")));
  }, []);

  useEffect(load, [load]);

  const tab = TABS.find((t) => t.type === type) ?? TABS[0];
  const items = (blocks ?? []).filter((b) => b.type === type);

  function edit(block?: ContentBlock) {
    setFormError(null);
    setForm(
      block
        ? {
            id: block.id,
            type: block.type,
            title: block.title,
            body: block.body ?? "",
            imageUrl: block.imageUrl ?? "",
            linkUrl: block.linkUrl ?? "",
            sortOrder: String(block.sortOrder),
            active: block.active,
          }
        : { type, title: "", body: "", imageUrl: "", linkUrl: "", sortOrder: String(items.length), active: true },
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setFormError(null);
    const body = {
      type: form.type,
      title: form.title.trim(),
      body: form.body,
      imageUrl: form.imageUrl || null,
      linkUrl: form.linkUrl.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
      active: form.active,
    };
    try {
      if (form.id) await api.put(`/api/admin/content/${form.id}`, body);
      else await api.post("/api/admin/content", body);
      showToast("Content saved", "success");
      setForm(null);
      load();
    } catch (err) {
      setFormError(apiErrorMessage(err, "Could not save the content"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(block: ContentBlock) {
    if (!window.confirm(`Delete "${block.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/content/${block.id}`);
      showToast("Content deleted", "success");
      load();
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not delete the content"), "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Content (CMS)"
        subtitle="Banners, FAQs, articles, policy pages and footer links."
        action={<Button onClick={() => edit()}>New {tab.singular}</Button>}
      />

      <p className="mt-4 rounded-2xl border border-coffee-100 bg-cream-50 px-4 py-3 text-sm text-coffee-600">
        Featured categories, sellers and products are managed from their own admin pages (Categories, Vendor Verification, Product Moderation).
        Commission is set in Categories &amp; Commission and Settings.
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.type}
            onClick={() => setType(t.type)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
              type === t.type ? "bg-coffee-800 text-cream-50" : "bg-coffee-100 text-coffee-700 hover:bg-coffee-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-coffee-500">{tab.hint}</p>

      <div className="mt-4 space-y-3">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !blocks ? (
          <SkeletonRows />
        ) : items.length === 0 ? (
          <EmptyState title={`No ${tab.label.toLowerCase()} yet`} action={<Button onClick={() => edit()}>New {tab.singular}</Button>} />
        ) : (
          items.map((b) => (
            <div key={b.id} className={`rounded-2xl border border-coffee-100 bg-cream-50 p-4 shadow-sm ${b.active ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {WITH_IMAGE.includes(b.type) && <Img src={b.imageUrl} alt={b.title} className="h-16 w-24 shrink-0 rounded-lg" />}
                  <div className="min-w-0">
                    <p className="font-semibold text-coffee-900">{b.title}</p>
                    {b.type === "POLICY" && b.slug && (
                      <p className="break-all text-xs text-coffee-500">
                        Public URL:{" "}
                        <a href={`/policies/${b.slug}`} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                          /policies/{b.slug}
                        </a>
                      </p>
                    )}
                    {b.linkUrl && <p className="break-all text-xs text-coffee-500">Link: {b.linkUrl}</p>}
                    {b.body && <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm text-coffee-600">{b.body}</p>}
                    <p className="mt-1 text-xs text-coffee-400">
                      Sort order {b.sortOrder} · updated {formatDate(b.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={b.active ? "approved" : "DRAFT"}>{b.active ? "Published" : "Hidden"}</Badge>
                  <Button variant="secondary" onClick={() => edit(b)}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => remove(b)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {form && (
        <Modal title={`${form.id ? "Edit" : "New"} ${TABS.find((t) => t.type === form.type)?.singular ?? "content"}`} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label={form.type === "FAQ" ? "Question" : form.type === "FOOTER_LINK" ? "Link text" : "Title"}>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={255} required />
            </Field>
            {form.type === "POLICY" && (
              <p className="text-xs text-coffee-500">
                {form.id
                  ? "The public URL stays the same when the title changes."
                  : "The public URL (/policies/…) is generated from the title when the page is created."}
              </p>
            )}
            {form.type !== "FOOTER_LINK" && (
              <Field label={form.type === "FAQ" ? "Answer (plain text)" : "Body (plain text)"}>
                <Textarea rows={form.type === "POLICY" || form.type === "ARTICLE" ? 14 : 5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={20000} />
              </Field>
            )}
            {WITH_IMAGE.includes(form.type) && (
              <div>
                <span className="mb-1 block text-xs font-semibold text-coffee-600">Image</span>
                <ImageUploader value={form.imageUrl ? [form.imageUrl] : []} onChange={(urls) => setForm({ ...form, imageUrl: urls[0] ?? "" })} max={1} />
              </div>
            )}
            {(form.type === "BANNER" || form.type === "FOOTER_LINK") && (
              <Field label="Link URL (a path like /products, or a full https:// address)">
                <Input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} maxLength={500} required={form.type === "FOOTER_LINK"} />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sort order (lower shows first)">
                <Input type="number" step="1" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-sm text-coffee-800 sm:mt-6">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Published
              </label>
            </div>
            <ErrorNote>{formError}</ErrorNote>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !form.title.trim()}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
