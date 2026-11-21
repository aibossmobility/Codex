import { ArrowLeft, ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";

const research = [
  {
    title: "Fatherhood across the adult life course",
    reference: "Majeske and colleagues (2026), Family Gerontology, Fatherhood, and Masculinity: Enduring Impacts of Fathers and Adult Children",
    summary: "A scholarly review highlighting father–adult child relationships across adulthood and the need for more focused research in this area.",
    url: "https://doi.org/10.1111/jftr.70068",
  },
  {
    title: "Human connection and relational well-being",
    reference: "Way, Ali, Gilligan and Noguera, editors (2018), The Crisis of Connection: Roots, Consequences, and Solutions",
    summary: "An interdisciplinary collection about connection, empathy, social isolation and belonging. It offers broader context rather than direct evidence about adult-fatherhood education.",
    url: "https://nyupress.org/9781479802784/the-crisis-of-connection/",
  },
  {
    title: "Parent–adult child estrangement",
    reference: "Reczek, Stacey and Thomeer (2023), Parent–Adult Child Estrangement in the United States by Gender, Race/Ethnicity, and Sexuality",
    summary: "A peer-reviewed longitudinal study reporting that 26% of surveyed adult children had experienced a period of estrangement from fathers; that is not a measure of fathers currently estranged.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10254574/",
  },
];

export default function PapaResearchFoundation() {
  const [form, setForm] = useState({ name: "", organization: "", email: "", interest: "resources", website: "" });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !consent) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/papa/institutional-inquiry", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, consent_email: consent, source: "research-foundation" }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Request not received. Please try again.");
      setEmailStatus(result.email_status);
      const w = window as Window & { gtag?: (...args: unknown[]) => void };
      w.gtag?.("event", "papa_institutional_request_submitted", { funnel_name: "papa_institutional" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request could not be saved. Please try again.");
    } finally { setSubmitting(false); }
  };
  return <div className="min-h-screen bg-[#faf5e9] text-[#17231c]">
    <PageMeta title="Research Foundation & Statement of Need | Papa Life" description="Read the scholarly research context behind Papa Life's educational work with fathers of adult children." canonicalPath="/research-foundation" />
    <header className="border-b-4 border-[#b63b31] bg-[#fff0d0]"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4"><a href="/"><SiteLogo size="md" /></a><a href="/house/library" className="inline-flex items-center gap-2 font-bold text-[#145b35] hover:underline"><ArrowLeft size={17}/> Reading Nook</a></div></header>
    <main>
      <section className="bg-[#f3e6c7] px-5 py-12"><div className="mx-auto max-w-4xl"><p className="font-bold uppercase tracking-widest text-[#145b35]">Papa Life · Fatherhood Transformation Services</p><h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">Research Foundation & Statement of Need</h1><p className="mt-5 text-lg leading-relaxed">Fatherhood continues when children become adults. The relationships, challenges, and possibilities of this season deserve thoughtful attention.</p><p className="mt-4 font-semibold">F.O.A.D.C. — Fathers of Adult Children · Brian Keith Hill, Founder</p></div></section>
      <div className="mx-auto max-w-4xl space-y-11 px-5 py-12">
        <section className="space-y-3"><h2 className="text-2xl font-black">Why this work matters</h2><p className="leading-relaxed">Father–adult child relationships change over the life course. Differences in expectations, evolving responsibilities, communication difficulties, distance and estrangement can affect fathers and their grown children. Papa Life seeks to offer practical education and reflection to fathers in this often-overlooked season.</p><p className="leading-relaxed">Independent research establishes a scholarly foundation for studying these challenges. The sources below help explain the need for this field of work; they do not evaluate or endorse Papa Life.</p></section>
        <section className="space-y-5"><h2 className="text-2xl font-black">Research foundations</h2>{research.map((r,i)=><article key={r.url} className="rounded-xl border border-[#dbc894] bg-white p-6 shadow-sm"><p className="text-sm font-bold text-[#145b35]">RESEARCH {i+1}</p><h3 className="mt-2 text-xl font-extrabold">{r.title}</h3><p className="mt-2 text-sm italic text-[#52604f]">{r.reference}</p><p className="mt-3 leading-relaxed">{r.summary}</p><a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 font-bold text-[#145b35] underline">{r.url.includes("pmc.")?"Read the original study":"View the research publication"} <ExternalLink size={15}/></a></article>)}</section>
        <section className="space-y-4"><h2 className="text-2xl font-black">Papa Life's educational response</h2><p className="leading-relaxed">Papa Life provides self-paced written lessons, audio, video presentations, reflection exercises and guided workshop or webinar learning experiences. Its original PAPA framework helps fathers reflect on communication, personal responsibility, values, and boundaries.</p><div className="grid gap-3 sm:grid-cols-2">{[["Presence","Listen and remain emotionally available."],["Authority","Take responsibility for yourself rather than control another adult."],["Purpose","Clarify the values guiding your fatherhood."],["Alignment","Make everyday actions consistent with your values."]].map(([title,desc])=><div key={title} className="rounded-lg bg-[#eaf0e4] p-5"><h3 className="font-extrabold text-[#145b35]">{title}</h3><p className="mt-1 text-sm">{desc}</p></div>)}</div></section>
        <section className="rounded-xl border-l-4 border-[#b63b31] bg-white p-6"><h2 className="text-xl font-black">Research integrity</h2><p className="mt-3 leading-relaxed">Papa Life draws on independent research to explain a need for adult-fatherhood education. Brian Keith Hill developed the PAPA framework independently. The cited authors and institutions did not test, scientifically validate, partner with, or endorse Papa Life. Its resources are educational and nonclinical, and reconciliation is never guaranteed.</p></section>
        <section className="rounded-xl bg-[#173c2b] p-7 text-white"><BookOpen className="mb-3 text-[#f2c44a]" size={30}/><h2 className="text-2xl font-black">Institutions and community organizations</h2><p className="mt-3 leading-relaxed">Schools, universities, nonprofits, churches, fatherhood initiatives, senior centers, and community leaders are welcome to explore opportunities to make adult-fatherhood education more accessible.</p><div className="mt-5 rounded-lg border border-white/20 p-5">
            <h3 className="text-xl font-bold">See the resources now, or request the institutional information</h3>
            <p className="mt-2 text-sm text-white/85">The research and current learning materials are available immediately. No comment, keyword, or waiting for a direct message is necessary.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a className="rounded-md bg-[#f2c44a] px-4 py-3 font-bold text-[#17231c]" href="/shop?from=institutional-research">View existing learning materials <ArrowRight className="inline" size={16}/></a>
              <a className="rounded-md border border-white/30 px-4 py-3 font-bold text-white" href="/house/library">Explore the reading library</a>
            </div>
            {emailStatus !== null ? <div role="status" className="mt-6 rounded-lg bg-white p-5 text-[#17231c]">
              <p className="font-extrabold">Your request has been recorded.</p>
              <p className="mt-2">{emailStatus === "queued" || emailStatus === "already_queued" ? "The requested information has been queued to your email address. You can continue exploring right now." : "The information is available below while email delivery is being checked. You do not need to submit another request."}</p>
              <div className="mt-3 flex flex-wrap gap-3"><a className="font-bold text-[#145b35] underline" href="/shop">Browse lesson options</a><a className="font-bold text-[#145b35] underline" href="/research-foundation">Read the Research Foundation</a></div>
            </div> : <form onSubmit={submit} className="mt-6 space-y-4">
              <p className="text-sm">To ask Papa Life for the two-part institutional review materials or a follow-up conversation, send one short request:</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold">Your name<input required autoComplete="name" maxLength={120} value={form.name} onChange={e=>setForm(prev=>({...prev,name:e.target.value}))} className="mt-1 w-full rounded-md border border-white/30 bg-white p-3 text-[#17231c]"/></label>
                <label className="block text-sm font-bold">Organization<input required autoComplete="organization" maxLength={160} value={form.organization} onChange={e=>setForm(prev=>({...prev,organization:e.target.value}))} className="mt-1 w-full rounded-md border border-white/30 bg-white p-3 text-[#17231c]"/></label>
              </div>
              <label className="block text-sm font-bold">Email for the reply<input required type="email" autoComplete="email" maxLength={250} value={form.email} onChange={e=>setForm(prev=>({...prev,email:e.target.value}))} className="mt-1 w-full rounded-md border border-white/30 bg-white p-3 text-[#17231c]"/></label>
              <label className="block text-sm font-bold">I'm interested in<select value={form.interest} onChange={e=>setForm(prev=>({...prev,interest:e.target.value}))} className="mt-1 w-full rounded-md border border-white/30 bg-white p-3 text-[#17231c]"><option value="resources">Curriculum and research overview</option><option value="curriculum">Workshop and webinar demonstrations</option><option value="partnership">Institutional partnership</option><option value="conversation">A conversation with Brian</option></select></label>
              <label className="hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>setForm(prev=>({...prev,website:e.target.value}))}/></label>
              <label className="flex gap-3 text-sm"><input required type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1"/><span>I request an email response about my selected interest. I can ask Papa Life to stop contacting me at any time. <a className="underline" href="/privacy-policy">Privacy policy</a>.</span></label>
              {error && <p role="alert" className="text-[#ffd27a]">{error}</p>}
              <button type="submit" disabled={submitting || !consent} className="rounded-md bg-[#f2c44a] px-5 py-3 font-extrabold text-[#17231c] disabled:opacity-60">{submitting ? "Sending your request…" : "Send my institutional request"} <ArrowRight className="inline" size={17}/></button>
            </form>}
          </div></section>
        <footer className="border-t border-[#dbc894] pt-7 text-center"><p className="text-lg font-semibold italic">“As long as you're both alive, it's never too late.”</p><p className="mt-3 text-sm">Brian Keith Hill · Founder, Papa Life · <a href="/shop" className="underline">Explore lessons</a></p></footer>
      </div>
    </main>
  </div>;
}
