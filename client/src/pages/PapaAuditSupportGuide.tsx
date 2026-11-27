import { PageMeta } from "@/components/PageMeta";
import { supportGuides } from "@/content/papa-support-guides.json";
import { useLocation } from "wouter";

export default function PapaAuditSupportGuide() {
  const [pathname] = useLocation();
  const guide = supportGuides.find((entry) => entry.path === pathname.replace(/\/+$/, ""));
  if (!guide) return null;
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <PageMeta title={guide.title} description={guide.description} canonicalPath={guide.path} />
      <a href="/" className="font-semibold underline">Papa Life home</a>
      <h1 className="mt-5 text-4xl font-bold">{guide.headline}</h1>
      <p className="mt-4 text-lg">{guide.intro}</p>
      {guide.sections.map(([heading, body]) => (
        <section key={heading} className="mt-8">
          <h2 className="text-2xl font-bold">{heading}</h2>
          <p className="mt-2">{body}</p>
        </section>
      ))}
      <nav aria-label="Next steps" className="mt-8 flex flex-wrap gap-4 underline">
        <a href="/relationship-assessment">Try the 2-Minute Fatherhood Check-In</a>
        <a href="/shop">Explore lessons and prices</a>
        <a href="/refund-policy">Read the 7-day refund policy</a>
      </nav>
    </main>
  );
}
