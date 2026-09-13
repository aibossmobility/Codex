import { PageMeta } from "@/components/PageMeta";
import { SiteLogoStacked } from "@/components/SiteLogo";

const groups = [
  {
    title: "Start Here",
    links: [
      ["Papa Life Home", "/"],
      ["Welcome to Papa Life", "/welcome-to-papa-life"],
      ["2-Minute Fatherhood Check-In", "/marlee-assessment"],
      ["Relationship Assessment", "/relationship-assessment"],
      ["PAPA Framework", "/papa-framework"],
      ["Papa Journey", "/papa-journey"],
      ["About Brian Keith Hill", "/about-brian-keith-hill"],
    ],
  },
  {
    title: "Relationship Help",
    links: [
      ["Adult Son Relationship Help", "/adult-son-relationship"],
      ["Adult Daughter Relationship Help", "/adult-daughter-relationship"],
      ["Why Adult Children Pull Away", "/why-adult-children-pull-away"],
      ["Father-Child Estrangement Help", "/father-child-estrangement"],
    ],
  },
  {
    title: "Learn & Connect",
    links: [
      ["Courses", "/courses"],
      ["Papa First Lesson", "/papa-first-lesson"],
      ["Papa Intro", "/papa-intro"],
      ["Papa Life AI Coach", "/ai-coach"],
      ["Resources", "/resources"],
      ["Books", "/books"],
      ["Podcast", "/podcast"],
      ["Tuesday", "/tuesday"],
      ["Tuesday Live", "/tuesday-live"],
      ["Membership", "/membership"],
      ["Shop", "/shop"],
      ["Booking", "/booking"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Policies",
    links: [
      ["Privacy Policy", "/privacy-policy"],
      ["Terms of Service", "/terms-of-service"],
    ],
  },
];

export default function SiteDirectory() {
  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <PageMeta
        title="Papa Life Site Directory | Papa Life Coach"
        description="A public directory of Papa Life Coach pages and resources for fathers of adult children."
        canonicalPath="/site-directory"
      />
      <header className="border-b border-white/10 bg-black/95 px-4 py-5">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <a href="/" aria-label="Papa Life home"><SiteLogoStacked size="sm" /></a>
          <div>
            <h1 className="text-2xl font-bold">Papa Life Site Directory</h1>
            <p className="text-sm text-gray-400">All public Papa Life pages in one place.</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-8">
        {groups.map((group) => (
          <section key={group.title} className="rounded-2xl border border-white/10 bg-[#111] p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-yellow">{group.title}</h2>
            <div className="flex flex-col divide-y divide-white/10">
              {group.links.map(([label, path]) => (
                <a key={path} href={path} className="py-3 font-medium hover:text-brand-yellow">
                  {label}<span className="ml-2 text-xs font-normal text-gray-600">papalifecoach.com{path}</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
