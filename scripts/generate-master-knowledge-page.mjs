import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve("data/Papa_Life_Master_Skill.md");
const outputDir = path.resolve("client/public/papa-life-master-knowledge-center");
const outputPath = path.join(outputDir, "index.html");
const canonicalUrl = "https://bossmobilelifecoach.com/papa-life-master-knowledge-center";

const markdown = fs.readFileSync(sourcePath, "utf8").trimEnd();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === '"') return "&quot;";
    return "&#39;";
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderMarkdownToHtml(source) {
  const lines = source.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let listItems = [];
  let inCode = false;
  let codeLines = [];
  const headingIds = new Map();

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length) return;
    html.push(`<ul>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    listItems = [];
  }

  function uniqueHeadingId(text) {
    const base = slugify(text) || "section";
    const count = headingIds.get(base) || 0;
    headingIds.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length, 3);
      const text = heading[2].trim();
      const id = uniqueHeadingId(text);
      html.push(`<h${level} id="${id}">${inlineMarkdown(text)}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      listItems.push(bullet[1].trim());
      continue;
    }

    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      listItems.push(numbered[1].trim());
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  if (inCode) html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);

  return html.join("\n");
}

const jumpLinks = Array.from(markdown.matchAll(/^##\s+(.+)$/gm)).map((match) => {
  const label = match[1].trim();
  return { label, id: slugify(label) || "section" };
});

const contentHtml = renderMarkdownToHtml(markdown);

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Papa Life Master Knowledge Center | Boss Mobile Life Coach</title>
    <meta name="description" content="The Papa Life Master Knowledge Center contains the complete Papa Life Master Skill v1.0.1 for faith-based fatherhood content, coaching, and AI operations." />
    <meta name="keywords" content="Papa Life Master Skill, fatherhood coaching, PAPA Framework, fathers of adult children, Brian Keith Hill, Boss Mobile Life Coach" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="Papa Life Master Knowledge Center" />
    <meta property="og:description" content="Complete Papa Life Master Skill v1.0.1, including brand voice, modules, templates, examples, prompts, and documentation." />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <style>
      :root {
        color-scheme: dark;
        --pl-black: #050505;
        --pl-panel: #10100f;
        --pl-gold: #f6c74a;
        --pl-red: #d94032;
        --pl-cream: #fff8e6;
        --pl-muted: #c9c2ad;
        --pl-border: rgba(246, 199, 74, 0.24);
      }

      * {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        background:
          radial-gradient(circle at 18% 0%, rgba(246, 199, 74, 0.12), transparent 30rem),
          linear-gradient(180deg, #0b0b09 0%, var(--pl-black) 34rem);
        color: var(--pl-cream);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.65;
      }

      a {
        color: var(--pl-gold);
      }

      .page {
        width: min(1120px, calc(100% - 32px));
        margin: 0 auto;
        padding: 48px 0 72px;
      }

      .hero {
        padding: 48px 0 30px;
      }

      .eyebrow {
        margin: 0 0 14px;
        color: var(--pl-gold);
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1 {
        max-width: 920px;
        margin: 0;
        font-size: clamp(2.5rem, 7vw, 5.6rem);
        line-height: 0.98;
      }

      .lede {
        max-width: 780px;
        margin: 22px 0 0;
        color: var(--pl-muted);
        font-size: 1.15rem;
      }

      .status {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin: 32px 0 34px;
        padding: 18px;
        border: 1px solid var(--pl-border);
        background: rgba(16, 16, 15, 0.86);
      }

      .status strong {
        display: block;
        color: var(--pl-gold);
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .status span {
        display: block;
        margin-top: 4px;
        color: var(--pl-cream);
        font-weight: 700;
      }

      .jump-links {
        margin: 0 0 34px;
        padding: 20px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(0, 0, 0, 0.24);
      }

      .jump-links h2 {
        margin: 0 0 12px;
        font-size: 1rem;
        color: var(--pl-gold);
      }

      .jump-links nav {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .jump-links a {
        display: inline-flex;
        align-items: center;
        min-height: 36px;
        padding: 6px 10px;
        border: 1px solid rgba(246, 199, 74, 0.28);
        color: var(--pl-cream);
        text-decoration: none;
      }

      .content {
        padding: 34px;
        border: 1px solid var(--pl-border);
        background: rgba(16, 16, 15, 0.92);
      }

      .content h1,
      .content h2,
      .content h3 {
        color: var(--pl-gold);
        line-height: 1.15;
      }

      .content h1 {
        margin-top: 0;
        font-size: clamp(2rem, 5vw, 3rem);
      }

      .content h2 {
        margin-top: 2.2em;
        padding-top: 0.7em;
        border-top: 1px solid rgba(246, 199, 74, 0.18);
        font-size: 1.55rem;
      }

      .content h3 {
        margin-top: 1.6em;
        font-size: 1.15rem;
      }

      .content p,
      .content li {
        color: #f0ead7;
      }

      .content ul {
        padding-left: 1.35rem;
      }

      .content code {
        padding: 0.12rem 0.3rem;
        background: rgba(246, 199, 74, 0.13);
        color: #ffe89a;
      }

      .content pre {
        overflow-x: auto;
        padding: 18px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: #070707;
      }

      .footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 14px;
        padding-top: 32px;
        color: var(--pl-muted);
        font-size: 0.92rem;
      }

      @media (max-width: 760px) {
        .page {
          width: min(100% - 24px, 1120px);
          padding-top: 22px;
        }

        .status {
          grid-template-columns: 1fr;
        }

        .content {
          padding: 22px;
        }
      }
    </style>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": "Papa Life Master Knowledge Center",
        "description": "Complete Papa Life Master Skill v1.0.1 for fatherhood content, coaching, and AI operations.",
        "url": "${canonicalUrl}",
        "author": {
          "@type": "Person",
          "name": "Brian Keith Hill"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Boss Mobile Life Coach"
        },
        "dateModified": "2026-07-02"
      }
    </script>
  </head>
  <body>
    <main class="page">
      <section class="hero" aria-labelledby="page-title">
        <p class="eyebrow">Papa Life Resource</p>
        <h1 id="page-title">Papa Life Master Knowledge Center</h1>
        <p class="lede">The complete Papa Life Master Skill v1.0.1 for faith-based fatherhood content, coaching, marketing, community work, and AI operations with the Brian Keith Hill / Papa Life voice.</p>
      </section>

      <section class="status" aria-label="Knowledge center status">
        <div><strong>Version</strong><span>v1.0.1</span></div>
        <div><strong>Status</strong><span>Production-ready</span></div>
        <div><strong>Framework</strong><span>Purpose, Authority, Presence, Alignment</span></div>
        <div><strong>Source</strong><span>Papa_Life_Master_Skill.md</span></div>
      </section>

      <section class="jump-links" aria-labelledby="jump-title">
        <h2 id="jump-title">Section Links</h2>
        <nav aria-label="Jump to section">
          ${jumpLinks.map((link) => `<a href="#${escapeHtml(link.id)}">${escapeHtml(link.label)}</a>`).join("\n          ")}
        </nav>
      </section>

      <article class="content">
${contentHtml}
      </article>

      <footer class="footer">
        <span>Boss Mobile Life Coach</span>
        <a href="/">Return to Papa Life</a>
      </footer>
    </main>
  </body>
</html>
`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, html);
console.log(`Generated ${outputPath}`);
