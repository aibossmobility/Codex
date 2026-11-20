import { ArrowLeft, ArrowRight, BookOpen, ExternalLink } from "lucide-react";
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
        <section className="rounded-xl bg-[#173c2b] p-7 text-white"><BookOpen className="mb-3 text-[#f2c44a]" size={30}/><h2 className="text-2xl font-black">Institutions and community organizations</h2><p className="mt-3 leading-relaxed">Schools, universities, nonprofits, churches, fatherhood initiatives, senior centers, and community leaders are welcome to explore opportunities to make adult-fatherhood education more accessible.</p><a href="mailto:brian@papalifecoach.com?subject=Papa%20Life%20Institutional%20Partnership" className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#f2c44a] px-5 py-3 font-bold text-[#17231c]">Request institutional information <ArrowRight size={17}/></a></section>
        <footer className="border-t border-[#dbc894] pt-7 text-center"><p className="text-lg font-semibold italic">“As long as you're both alive, it's never too late.”</p><p className="mt-3 text-sm">Brian Keith Hill · Founder, Papa Life · <a href="/shop" className="underline">Explore lessons</a></p></footer>
      </div>
    </main>
  </div>;
}
