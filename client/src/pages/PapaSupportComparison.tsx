import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";

const questions = [
  {question: "Can Papa Life lessons replace therapy?", answer: "No. Papa Life lessons are self-paced education, not treatment. A licensed mental health professional can assess individual circumstances and provide appropriate care."},
  {question: "When might a book be enough?", answer: "A book can be useful when you want to learn privately and have time to reflect. It does not respond to your individual situation."},
  {question: "What can I do before paying for anything?", answer: "Start with the free 2-Minute Fatherhood Check-In. Notice one pattern in your relationship and choose one respectful step."},
];

export default function PapaSupportComparison() {
  return <div className="min-h-screen bg-[#fff9e9] text-[#17231c]">
    <PageMeta title="Papa Life Lessons vs Therapy vs Books | Compare Support" description="Compare Papa Life self-paced lessons, a relationship book and professional counseling. Learn what each offers and begin with a free fatherhood check-in." canonicalPath="/papa-life-vs-therapy" jsonLd={{"@context":"https://schema.org","@type":"FAQPage",mainEntity:questions.map(item=>({"@type":"Question",name:item.question,acceptedAnswer:{"@type":"Answer",text:item.answer}}))}} />
    <header className="border-b border-[#145b35]/20 bg-[#f2c230] p-4"><a href="/" aria-label="Papa Life home"><SiteLogo size="md" /></a></header>
    <main className="mx-auto max-w-4xl px-5 py-12">
      <p className="font-bold text-[#145b35]">For fathers of adult children</p>
      <h1 className="mt-3 text-3xl font-extrabold md:text-5xl">Papa Life lessons, therapy, or a book?</h1>
      <p className="mt-5 text-lg">Different kinds of help do different things. You can choose what fits your situation without committing to a purchase.</p>
      <section className="mt-9 grid gap-5 md:grid-cols-3" aria-label="Support options compared">
        <article className="rounded-xl border-2 border-[#145b35] bg-white p-6"><h2 className="text-xl font-bold">Self-paced lessons</h2><p className="mt-3">Papa Life offers original audio and written lessons about listening, apology, boundaries, and consistency. You choose when to learn. These lessons do not guarantee reconnection or provide individualized treatment.</p><a className="mt-4 inline-block font-bold text-[#145b35] underline" href="/shop">See lessons and prices</a></article>
        <article className="rounded-xl border-2 border-[#145b35] bg-white p-6"><h2 className="text-xl font-bold">Professional counseling</h2><p className="mt-3">A qualified mental health professional can assess your circumstances and provide individualized support. Counseling may be especially important when safety, serious distress, or complex patterns require professional care.</p></article>
        <article className="rounded-xl border-2 border-[#145b35] bg-white p-6"><h2 className="text-xl font-bold">A relationship book</h2><p className="mt-3">A book can offer ideas and private reflection at your own pace. Its guidance stays the same regardless of your circumstances. It may be enough when your goal is learning, not personalized support.</p></article>
      </section>
      <section className="mt-10"><h2 className="text-2xl font-bold">Common questions</h2><div className="mt-4 space-y-4">{questions.map(item=><article key={item.question}><h3 className="font-bold">{item.question}</h3><p>{item.answer}</p></article>)}</div></section>
      <div className="mt-10 rounded-xl border border-[#145b35] bg-white p-6"><h2 className="text-2xl font-bold">Start without paying</h2><p className="mt-2">The free 2-Minute Fatherhood Check-In can help you notice where the relationship stands and choose one practical next step.</p><a className="mt-4 inline-block rounded-lg bg-[#145b35] px-5 py-3 font-bold text-white" href="/marlee-assessment">Begin the 2-Minute Fatherhood Check-In</a></div>
    </main>
    <footer className="border-t border-[#145b35]/20 p-6 text-center"><a className="font-bold text-[#145b35] underline" href="/">Back to Papa Life</a></footer>
  </div>;
}
