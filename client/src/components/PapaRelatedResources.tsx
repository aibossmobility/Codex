import auditSEO from "@/content/papa-seo-audit-overrides.json";

type RelatedPath = keyof typeof auditSEO.relatedLinks;

export function PapaRelatedResources({ pathname }: { pathname: RelatedPath }) {
  return (
    <section className="my-8 rounded-xl border border-white/15 p-5">
      <h2 className="text-xl font-bold">Related fatherhood resources</h2>
      <ul className="mt-3 space-y-2">
        {auditSEO.relatedLinks[pathname].map(([name, href]) => (
          <li key={href}><a className="text-brand-yellow underline" href={href}>{name}</a></li>
        ))}
      </ul>
    </section>
  );
}
