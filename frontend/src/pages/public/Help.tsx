import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Mail, PackageSearch } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useBrand } from "../../context/BrandContext";
import { POLICY_LINKS } from "../../lib/constants";
import { useSeo } from "../../lib/seo";
import type { ContentBlock } from "../../types";
import { Card, EmptyState, ErrorNote, PageHeader, SkeletonRows } from "../../components/ui/Common";

export default function Help() {
  const brand = useBrand();
  const [faqs, setFaqs] = useState<ContentBlock[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useSeo(
    {
      title: "Help & FAQs",
      description: `Answers to common questions about buying, selling and sourcing on ${brand.name}.`,
      canonicalPath: "/help",
    },
    brand.name,
  );

  useEffect(() => {
    api
      .get<ContentBlock[]>("/api/content", { params: { type: "FAQ" } })
      .then((res) => setFaqs(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load FAQs")));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader title="Help & FAQs" subtitle={`How buying, selling and sourcing work on ${brand.name}.`} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="min-w-0" aria-label="Frequently asked questions">
          {error ? (
            <ErrorNote>{error}</ErrorNote>
          ) : faqs === null ? (
            <SkeletonRows count={4} />
          ) : faqs.length === 0 ? (
            <EmptyState title="No FAQs published yet" hint={`Email ${brand.supportEmail} and we'll help you directly.`} />
          ) : (
            <ul className="divide-y divide-coffee-100 overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50">
              {faqs.map((faq) => {
                const open = openId === faq.id;
                return (
                  <li key={faq.id}>
                    <h2>
                      <button
                        onClick={() => setOpenId(open ? null : faq.id)}
                        aria-expanded={open}
                        aria-controls={`faq-${faq.id}`}
                        id={`faq-button-${faq.id}`}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-coffee-900 hover:bg-coffee-100/40"
                      >
                        {faq.title}
                        <ChevronDown size={16} className={`shrink-0 text-coffee-500 transition ${open ? "rotate-180" : ""}`} />
                      </button>
                    </h2>
                    <div id={`faq-${faq.id}`} role="region" aria-labelledby={`faq-button-${faq.id}`} hidden={!open} className="px-4 pb-4">
                      <p className="whitespace-pre-wrap break-words text-sm text-coffee-700">{faq.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <Card>
            <p className="flex items-center gap-2 font-semibold text-coffee-900">
              <PackageSearch size={16} /> Problem with an order?
            </p>
            <p className="mt-2 text-sm text-coffee-600">
              Issues such as a missing, damaged or wrong item are raised from the order itself, so the seller and our team see the full details.
            </p>
            <Link to="/customer/orders" className="mt-3 inline-block text-sm font-semibold text-coffee-800 underline">
              Go to my orders
            </Link>
          </Card>
          <Card>
            <p className="flex items-center gap-2 font-semibold text-coffee-900">
              <Mail size={16} /> Contact support
            </p>
            <a href={`mailto:${brand.supportEmail}`} className="mt-2 block break-all text-sm text-coffee-700 underline">
              {brand.supportEmail}
            </a>
          </Card>
          <Card>
            <p className="font-semibold text-coffee-900">Policies</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {POLICY_LINKS.map((p) => (
                <li key={p.slug}>
                  <Link to={`/policies/${p.slug}`} className="text-coffee-600 hover:text-coffee-900 hover:underline">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
