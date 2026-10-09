import { useEffect, useRef, useState, type ReactNode } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from "lucide-react";
import { apiErrorMessage, fileUrl, uploadFile } from "../../api/client";
import { useBrand } from "../../context/BrandContext";
import type { Page, UploadedFile } from "../../types";

/** "<Brand> Verified": only ever rendered for vendors an admin has approved. */
export function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  const brand = useBrand();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800"
      title={`Business documents reviewed and approved by ${brand.name}`}
    >
      <BadgeCheck size={13} />
      {compact ? "Verified" : `${brand.name} Verified`}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-coffee-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-coffee-100 bg-cream-50 p-5 shadow-sm ${className}`}>{children}</div>;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-coffee-200 bg-cream-50 px-6 py-12 text-center">
      <p className="font-semibold text-coffee-800">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-coffee-500">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

/** Grey pulsing blocks shown while a list loads. */
export function SkeletonGrid({ count = 8, className = "h-64" }: { count?: number; className?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`animate-pulse rounded-2xl bg-coffee-100/70 ${className}`} />
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-coffee-100/70" />
      ))}
    </div>
  );
}

/** Pager for the backend's Page<T> shape (zero-based page index). Renders nothing for a single page. */
export function Pagination<T>({ page, onChange }: { page: Page<T> | null; onChange: (page: number) => void }) {
  if (!page || page.totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-3 text-sm">
      <button
        onClick={() => onChange(page.page - 1)}
        disabled={page.page <= 0}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-coffee-200 text-coffee-700 disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-coffee-600">
        Page {page.page + 1} of {page.totalPages}
      </span>
      <button
        onClick={() => onChange(page.page + 1)}
        disabled={page.page >= page.totalPages - 1}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-coffee-200 text-coffee-700 disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-coffee-900/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-cream-50 p-5 shadow-xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-coffee-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-coffee-400 hover:text-coffee-800">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Lazy-loaded image with a neutral placeholder when there is no image. */
export function Img({ src, alt, className = "" }: { src?: string | null; alt: string; className?: string }) {
  const url = fileUrl(src);
  if (!url) {
    return <div className={`flex items-center justify-center bg-coffee-100 text-xs text-coffee-400 ${className}`}>No image</div>;
  }
  return <img src={url} alt={alt} loading="lazy" decoding="async" className={`object-cover ${className}`} />;
}

/**
 * Multi-image picker that uploads to /api/files as public images and reports the stored paths.
 * `value` holds the /api/files/... paths; the first one is treated as the primary image.
 */
export function ImageUploader({ value, onChange, max = 6 }: { value: string[]; onChange: (urls: string[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, max - value.length)) {
        uploaded.push((await uploadFile(file, "public")).url);
      }
      onChange([...value, ...uploaded]);
    } catch (err) {
      setError(apiErrorMessage(err, "Upload failed"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-coffee-200">
            <Img src={url} alt={`Image ${i + 1}`} className="h-full w-full" />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              aria-label="Remove image"
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-coffee-900/70 text-white"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-coffee-300 text-xs text-coffee-500 hover:bg-coffee-100/50"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
            {busy ? "Uploading" : "Add"}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="mt-1 text-xs text-coffee-400">PNG, JPEG, WebP or AVIF, up to 3 MB each. The first image is the main one.</p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Single-file upload button for private documents (PDF or image). Calls back with the stored file. */
export function DocumentUploadButton({ onUploaded, children }: { onUploaded: (file: UploadedFile) => void; children: ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file?: File) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onUploaded(await uploadFile(file, "private"));
    } catch (err) {
      setError(apiErrorMessage(err, "Upload failed"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <span>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-2 rounded-full bg-coffee-100 px-4 py-2 text-sm font-semibold text-coffee-800 hover:bg-coffee-200 disabled:opacity-50"
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        {busy ? "Uploading…" : children}
      </button>
      <input ref={input} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={(e) => handle(e.target.files?.[0])} />
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
