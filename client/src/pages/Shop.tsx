import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { HouseTrail } from "./PapaHouse";
import { ArrowRight, CheckCircle2, Play, ShoppingBag } from "lucide-react";
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

// Public, one-time course offers confirmed Published in GoHighLevel on 2026-10-14.
 // This checkout mapping is intentionally separate from retired member and payment links.
const PAPA_VIDEO_CHECKOUT = "https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/checkout/d448db0d-ef3f-4740-aff8-38d037fa8aec";

const PAPA_LIVE_COURSE_OFFERS: Record<number, string> = {
  1: "https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/offers/35a532f1-9717-442b-8b92-a3c63738e743",
  2: "https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/offers/1ba70312-a07f-4902-911f-08e5d3490d74",
  3: "https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/offers/610ac0ae-0c12-4ba1-94d1-386ec01da1ff",
  4: "https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/offers/6be3237e-9935-43e0-b117-898915075f7f",
  5: "https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/offers/90c2ccb5-8926-4a10-bbc9-2e9e838e68b7",
  6: "https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/offers/ee98d152-4f24-42f5-a31f-1b74b5085993",
  7: "https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/offers/8c55516e-26f7-41d0-977b-2e474e243593",
  8: "https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/offers/5fcfba5e-6184-4c3a-96a2-034e04cba1f0",
  9: "https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/offers/03a23e15-2168-4dcd-b3d5-8b9b474d7611",
  10: "https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/offers/3e9ece1f-e7dd-4e45-988d-6bc49e84b7b2",
  11: "https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/offers/e5632044-b3cb-4286-bfda-6a56e4089fd9",
  12: "https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/offers/a0464514-e9f5-4e45-aaa1-ed2262c4387f",
};

// Reconciled public one-time offers in the Papa Life location only.
const PAPA_RESOURCE_CHECKOUTS: Record<string, string> = {
  "curriculum.manuscript.module.01": "https://link.fastpaydirect.com/payment-link/6a5acf797b99151a5403f3de",
  "curriculum.manuscript.module.02": "https://link.fastpaydirect.com/payment-link/6a5acf807b99151a5403f3e0",
  "curriculum.manuscript.module.03": "https://link.fastpaydirect.com/payment-link/6a5acf877b99151a5403f3e1",
  "curriculum.manuscript.module.04": "https://link.fastpaydirect.com/payment-link/6a5acf8ea655fa0b802a4eca",
  "curriculum.manuscript.module.05": "https://link.fastpaydirect.com/payment-link/6a5acf957b99151a5403f3e2",
  "curriculum.manuscript.module.06": "https://link.fastpaydirect.com/payment-link/6a5acf9c7b99151a5403f3e3",
  "curriculum.manuscript.module.07": "https://link.fastpaydirect.com/payment-link/6a5acfa37b99151a5403f3e4",
  "curriculum.manuscript.module.08": "https://link.fastpaydirect.com/payment-link/6a5acfaa7b99151a5403f3e5",
  "curriculum.manuscript.module.09": "https://link.fastpaydirect.com/payment-link/6a5acfb1a655fa0b802a4ecb",
  "curriculum.manuscript.module.10": "https://link.fastpaydirect.com/payment-link/6a5acfb87b99151a5403f3e6",
  "curriculum.manuscript.module.11": "https://link.fastpaydirect.com/payment-link/6a5acfc0a655fa0b802a4ecc",
  "curriculum.manuscript.module.12": "https://link.fastpaydirect.com/payment-link/6a5acfc7a655fa0b802a4ece",
  "curriculum.digital.complete": "https://link.fastpaydirect.com/payment-link/6a5acfce7b99151a5403f3e7",
  "curriculum.bundle.complete": "https://link.fastpaydirect.com/payment-link/6a5acfd6a655fa0b802a4ecf",
};

// Keep public shop labels aligned with the published GoHighLevel checkout titles.
// Only the verified lessons with outdated catalog titles are overridden.
const PAPA_LIVE_CHECKOUT_TITLE_OVERRIDES: Record<number, string> = {
  8: "Papa Life Lesson 08 — Consistency After the Apology",
  9: "Papa Life Lesson 09 — Small Deposits of Trust",
  11: "Papa Life Lesson 11 — Purpose Not Panic",
};

export default function Shop() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filter, setFilter] = useState("digital");
  const [deliveryReady, setDeliveryReady] = useState(false);
  useEffect(() => {
    fetch("/api/public/digital-sales-status").then(r => r.json()).then(data => setDeliveryReady(data.available === true)).catch(() => setDeliveryReady(false));
  }, []);

  useEffect(() => {
    fetch("/api/public/commerce-catalog")
      .then((r) => r.json())
      .then((data) => setOffers((data.products || []).filter((offer: Offer) => offer.code !== "membership.community.monthly")));
  }, []);

  const visible = useMemo(() => offers.filter((offer) => filter === "all" || offer.format === filter), [offers, filter]);

  return (
    <div className="min-h-screen bg-[#f4dea0] text-[#17231c]">
      <PageMeta title="Papa Life Products — Explore Self-Paced Courses" description="A welcoming place for fathers of adult children to discover original Papa Life videos, audio lessons, and written resources for rebuilding trust and connection." />
      <nav className="border-b border-[#17231c]/20 bg-[#f2c230]">
        <div className="container flex min-h-20 flex-col items-start justify-between gap-3 py-3 sm:flex-row sm:items-center">
          <a href="/"><SiteLogo size="md" /></a>
          <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
            <a href="/my-journey" className="text-sm font-bold leading-snug hover:text-[#b33a32]">Awareness Wheel</a>
            <a href="/courses" className="rounded-md bg-[#145b35] px-3 py-2 text-sm font-extrabold text-white sm:px-4 sm:py-3">Explore Courses</a>
          </div>
        </div>
      </nav>
      <HouseTrail current="Resource Room" />

      <header id="featured-book" className="relative isolate overflow-hidden border-b-4 border-[#d5ab4b] bg-[#f9efdc] text-[#17231c]">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_5%_20%,rgba(238,199,117,0.25),transparent_60%),radial-gradient(ellipse_at_95%_75%,rgba(20,91,53,0.09),transparent_60%)]" />
        <div className="container relative grid items-center gap-9 py-12 sm:gap-12 sm:py-16 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:py-20">
          <div className="mx-auto w-full max-w-[20rem] sm:max-w-[24rem] lg:max-w-[25rem]">
            <img
              src="/images/run-your-own-race-book-cover.png"
              alt="Run Your Own Race book cover: Brian Keith Hill wearing a backward black cap, black shirt, glasses and an African scarf, hands clasped against a colorful African savannah and winding road"
              width="1024"
              height="1536"
              fetchPriority="high"
              className="h-auto w-full rounded-sm border-4 border-[#d8ad45] shadow-[0_20px_55px_rgba(27,40,29,0.30)]"
            />
          </div>
          <div className="mx-auto max-w-2xl text-center lg:text-left">
            <p className="text-xs font-black uppercase tracking-[0.20em] text-[#a64031]">Featured Papa Life book · A journey of faith and purpose</p>
            <h1 className="mt-4 font-serif text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">Run Your Own Race</h1>
            <p className="mt-5 font-serif text-xl italic leading-relaxed text-[#315843]">A personal journey from Brian Keith Hill</p>
            <p className="mt-5 text-lg leading-relaxed text-[#3f4d43]">Twenty-one chapters about faith, family, fatherhood, identity, and finding the courage to walk your own path. Written from lived experience for anyone ready to reflect, grow, and keep moving forward.</p>
            <p className="mt-5 font-bold text-[#145b35]">21 chapters · Complete EPUB and PDF digital book</p>
            <p className="mt-4 text-3xl font-black text-[#17231c]">$24.99 <span className="text-base font-medium text-[#58675d]">regular one-time price</span></p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <span role="status" className="inline-flex min-h-12 items-center rounded-full bg-[#145b35] px-7 py-3 font-extrabold text-white">Coming Soon · Book sales not yet open</span>
              <a href="#audio-lessons" className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-[#145b35] px-6 py-3 font-extrabold text-[#145b35] hover:bg-[#145b35] hover:text-white">Explore available lessons <ArrowRight className="h-4 w-4" /></a>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#657267]">Digital book checkout and automatic delivery are being verified. No subscription, reservation, or appointment required.</p>
            <p className="mt-4 border-t border-[#ddc99f] pt-4 text-base font-semibold text-[#315843]">There is room here for the father you are becoming.</p>
          </div>
        </div>
      </header>

      <section className="border-b border-[#c5a76f]/45 bg-[#fff3d8] py-9">
        <div className="container flex flex-col gap-5 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <div><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#a33e32]">Choose what speaks to you</p><p className="mt-2 max-w-2xl text-lg text-[#455245]">A complete video series, individual audio lessons, and written resources all have their own place here.</p></div>
          <a href="/my-journey" className="inline-flex shrink-0 items-center justify-center gap-2 font-extrabold text-[#145b35] underline underline-offset-4">Begin with the Awareness Wheel <ArrowRight className="h-4 w-4" /></a>
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

      <section id="video-collection" className="scroll-mt-8 bg-[#efdfbf] py-14 md:py-20">
        <div className="container">
          <div className="grid overflow-hidden rounded-[2rem] border border-[#9c805a]/25 bg-[#fffaf0] shadow-[0_18px_55px_rgba(73,49,22,0.13)] lg:grid-cols-[1.08fr_1fr]">
            <div className="relative min-h-72 bg-[#17231c]">
              <img src="/images/papa-life-wrestling-the-silence-away-video-cover.jpg" alt="Wrestling the Silence Away, the official Papa Life ten-episode video series cover" className="absolute inset-0 h-full w-full object-contain" />
            </div>
            <div className="flex flex-col justify-center px-7 py-10 sm:px-10 lg:py-14">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b33a32]">Featured video series · A separate collection</p>
              <h2 className="mt-3 font-serif text-3xl font-bold leading-tight text-[#17231c] sm:text-4xl">Wrestling the Silence Away</h2>
              <p className="mt-4 text-lg leading-relaxed text-[#4c574b]">Ten original, prerecorded reflections for fathers of adult children—from the ache of distance through humility, listening, repair conversations, and everyday reconnection.</p>
              <p className="mt-4 text-sm font-bold text-[#145b35]">10 videos · Approximately 12 minutes 23 seconds total · Watch at your pace</p>
              <p className="mt-5 text-2xl font-extrabold text-[#17231c]">$19.99 <span className="text-base font-medium text-[#596657]">one-time · no subscription</span></p>
              <a href={PAPA_VIDEO_CHECKOUT} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-[#145b35] px-7 py-3 font-extrabold text-white transition hover:bg-[#0c4127]">Purchase the video series — $19.99 <ArrowRight className="h-4 w-4" /></a>
              <p className="mt-4 text-sm leading-relaxed text-[#596657]">Secure GoHighLevel course checkout. This video series is not part of the $14.99 individual audio lessons, manuscripts, or consulting services. Relationship outcomes are never guaranteed.</p>
              <a href="/refund-policy" className="mt-3 w-fit text-sm font-bold text-[#145b35] underline underline-offset-4">Read the 7-day refund and cancellation policy</a>
            </div>
          </div>
        </div>
      </section>

      <main id="audio-lessons" className="container scroll-mt-8 py-14">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-[#145b35]" />
          <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">Choose the support that meets you where you are</h2>
          <p className="mt-3 text-lg text-[#5b655e]">The video collection above is a separate one-time purchase. Below you can choose from 12 self-guided audio lessons for $14.99 each, or explore written resources and bundles. No appointment, recurring membership, or service estimate is required for these digital lessons.</p>
        </div>
        <div className="mx-auto mb-8 max-w-3xl rounded-xl border-2 border-[#145b35] bg-[#fffdf4] p-5 text-center"><p className="font-bold">Know your rights before enrolling: digital-product refund requests are accepted within 7 calendar days after purchase.</p><a href="/refund-policy" className="mt-2 inline-block font-extrabold text-[#145b35] underline">Read the Refund &amp; Cancellation Policy →</a></div>
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {[['all','All Products'],['digital','Audio Lessons'],['manuscript','Manuscripts'],['bundle','Bundles']].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-5 py-2 text-sm font-bold ${filter === value ? 'bg-[#145b35] text-white' : 'bg-[#f8f0db] text-[#145b35]'}`}>{label}</button>)}
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((offer) => (
            <article key={offer.code} className="flex flex-col rounded-xl border-4 border-[#145b35] bg-[#f8f0db] p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#b33a32]">{offer.format === 'digital' ? 'Audio Lesson' : offer.format === 'manuscript' ? 'Manuscript PDF' : 'Complete Bundle'}</p>
              <h2 className="mt-3 flex-1 text-xl font-extrabold">{offer.format === "digital" && offer.module_number && PAPA_LIVE_CHECKOUT_TITLE_OVERRIDES[offer.module_number] ? PAPA_LIVE_CHECKOUT_TITLE_OVERRIDES[offer.module_number] : offer.canonical_name}</h2>
              {offer.format === "digital" && offer.module_number && PAPA_LIVE_COURSE_OFFERS[offer.module_number] ? (
                <>
                  <p className="mt-5 text-sm text-[#5b655e]">One-time $14.99 purchase, paid in full at GoHighLevel checkout. No estimate, signature, split payment, deposit, subscription, or appointment required.</p>
                  <a href={PAPA_LIVE_COURSE_OFFERS[offer.module_number]} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#145b35] px-5 font-extrabold text-white">
                    Enroll Now — {offer.public_price_display} <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                  <a href="/refund-policy" className="mt-3 text-sm font-semibold text-[#145b35] underline">7-day refund policy — read before purchase</a>
                </>
              ) : deliveryReady && PAPA_RESOURCE_CHECKOUTS[offer.code] ? (
                <>
                  <p className="mt-5 text-2xl font-extrabold">{offer.public_price_display} <span className="text-sm font-medium">one-time</span></p>
                  <p className="mt-3 text-sm text-[#5b655e]">{offer.format === "manuscript" ? "Download the purchased manuscript PDF from your protected learning library." : offer.code === "curriculum.bundle.complete" ? "All 12 audio lessons and all 12 manuscript PDFs in your protected learning library." : "All 12 audio lessons in your protected learning library."} After payment, check your checkout email for access. No paid membership or subscription required.</p>
                  <a href={PAPA_RESOURCE_CHECKOUTS[offer.code]} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#145b35] px-5 font-extrabold text-white">Purchase — {offer.public_price_display} <ArrowRight className="ml-2 h-4 w-4" /></a>
                  <a href="/refund-policy" className="mt-3 text-sm font-semibold text-[#145b35] underline">7-day refund policy — read before purchase</a>
                </>
              ) : (
                <>
                  <p className="mt-5 text-sm text-[#5b655e]">This format is available to explore. Checkout is not currently enabled for this item.</p>
                  <a href="/courses" className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#145b35] px-5 font-extrabold text-white">Explore Course Details <ArrowRight className="ml-2 h-4 w-4" /></a>
                </>
              )}
            </article>
          ))}
        </div>
        <div className="mt-12 rounded-xl bg-[#145b35] p-7 text-white"><div className="flex items-start gap-4"><CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-[#f2c230]" /><div><h2 className="text-2xl font-extrabold">Secure checkout for Papa Life lessons</h2><p className="mt-2 text-white/80">Select the video-series purchase link above or Enroll Now on an individual audio lesson to open its corresponding GoHighLevel checkout. Audio lessons and the video series open their GoHighLevel course checkouts. Manuscripts and bundles use one-time GoHighLevel payment links; after verified payment, access instructions are emailed to your checkout address. Previous purchases retain their original terms.</p></div></div></div>
      </main>
    </div>
  );
}
