import { Button } from "@/components/ui/button";
import { SiteLogoStacked } from "@/components/SiteLogo";
import { PageMeta } from "@/components/PageMeta";
import { ASSESSMENT_CTA, type SeoArticle } from "@/content/papa-seo-content";
import { brianKeithHillHeadshot } from "@/lib/site-assets";
import { ArrowRight } from "lucide-react";

type PapaSeoArticlePageProps = {
  page: SeoArticle;
};

export default function PapaSeoArticlePage({ page }: PapaSeoArticlePageProps) {
  const isBrianProfile = page.slug === "/about-brian-keith-hill";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PageMeta
        title={page.title}
        description={page.description}
        keywords={page.keywords}
        canonicalPath={page.slug}
        jsonLd={page.jsonLd}
      />

      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="container max-w-3xl mx-auto px-4 py-6 flex justify-center">
          <a href="/" className="inline-block">
            <SiteLogoStacked size="sm" />
          </a>
        </div>
      </header>

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-10 md:py-14">
        <article className="space-y-10">
          <header className={isBrianProfile ? "grid items-center gap-7 md:grid-cols-[220px_1fr]" : "space-y-4"}>
            {isBrianProfile ? (
              <img
                src={brianKeithHillHeadshot}
                alt="Brian Keith Hill, founder of Boss Mobility and Papa Life"
                className="aspect-square w-full rounded-2xl border border-white/10 object-cover object-top shadow-2xl"
              />
            ) : null}
            <div className="space-y-4">
              {isBrianProfile ? <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-yellow">Meet the founder</p> : null}
              <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                {page.headline}
              </h1>
              <p className="text-lg md:text-xl text-primary font-medium">{page.subheadline}</p>
            </div>
          </header>

          <div className="space-y-10 text-gray-300 text-base md:text-lg leading-relaxed">
            {page.sections.map((section, index) => (
              <section key={index} className="space-y-4">
                {section.heading ? (
                  <h2 className="font-heading text-2xl md:text-3xl font-bold text-white">{section.heading}</h2>
                ) : null}
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 32)}>{p}</p>
                ))}
              </section>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10">
            <Button
              asChild
              className="bg-brand-yellow text-black hover:bg-brand-yellow/90 font-bold rounded-full px-8 py-6 text-base"
            >
              <a href={ASSESSMENT_CTA.href}>
                {ASSESSMENT_CTA.label}
                <ArrowRight className="w-4 h-4 ml-2 inline" />
              </a>
            </Button>
          </div>
        </article>
      </main>

      <footer className="border-t border-white/10 bg-black/50">
        <div className="container mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8 text-sm text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Papa Life was founded by Brian Keith Hill through Boss Mobility.</p>
          <a href="/" className="font-semibold text-brand-yellow hover:text-white">Return to Papa Life</a>
        </div>
      </footer>
    </div>
  );
}
