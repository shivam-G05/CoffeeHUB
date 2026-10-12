import { useEffect } from "react";

type JsonLd = Record<string, unknown>;

interface Seo {
  title: string;
  description?: string;
  /** Path of the canonical URL for this page, e.g. /products/monsooned-malabar-aa. */
  canonicalPath?: string;
  /** schema.org structured data (e.g. a Product, FAQPage, BreadcrumbList) for search engines and AI answer engines. */
  jsonLd?: JsonLd | JsonLd[];
  /** Absolute or site-relative image used when the page is shared. Defaults to the site share image. */
  image?: string;
  /** Keep the page out of search results (carts, checkout, account recovery). */
  noindex?: boolean;
}

const DEFAULT_IMAGE = "/og-image.jpg";
const INDEX_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1";

function upsert<K extends "meta" | "link">(tag: K, attr: string, key: string): HTMLElementTagNameMap[K] {
  let el = document.head.querySelector<HTMLElementTagNameMap[K]>(`${tag}[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  return el;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  upsert("meta", attr, key).setAttribute("content", content);
}

function absolute(url: string): string {
  return /^https?:\/\//.test(url) ? url : window.location.origin + (url.startsWith("/") ? url : `/${url}`);
}

/** Sets title, description, canonical, social share tags, robots and optional JSON-LD while the calling page is mounted. */
export function useSeo({ title, description, canonicalPath, jsonLd, image, noindex }: Seo, brandName = "CoffeeHub Global") {
  const json = jsonLd ? JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : null;

  useEffect(() => {
    const previousTitle = document.title;
    const fullTitle = title ? `${title} | ${brandName}` : brandName;
    document.title = fullTitle;
    setMeta("property", "og:title", fullTitle);
    setMeta("name", "twitter:title", fullTitle);

    if (description) {
      const short = description.slice(0, 160);
      setMeta("name", "description", short);
      setMeta("property", "og:description", short);
      setMeta("name", "twitter:description", short);
    }

    const canonical = canonicalPath ? window.location.origin + canonicalPath : null;
    if (canonical) {
      upsert("link", "rel", "canonical").setAttribute("href", canonical);
      setMeta("property", "og:url", canonical);
    }

    const shareImage = absolute(image ?? DEFAULT_IMAGE);
    setMeta("property", "og:image", shareImage);
    setMeta("name", "twitter:image", shareImage);

    setMeta("name", "robots", noindex ? "noindex, follow" : INDEX_ROBOTS);

    const scripts = json
      ? (JSON.parse(json) as JsonLd[]).map((data) => {
          const script = document.createElement("script");
          script.type = "application/ld+json";
          script.text = JSON.stringify(data);
          document.head.appendChild(script);
          return script;
        })
      : [];

    return () => {
      document.title = previousTitle;
      scripts.forEach((s) => s.remove());
      if (noindex) setMeta("name", "robots", INDEX_ROBOTS);
    };
  }, [title, description, canonicalPath, json, image, noindex, brandName]);
}

/** schema.org BreadcrumbList from (name, path) pairs, root first. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: window.location.origin + item.path,
    })),
  };
}
