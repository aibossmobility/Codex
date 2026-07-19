import { useEffect } from "react";

type JsonLd = Record<string, unknown> | Record<string, unknown>[];

type PageMetaProps = {
  title: string;
  description: string;
  keywords?: string;
  jsonLd?: JsonLd;
  canonicalPath?: string;
};

function upsertMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let tag = document.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export function PageMeta({ title, description, keywords, jsonLd, canonicalPath }: PageMetaProps) {
  useEffect(() => {
    document.title = title;
    upsertMeta("description", description);
    if (keywords) upsertMeta("keywords", keywords);
    upsertMeta("og:title", title, "property");
    upsertMeta("og:description", description, "property");
    upsertMeta("og:type", "website", "property");
    upsertMeta("og:url", window.location.href, "property");

    if (canonicalPath) {
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = new URL(canonicalPath, window.location.origin).toString();
    }

    const existing = document.querySelectorAll('script[data-page-jsonld="true"]');
    existing.forEach((node) => node.remove());

    if (jsonLd) {
      const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      blocks.forEach((block, index) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-page-jsonld", "true");
        script.setAttribute("data-page-jsonld-index", String(index));
        script.textContent = JSON.stringify(block);
        document.head.appendChild(script);
      });
    }
  }, [title, description, keywords, jsonLd, canonicalPath]);

  return null;
}
