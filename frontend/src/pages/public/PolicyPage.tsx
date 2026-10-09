import { useEffect, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import axios from "axios";
import { api, apiErrorMessage } from "../../api/client";
import { useBrand } from "../../context/BrandContext";
import { POLICY_LINKS } from "../../lib/constants";
import { formatDate } from "../../lib/format";
import { useSeo } from "../../lib/seo";
import type { ContentBlock } from "../../types";
import { EmptyState, ErrorNote, SkeletonRows } from "../../components/ui/Common";

export default function PolicyPage() {
  const { slug } = useParams();
  const brand = useBrand();
  const [policy, setPolicy] = useState<ContentBlock | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPolicy(null);
    setNotFound(false);
    setError(null);
    api
      .get<ContentBlock>(`/api/content/POLICY/${slug}`)
      .then((res) => setPolicy(res.data))
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 404) setNotFound(true);
        else setError(apiErrorMessage(err, "Could not load this page"));
      });
  }, [slug]);

  const fallbackTitle = POLICY_LINKS.find((p) => p.slug === slug)?.title ?? "Policy";
  useSeo(
    {
      title: policy?.title ?? fallbackTitle,
      description: policy ? `${policy.title} for ${brand.name}.` : undefined,
      canonicalPath: `/policies/${slug}`,
    },
    brand.name,
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_16rem]">
      <article className="min-w-0">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : notFound ? (
          <EmptyState
            title="Page not found"
            hint="This policy does not exist or has not been published yet."
            action={
              <Link to="/help" className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
                Help &amp; FAQs
              </Link>
            }
          />
        ) : policy === null ? (
          <SkeletonRows count={4} />
        ) : (
          <>
            <h1 className="text-2xl font-bold text-coffee-900 sm:text-3xl">{policy.title}</h1>
            <p className="mt-1 text-xs text-coffee-400">Last updated {formatDate(policy.updatedAt)}</p>
            <div className="mt-6 whitespace-pre-wrap break-words text-sm leading-relaxed text-coffee-800">{policy.body}</div>
          </>
        )}
      </article>

      <nav aria-label="Policies" className="lg:order-last">
        <div className="rounded-2xl border border-coffee-100 bg-cream-50 p-4">
          <p className="text-sm font-semibold text-coffee-900">Policies</p>
          <ul className="mt-2 space-y-1 text-sm">
            {POLICY_LINKS.map((p) => (
              <li key={p.slug}>
                <NavLink
                  to={`/policies/${p.slug}`}
                  className={({ isActive }) => `block rounded-lg px-2 py-1.5 ${isActive ? "bg-coffee-100 font-semibold text-coffee-900" : "text-coffee-600 hover:bg-coffee-100/50"}`}
                >
                  {p.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
}
