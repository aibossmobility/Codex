import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { ArrowRight, CheckCircle2, Heart, LockKeyhole, Play, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Offer = {
  code: string;
  canonical_name: string;
  format: string;
  module_number: number | null;
  member_price_display: string;
  public_price_display: string;
  public_checkout_url: string | null;
};

export default function Shop() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/public/commerce-catalog")
      .then((r) => r.json())
      .then((data) => setOffers((data.products || []).filter((offer: Offer) => offer.code !== "membership.community.monthly")));
  }, []);

  const visible = useMemo(() => offers.filter((offer) => filter === "all" || offer.format === filter), [offers, filter]);

  return (
    <div className="min-h-screen bg-[#f4dea0] text-[#17231c]">
      <PageMeta title="Papa Life Shop — Choose Membership or Buy Permanently" description="Buy Papa Life audio lessons, manuscripts, and complete programs—with or without membership." />
      <nav className="border-b border-[#17231c]/20 bg-[#f2c230]">
        <div className="container flex min-h-20 items-center justify-between gap-5 py-3">
          <a href="/"><SiteLogo size="md" /></a>
          <div className="flex items-center gap-3">
            <a href="/member-login" className="text-sm font-bold hover:text-[#b33a32]">Member Login</a>
            <a href="/join" className="rounded-md bg-[#145b35] px-4 py-3 text-sm font-extrabold text-white">Join for $4.99</a>
          </div>
        </div>
      </nav>

      <header className="bg-[#145b35] text-white">
        <div className="container grid items-center gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
          <div>
            <Heart className="h-12 w-12 fill-[#f2c230] text-[#f2c230]" />
            <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[#f2c230]">Love is still present—even when the relationship feels distant</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">You are not here because you stopped loving your child.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">You are here because loving an adult child can be complicated—and you want to respond with greater wisdom, patience, and understanding. Papa Life offers compassionate next steps, not pressure.</p>
          </div>
          <img src="/images/papa-life-heart-hero.png" alt="A father listening to his adult daughter, reconnecting with his adult son, and reflecting with hope" className="aspect-[16/9] w-full rounded-2xl border-4 border-[#f2c230] object-cover shadow-2xl" />
        </div>
      </header>

      <section className="bg-[#b33a32] py-8 text-white">
        <div className="container grid gap-5 md:grid-cols-2">
          <div className="rounded-lg bg-white/10 p-6"><h2 className="text-2xl font-extrabold">Buy Without Membership</h2><p className="mt-2 text-white/80">Pay the regular one-time price and keep permanent access to what you purchase.</p></div>
          <div className="rounded-lg bg-[#f2c230] p-6 text-[#17231c]"><h2 className="text-2xl font-extrabold">Join and Save</h2><p className="mt-2">Get Course 11 streaming immediately and unlock member pricing on permanent purchases.</p><a href="/join" className="mt-4 inline-flex items-center gap-2 font-extrabold text-[#145b35]">Join for $4.99 monthly <ArrowRight className="h-4 w-4" /></a></div>
        </div>
      </section>

      <section className="bg-[#f8f0db] py-14">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#b33a32]">The heart behind every choice</p>
            <h2 className="mt-3 text-3xl font-extrabold md:text-5xl">Before you choose a product, hear why Papa Life exists.</h2>
            <p className="mt-4 text-lg leading-relaxed text-[#5b655e]">Every lesson represents a real moment: a father trying to listen differently, apologize without defending himself, or become safer for an adult child to talk to.</p>
          </div>
          <div className="mt-9 grid gap-6 lg:grid-cols-2">
            <article className="overflow-hidden rounded-2xl border-4 border-[#145b35] bg-[#fffdf4]">
              <a
                href="https://www.youtube.com/watch?v=bwroJYT0kaM"
                target="_blank"
                rel="noreferrer"
                className="group relative block aspect-video overflow-hidden bg-[#17231c]"
                aria-label='Play Brian Keith Hill’s Papa Life introduction on YouTube'
              >
                <img src="https://img.youtube.com/vi/bwroJYT0kaM/maxresdefault.jpg" alt="Papa Life introduction video" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/30">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-[#b33a32] text-white shadow-2xl"><Play className="ml-1 h-10 w-10 fill-current" /></span>
                </span>
                <span className="absolute bottom-4 left-4 rounded-full bg-[#17231c]/90 px-4 py-2 text-sm font-extrabold text-white">Watch Brian introduce Papa Life</span>
              </a>
              <div className="p-6">
                <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-[#b33a32]"><Play className="h-4 w-4" /> A human moment</p>
                <h3 className="mt-2 text-2xl font-extrabold">The numbers are not the story. Reconnection is.</h3>
                <p className="mt-3 text-[#5b655e]">Take a breath. Think about the relationship you hope can become possible again.</p>
              </div>
            </article>
            <article className="grid overflow-hidden rounded-2xl border-4 border-[#145b35] bg-[#fffdf4] sm:grid-rows-[minmax(16rem,1fr)_auto]">
              <img src="/images/papa-life-single-father.png" alt="A father reflecting with hope about reconnecting with his adult child" className="h-full min-h-64 w-full object-cover object-center" />
              <div className="flex flex-col justify-center p-8">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#b33a32]">A personal note from Brian</p>
                <h3 className="mt-2 text-2xl font-extrabold">Are you a father of an adult child?</h3>
                <p className="mt-3 text-lg italic leading-relaxed text-[#5b655e]">“You do not have to pretend this is easy. Papa Life is here to help you listen with humility, respond with compassion, and keep hope alive without forcing the relationship.”</p>
                <p className="mt-4 font-extrabold text-[#145b35]">— Brian Keith Hill</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <main className="container py-14">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-[#145b35]" />
          <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">Choose the support that meets you where you are</h2>
          <p className="mt-3 text-lg text-[#5b655e]">Start with the relationship need that feels most important today. You may purchase one lesson, choose a complete journey, or join for ongoing support.</p>
        </div>
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {[['all','All Products'],['digital','Audio Lessons'],['manuscript','Manuscripts'],['bundle','Bundles']].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-5 py-2 text-sm font-bold ${filter === value ? 'bg-[#145b35] text-white' : 'bg-[#f8f0db] text-[#145b35]'}`}>{label}</button>)}
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((offer) => (
            <article key={offer.code} className="flex flex-col rounded-xl border-4 border-[#145b35] bg-[#f8f0db] p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#b33a32]">{offer.format === 'digital' ? 'Audio Lesson' : offer.format === 'manuscript' ? 'Manuscript PDF' : 'Complete Bundle'}</p>
              <h2 className="mt-3 flex-1 text-xl font-extrabold">{offer.canonical_name}</h2>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-md border border-[#17231c]/15 p-3"><p className="text-xs font-bold text-[#5b655e]">Regular price</p><p className="mt-1 text-2xl font-black">{offer.public_price_display}</p></div>
                <div className="rounded-md bg-[#f2c230] p-3"><p className="text-xs font-bold text-[#145b35]">Member price</p><p className="mt-1 text-2xl font-black text-[#145b35]">{offer.member_price_display}</p></div>
              </div>
              {offer.public_checkout_url ? <a href={offer.public_checkout_url} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#b33a32] px-5 font-extrabold text-white">Buy without membership <ArrowRight className="h-4 w-4" /></a> : <div className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#17231c]/20 px-5 text-sm font-bold text-[#5b655e]"><LockKeyhole className="h-4 w-4" /> Public checkout being connected</div>}
              <a href="/join" className="mt-3 inline-flex items-center justify-center gap-2 text-sm font-extrabold text-[#145b35]">Join and save <ArrowRight className="h-4 w-4" /></a>
            </article>
          ))}
        </div>
        <div className="mt-12 rounded-xl bg-[#145b35] p-7 text-white"><div className="flex items-start gap-4"><CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-[#f2c230]" /><div><h2 className="text-2xl font-extrabold">No forced choice</h2><p className="mt-2 text-white/80">Your permanent purchases remain yours. Membership provides ongoing Course 11 streaming, community access, and discounted permanent-purchase prices while active.</p></div></div></div>
      </main>
    </div>
  );
}
