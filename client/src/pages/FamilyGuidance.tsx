import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, HeartHandshake, MessageCircle, Search, Users, X } from "lucide-react";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import familyGuidance from "@/content/family-guidance.json";

type Audience = "parents" | "children";
type Guidance = typeof familyGuidance.parents;

const paths: Record<Audience, string> = {
  parents: "/parents-of-adult-children",
  children: "/adult-children",
};

function FamilyGuidancePage({ audience }: { audience: Audience }) {
  const guide: Guidance = familyGuidance[audience];
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase();
  const matches = useMemo(
    () => guide.questions.filter((item) =>
      (item.question + " " + item.answer).toLocaleLowerCase().includes(search)
    ),
    [guide.questions, search]
  );

  return (
    <div className="min-h-screen bg-[#fff9ec] text-[#17231c]">
      <PageMeta title={guide.pageTitle} description={guide.description} />
      <header className="border-b-4 border-[#b33a32] bg-[#fff0d0]">
        <nav className="container flex min-h-20 flex-wrap items-center justify-between gap-3 py-3" aria-label="Papa Life navigation">
          <a href="/" aria-label="Return to Papa Life homepage"><SiteLogo size="md" /></a>
          <div className="flex flex-wrap gap-2 text-sm font-bold">
            <a href="/" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 py-2 hover:bg-[#f2c230]/35">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Papa Life Home
            </a>
            <a href="/digital-twin" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#145b35] px-3 py-2 hover:bg-[#145b35] hover:text-white">
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> Brian&apos;s Digital Twin
            </a>
          </div>
        </nav>
      </header>

      <main>
        <section className="bg-[#17231c] px-4 py-12 text-white md:py-16">
          <div className="container max-w-5xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f2c230]">{guide.eyebrow}</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight md:text-5xl">{guide.headline}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/85">{guide.intro}</p>
            <p className="mt-5 max-w-3xl text-sm text-white/65">
              Explore real questions and practical answers at your own pace. This educational guide does not require a chatbot,
              microphone, account, or a connection to someone&apos;s home computer.
            </p>
          </div>
        </section>

        <section className="border-b border-[#17231c]/15 bg-[#f5ebd0] px-4 py-7" aria-label="Choose your perspective">
          <div className="container grid max-w-5xl gap-3 md:grid-cols-2">
            <a
              href={paths.parents}
              aria-current={audience === "parents" ? "page" : undefined}
              className={"flex min-h-24 items-center gap-4 rounded-xl border-2 p-5 transition hover:shadow-md " +
                (audience === "parents" ? "border-[#145b35] bg-white shadow-sm" : "border-[#17231c]/15 bg-white/65")}
            >
              <Users className="h-7 w-7 shrink-0 text-[#145b35]" aria-hidden="true" />
              <span><strong className="block text-lg">Parents of Adult Children</strong><span className="block text-sm text-[#425047]">Understand, listen, and rebuild trust</span></span>
            </a>
            <a
              href={paths.children}
              aria-current={audience === "children" ? "page" : undefined}
              className={"flex min-h-24 items-center gap-4 rounded-xl border-2 p-5 transition hover:shadow-md " +
                (audience === "children" ? "border-[#145b35] bg-white shadow-sm" : "border-[#17231c]/15 bg-white/65")}
            >
              <HeartHandshake className="h-7 w-7 shrink-0 text-[#145b35]" aria-hidden="true" />
              <span><strong className="block text-lg">Adult Children</strong><span className="block text-sm text-[#425047]">Navigate relationships and boundaries</span></span>
            </a>
          </div>
        </section>

        <section className="container max-w-5xl px-4 py-12 md:py-16" aria-labelledby="questions-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#b33a32]">Explore practical answers</p>
              <h2 id="questions-heading" className="mt-2 text-2xl font-extrabold md:text-4xl">Questions people ask</h2>
            </div>
            <span className="text-sm text-[#425047]" aria-live="polite">
              {matches.length} {matches.length === 1 ? "answer" : "answers"} available
            </span>
          </div>
          <label htmlFor="guidance-search" className="mt-7 block font-bold">What would you like help understanding?</label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-[#425047]" aria-hidden="true" />
            <input
              id="guidance-search"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={guide.search}
              className="min-h-14 w-full rounded-xl border-2 border-[#aeb9a6] bg-white py-3 pl-12 pr-5 text-base text-[#17231c] outline-offset-4 focus:border-[#145b35]"
            />
          </div>
          <p className="mt-2 text-sm text-[#425047]">Search these existing answers instantly. No message is sent to an AI service.</p>

          <div className="mt-8 grid gap-5">
            {matches.map(({ question, answer }) => (
              <article key={question} className="rounded-xl border border-[#17231c]/15 bg-white p-6 shadow-sm md:p-8">
                <h3 className="text-xl font-extrabold leading-snug md:text-2xl">{question}</h3>
                <p className="mt-3 max-w-4xl leading-8 text-[#314239]">{answer}</p>
              </article>
            ))}
            {matches.length === 0 && (
              <div className="rounded-xl border border-[#17231c]/20 bg-white p-8">
                <h3 className="text-xl font-extrabold">No matching questions yet</h3>
                <p className="mt-2 text-[#425047]">Try a shorter term such as trust, boundaries, father, daughter, communication, or apology.</p>
                <button type="button" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#145b35] px-5 py-2 font-bold text-white" onClick={() => setQuery("")}>
                  <X className="h-4 w-4" aria-hidden="true" /> Show all questions
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#e9e7d7] px-4 py-12" aria-labelledby="resources-heading">
          <div className="container max-w-5xl">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-[#145b35]" aria-hidden="true" />
              <h2 id="resources-heading" className="text-2xl font-extrabold md:text-3xl">Continue with Papa Life resources</h2>
            </div>
            <p className="mt-3 max-w-3xl text-[#425047]">These existing pages offer more context. Browse only what is useful to you.</p>
            <ul className="mt-7 grid gap-3 md:grid-cols-2">
              {guide.related.map(({ label, href }) => (
                <li key={href}>
                  <a className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-[#17231c]/15 bg-white px-5 py-3 font-bold text-[#145b35] hover:border-[#145b35]" href={href}>
                    {label}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-xl bg-[#17231c] p-6 text-white">
              <h3 className="text-xl font-extrabold">Prefer to explore Brian&apos;s Digital Twin?</h3>
              <p className="mt-2 max-w-3xl text-white/75">The Digital Twin is an optional AI experience, not human Brian. It is separate from these website-hosted answers.</p>
              <a href="/digital-twin" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#f2c230] px-5 py-3 font-extrabold text-[#17231c] hover:bg-white">
                Meet Brian&apos;s Digital Twin <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-[#17231c] px-4 py-7 text-sm text-white/75">
        <div className="container flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <p>© Papa Life · Guidance is educational, not licensed mental health treatment or a guarantee of reconciliation.</p>
          <a href="/privacy-policy" className="font-bold text-[#f2c230] hover:underline">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}

export function ParentsOfAdultChildrenPage() {
  return <FamilyGuidancePage audience="parents" />;
}

export function AdultChildrenPage() {
  return <FamilyGuidancePage audience="children" />;
}
