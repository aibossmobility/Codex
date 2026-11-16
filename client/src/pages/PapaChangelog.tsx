import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";

const entries = [
  {
    date: "November 15, 2026",
    title: "Available Papa Life resource information",
    details: "Clarified the existing one-time audio, manuscript and video prices, direct purchase paths, and the seven-day digital-product refund request window."
  },
  {
    date: "October 15, 2026",
    title: "Digital-product refund policy",
    details: "The published policy took effect, including a seven-calendar-day window for requesting a full refund on Papa Life digital products."
  }
] as const;

export default function PapaChangelog() {
  return <div className="min-h-screen bg-[#fffaf0] text-[#17231c]">
    <PageMeta title="Papa Life Updates | Brian Keith Hill" description="Dated updates to Papa Life learning resources and buying information from Brian Keith Hill." canonicalPath="/changelog" />
    <header className="border-b border-[#145b35]/20 bg-[#f2c230] p-5"><div className="container"><a href="/" aria-label="Papa Life home"><SiteLogo size="md"/></a></div></header>
    <main className="container mx-auto max-w-3xl py-12">
      <p className="text-sm font-black uppercase tracking-widest text-[#145b35]">A public record by Brian Keith Hill</p>
      <h1 className="mt-3 text-4xl font-extrabold">Papa Life updates</h1>
      <p className="mt-4 text-lg">What changed on the website and in its learning-resource information. This is not a customer review or usage count.</p>
      <ol className="mt-9 space-y-6">{entries.map(entry=><li key={entry.date} className="rounded-xl border border-[#145b35]/30 bg-white p-6"><time className="text-sm font-bold text-[#145b35]">{entry.date}</time><h2 className="mt-2 text-xl font-extrabold">{entry.title}</h2><p className="mt-3">{entry.details}</p><p className="mt-3 text-sm font-bold">Brian Keith Hill · Papa Life</p></li>)}</ol>
      <div className="mt-9 flex gap-6"><a href="/shop" className="font-bold text-[#145b35] underline">Available lessons and prices</a><a href="/refund-policy" className="font-bold text-[#145b35] underline">Refund policy</a></div>
    </main>
  </div>;
}
