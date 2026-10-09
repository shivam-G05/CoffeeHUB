import { useEffect } from "react";

interface Seo {
  title: string;
  description?: string;
  /** Path of the canonical URL for this page, e.g. /products/monsooned-malabar-aa. */
  canonicalPath?: string;
  /** schema.org structured data (e.g. a Product) for search engines. */
  jsonLd?: Record<string, unknown>;
}

function upsert<K extends "meta" | "link">(tag: K, attr: string, key: string): HTMLElementTagNameMap[K] {
  let el = document.head.querySelector<HTMLElementTagNameMap[K]>(`${tag}[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement(tag);
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  return el;
}

/** Sets the page title, meta description, canonical link and optional JSON-LD while the calling page is mounted. */
export function useSeo({ title, description, canonicalPath, jsonLd }: Seo, brandName = "CoffeeHub") {
  const json = jsonLd ? JSON.stringify(jsonLd) : null;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | ${brandName}` : brandName;
    if (description) {
      upsert("meta", "name", "description").setAttribute("content", description.slice(0, 160));
    }
    if (canonicalPath) {
      upsert("link", "rel", "canonical").setAttribute("href", window.location.origin + canonicalPath);
    }
    let script: HTMLScriptElement | null = null;
    if (json) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = json;
      document.head.appendChild(script);
    }
    return () => {
      document.title = previousTitle;
      script?.remove();
    };
  }, [title, description, canonicalPath, json, brandName]);
}
