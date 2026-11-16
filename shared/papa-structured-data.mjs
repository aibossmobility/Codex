import { VERIFIED_PAPA_PRODUCTS } from "./papa-verified-product-catalog.mjs";

// Shared, accurate page-level structured data for the existing Papa Life website.
// No speculative prices, course availability, testimonials, or medical claims.
const SITE = "https://papalifecoach.com";
const ORG_ID = SITE + "/#organization";
const WEBSITE_ID = SITE + "/#website";
const PERSON_ID = SITE + "/about-brian-keith-hill#person";
const FRAMEWORK_ID = SITE + "/papa-framework#framework";
const MARKER = 'data-papa-schema="page"';
const PAGE_SCRIPT = /<script\b(?=[^>]*\bdata-papa-schema=["']page["'])[^>]*>[\s\S]*?<\/script>\s*/gi;
const COLLECTION_PATHS = new Set([
  "/site-directory", "/shop", "/courses", "/resources", "/books", "/podcast",
  "/house/library", "/house/resources", "/house/listening-room"
]);
const EXCLUDED = new Set([
  "/login", "/member-login", "/member-reset-password", "/member-activate",
  "/member-forgot-password", "/portal", "/papa-life-os", "/admin",
  "/404", "/assessment", "/relationship-assessment", "/membership",
  "/papa-journey", "/privacy", "/terms"
]);

function cleanPath(input) {
  if (typeof input !== "string" || !input.startsWith("/") || input.startsWith("//")) return null;
  const path = input.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (path.includes("..") || /[\s<>"']/.test(path)) return null;
  return path;
}

export function schemaForPapaPage({
  pathname, canonicalPath = pathname, title, description, course,
} = {}) {
  const path = cleanPath(pathname);
  const canonical = cleanPath(canonicalPath);
  if (!path || !canonical || EXCLUDED.has(path)
      || path.startsWith("/papa-life-os/") || path.startsWith("/admin/")
      || path.startsWith("/ai-boss/") || path.startsWith("/api/")) return null;
  if (typeof title !== "string" || !title.trim() ||
      typeof description !== "string" || !description.trim()) return null;
  const url = SITE + (canonical === "/" ? "/" : canonical);
  const page = {
    "@type": path === "/about-brian-keith-hill" ? "AboutPage" :
      COLLECTION_PATHS.has(path) ? "CollectionPage" : "WebPage",
    "@id": url + "#webpage",
    url, name: title.trim(), description: description.trim(),
    inLanguage: "en-US",
    isPartOf: {"@id": WEBSITE_ID},
    publisher: {"@id": ORG_ID}
  };
  const graph = [page];
  if (path === "/about-brian-keith-hill") {
    page.mainEntity = {"@id": PERSON_ID};
    graph.push({
      "@type": "Person", "@id": PERSON_ID, name: "Brian Keith Hill",
      url: SITE + "/about-brian-keith-hill",
      jobTitle: "Founder and Fatherhood Educator",
      worksFor: {"@id": ORG_ID},
      sameAs: ["https://www.linkedin.com/in/brian-hill-bossmobility/",
               "https://briankeithhill.com"]
    });
  }
  if (path === "/papa-framework") {
    page.mainEntity = {"@id": FRAMEWORK_ID};
    graph.push({
      "@type": "CreativeWork", "@id": FRAMEWORK_ID,
      name: "PAPA Framework",
      description: "Presence, Authority, Purpose, and Alignment: a practical fatherhood framework for fathers of adult children.",
      creator: {"@id": PERSON_ID},
      url: SITE + "/papa-framework",
      educationalUse: "Fatherhood education"
    });
  }
  if (course && /^\/courses\/[0-9]+$/.test(path)) {
    const courseName = typeof course.name === "string" ? course.name.trim() : "";
    const courseDescription = typeof course.description === "string" ? course.description.trim() : "";
    if (courseName && courseDescription) {
      const courseId = url + "#course";
      page.mainEntity = {"@id": courseId};
      graph.push({
        "@type": "Course", "@id": courseId,
        url, name: courseName, description: courseDescription,
        provider: {"@id": ORG_ID}
      });
    }
  }
  // Real, currently purchasable products only; never include the unfinished book.
  if (path === "/shop" || path === "/courses") {
    const items = path === "/courses"
      ? VERIFIED_PAPA_PRODUCTS.filter((item) => item.format === "audio" || item.format === "video")
      : VERIFIED_PAPA_PRODUCTS;
    const products = items.map((item, index) => ({
      "@type": "Product",
      "@id": SITE + "/shop#product-" + (index + 1),
      name: item.name,
      description: item.description,
      category: item.format,
      brand: {"@type": "Brand", name: "Papa Life"},
      url: SITE + "/shop",
      offers: {
        "@type": "Offer",
        url: item.url,
        price: item.price.toFixed(2),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        seller: {"@id": ORG_ID}
      }
    }));
    graph.push({
      "@type": "ItemList",
      "@id": SITE + "/shop#available-products",
      name: "Available Papa Life digital resources",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem", position: index + 1, item: {"@id": product["@id"]}
      }))
    });
    graph.push(...products);
  }
  const faqByPath = {
    "/why-adult-children-pull-away": [
      ["What should I say when my adult child pulls away?", "If contact is welcome, listen first. A brief acknowledgment can be more helpful than demanding an explanation: “I want to understand what this has felt like for you. I will listen without defending myself.”"],
      ["What should I avoid saying?", "Avoid guilt, repeated messages, or trying to argue away an adult child’s boundaries. Do not ask another family member to pressure them on your behalf."],
      ["Can I make my adult child reconnect?", "No. Reconciliation requires more than one person’s effort and cannot be forced. You can change how you listen, respect boundaries, and respond."]
    ],
    "/father-child-estrangement": [
      ["What can a father do when an adult child has asked for space?", "Honor the request, including any no-contact boundary. Use the time to reflect on your own choices and seek appropriate support without treating contact as something you are owed."],
      ["How do I apologize without explaining myself?", "Name the action and its impact without adding an excuse or a demand for forgiveness. Do not use the apology as a way to pressure your adult son or daughter for an immediate answer."],
      ["Does Papa Life promise reconciliation?", "No. Reconciliation cannot be guaranteed and cannot be forced. Papa Life teaches practical reflection, listening, accountability, and consistency."]
    ]
  };
  const questions = faqByPath[path];
  if (questions) graph.push({
    "@type": "FAQPage", "@id": url + "#faq",
    mainEntity: questions.map(([name, text]) => ({
      "@type": "Question", name,
      acceptedAnswer: {"@type": "Answer", text}
    }))
  });
  return {"@context": "https://schema.org", "@graph": graph};
}

export function withPapaPageSchema(html, options) {
  if (typeof html !== "string") return html;
  // Server rendering reuses the homepage template; remove the homepage page node first.
  let cleaned = html.replace(PAGE_SCRIPT, "");
  if (!/<\/head\s*>/i.test(cleaned)) return cleaned;
  if (options?.indexable === false ||
      /<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*\bnoindex\b/i.test(cleaned)) return cleaned;
  const schema = schemaForPapaPage(options);
  if (!schema) return cleaned;
  const json = JSON.stringify(schema).replace(/</g, "\\u003c");
  return cleaned.replace(/<\/head\s*>/i,
    '<script type="application/ld+json" ' + MARKER + '>' + json + '</script>\n</head>');
}
