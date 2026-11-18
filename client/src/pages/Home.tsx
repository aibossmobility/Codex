import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { HouseTrail } from "./PapaHouse";
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { approvedStories, approvedProofCount, approvedExternalMentions } from "@/content/papa-trust-signals";

const navigation = [
  { label: "Find Your Guide", href: "/#family-guidance" },
  { label: "Why Adult Children Pull Away", href: "/why-adult-children-pull-away" },
  { label: "Brian’s Story", href: "#brian-story" },
  { label: "Start With the Wheel", href: "/#fatherhood-wheel" },
  { label: "Estrangement Help", href: "/father-child-estrangement" },
  { label: "Lessons & Prices", href: "/shop" },
];

// Existing Papa Life checkout destinations; no new checkout or subscription is created here.
const productCheckout = {'video': 'https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/checkout/d448db0d-ef3f-4740-aff8-38d037fa8aec', 'audio': 'https://byx4g32aidgektbg7nlq.app.clientclub.net/courses/offers/35a532f1-9717-442b-8b92-a3c63738e743', 'pdf': 'https://link.fastpaydirect.com/payment-link/6a5acf797b99151a5403f3de', 'fullAudio': 'https://link.fastpaydirect.com/payment-link/6a5acfce7b99151a5403f3e7', 'complete': 'https://link.fastpaydirect.com/payment-link/6a5acfd6a655fa0b802a4ecf'} as const;

const relationshipSignals = [
  {
    key: "red",
    label: "RED",
    title: "I'm not sure what to do.",
    guidance: "Begin by understanding what is happening and learning how to listen without pressure.",
    courses: ["Listening Without Defending", "When Your Adult Child Pulls Away", "When Silence Feels Personal"],
    action: "Explore Support for Getting Unstuck",
    buttonClass: "border-[#b33a32] bg-[#b33a32] text-white",
  },
  {
    key: "yellow",
    label: "YELLOW",
    title: "I want to reconnect.",
    guidance: "Prepare for a safer conversation, learn to take responsibility, and reduce pressure.",
    courses: ["The First Repair Sentence", "Presence Over Pressure", "Apology Without Explanation"],
    action: "Explore Courses for Reconnection",
    buttonClass: "border-[#d8aa16] bg-[#f2c230] text-[#17231c]",
  },
  {
    key: "green",
    label: "GREEN",
    title: "I'm ready to make changes.",
    guidance: "Build trust through small, consistent action and become safer to talk to.",
    courses: ["Consistency After the Conversation", "Rebuilding Trust in Small Deposits", "Becoming Safe to Talk To"],
    action: "Choose My Next Course",
    buttonClass: "border-[#145b35] bg-[#145b35] text-white",
  },
] as const;

const wheelSteps = [
  { label: "Awareness", top: "9%", left: "50%", signal: "red" },
  { label: "Engage", top: "30%", left: "82%", signal: "yellow" },
  { label: "Understand", top: "75%", left: "76%", signal: "yellow" },
  { label: "Take Action", top: "78%", left: "25%", signal: "green" },
  { label: "Reconnection", top: "30%", left: "17%", signal: "green" },
] as const;

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [relationshipSignal, setRelationshipSignal] = useState<"red" | "yellow" | "green">("yellow");
  const shopHref = "/shop";
  const wheelHref = "/#fatherhood-wheel";

  function showRecommendations(signal: "red" | "yellow" | "green") {
    setRelationshipSignal(signal);
    // Changing a color must visibly take the visitor to its updated guidance,
    // including when the visitor selects the already-active color.
    window.requestAnimationFrame(() => {
      const recommendations = document.getElementById("fatherhood-recommendations");
      recommendations?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "center",
      });
      recommendations?.focus({ preventScroll: true });
    });
  }

  return (
    <div className="papa-house-home min-h-screen overflow-x-hidden bg-[#f8f0db] text-[#17231c]">
      <PageMeta
        title="Papa Life Fatherhood Resource Center | Courses & Original Resources"
        description="Self-paced audio lessons for fathers of adult children. Listen without defending, apologize without explaining, rebuild trust in small steps."
        canonicalPath="/"
        keywords="fathers of adult children, reconnect with adult child, Papa Life, fatherhood, relationship repair"
      />

      <nav className="relative z-50 border-b-4 border-[#b63b31] bg-[#fff0d0]">
        <div className="container flex h-20 items-center justify-between gap-4">
          <a href="/" aria-label="Papa Life home">
            <SiteLogo size="md" />
          </a>
          <div className="hidden items-center gap-6 lg:flex">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-bold text-[#17231c] hover:text-[#b33a32]"
              >
                {item.label}
              </a>
            ))}
            <a
              href="/digital-twin"
              className="inline-flex items-center gap-2 rounded-md border border-[#17231c]/35 px-4 py-3 text-sm font-extrabold text-[#17231c] hover:border-[#145b35] hover:bg-[#145b35] hover:text-white"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Talk with Brian’s Digital AI
            </a>
            <a
              href={shopHref}
              className="rounded-md bg-[#b33a32] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#942e29]"
            >
              Lessons &amp; Prices
            </a>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#17231c]/30 lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-[#17231c]/20 bg-[#fff0d0] px-4 py-4 lg:hidden">
            <div className="container flex flex-col gap-1">
              {navigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-4 py-3 font-bold hover:bg-[#145b35] hover:text-white"
                >
                  {item.label}
                </a>
              ))}
              <a
                href="/digital-twin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-4 py-3 text-left font-bold hover:bg-[#145b35] hover:text-white"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Talk with Brian’s Digital AI
              </a>
              <a
                href={shopHref}
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 rounded-md bg-[#b33a32] px-4 py-3 font-extrabold text-white"
              >
                Lessons &amp; Prices
              </a>
            </div>
          </div>
        )}
      </nav>

      <section className="papa-house-outdoor-hero" aria-labelledby="welcome-home-heading">
        <div className="papa-house-outdoor-inner">
          <span className="papa-house-kicker">Papa Life · Fathers of Adult Children</span>
          <h1 id="welcome-home-heading">Audio Lessons for Fathers Whose Adult Child Has Gone Quiet.</h1>
          <p>Self-paced lessons by Brian Keith Hill on what to say, what not to say, and how to rebuild trust one small step at a time.</p>
          <p className="mt-3 text-sm font-bold">My son or daughter rarely calls or responds. I want to apologize, but I do not know what to say.</p>
          <p className="mt-3 font-semibold">Stronger fathers. Healthier relationships. Lasting legacy.</p>
          <div className="papa-house-outdoor-actions">
            <a href="/shop" className="papa-house-button">Explore the Lessons <ArrowRight size={20} aria-hidden="true"/></a>
            <a href="/relationship-assessment" className="papa-house-button-outline">2-Minute Fatherhood Check-In <ArrowRight size={18} aria-hidden="true"/></a>
          </div>
          <p className="mt-3 text-sm">Lessons begin at $14.99 one-time. No membership or appointment. Reconciliation is never guaranteed.</p>
        </div>
      </section>
      <div className="papa-house-outdoor-note">A welcoming home for fathers to <strong>read, listen, reflect, and grow</strong>. <a href="/house">Explore the rooms</a> at your own pace.</div>
      <HouseTrail current="Outside" />

      <section id="family-guidance" className="scroll-mt-8 border-y border-[#145b35]/20 bg-[#f3ead5] py-12 md:py-16" aria-labelledby="family-guidance-heading">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#b33a32]">Start with who you are</p>
            <h2 id="family-guidance-heading" className="mt-3 text-3xl font-extrabold leading-tight md:text-5xl">Are you a parent of an adult child—or an adult child yourself?</h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-[#314239]">
              Choose the guidance that fits your experience. Find answers to common relationship questions, communication challenges, and boundaries without having to start a paid AI conversation.
            </p>
          </div>
          <div className="mx-auto mt-9 grid max-w-5xl gap-5 md:grid-cols-2">
            <article className="flex flex-col rounded-2xl border-2 border-[#145b35] bg-white p-7 shadow-sm md:p-9">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#145b35]">I'm a parent</p>
              <h3 className="mt-2 text-2xl font-extrabold">Parents of Adult Children</h3>
              <p className="mt-3 flex-1 leading-relaxed text-[#425047]">
                My adult son or daughter is distant, and I want to understand how to listen, rebuild trust, or communicate without pressure.
              </p>
              <a href="/parents-of-adult-children" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#145b35] px-5 py-3 font-extrabold text-white hover:bg-[#0c452a]">
                Explore Parent Guidance <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </a>
            </article>
            <article className="flex flex-col rounded-2xl border-2 border-[#145b35] bg-white p-7 shadow-sm md:p-9">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#145b35]">I'm an adult son or daughter</p>
              <h3 className="mt-2 text-2xl font-extrabold">Adult Children</h3>
              <p className="mt-3 flex-1 leading-relaxed text-[#425047]">
                My relationship with a parent is complicated, and I want help thinking about communication, my choices, and healthy boundaries.
              </p>
              <a href="/adult-children" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#145b35] px-5 py-3 font-extrabold text-white hover:bg-[#0c452a]">
                Explore Adult Child Guidance <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </a>
            </article>
          </div>
          <p className="mt-7 text-center text-sm font-semibold text-[#425047]">
            Prefer an AI conversation? <a href="/digital-twin" className="font-extrabold text-[#145b35] underline underline-offset-4">Meet Brian's Digital Twin</a> as a separate, optional experience.
          </p>
        </div>
      </section>

      <section id="fatherhood-wheel" className="border-y border-[#17231c]/15 bg-[#fffaf0] py-12 md:py-16" aria-labelledby="fatherhood-wheel-heading">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#b33a32]">Awareness First • Take Action with the Right Support</p>
            <h2 id="fatherhood-wheel-heading" className="mt-3 text-3xl font-extrabold md:text-5xl">
              Where Are You With Your Child—and What Can Help?
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-[#314239]">
              Start by identifying where you are with your adult child. Choose Red, Yellow, or Green to see courses and resources that could help you move forward.
            </p>
          </div>

          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
            <div className="rounded-2xl border border-[#17231c]/15 bg-white p-5 shadow-sm md:p-7">
              <div className="relative mx-auto aspect-square w-full max-w-[520px]">
                <img
                  src="/images/papa-life-journey-wheel.webp"
                  alt="Papa Life five-stage journey steering wheel"
                  className="h-full w-full object-contain"
                  loading="eager"
                />
                {wheelSteps.map((step, index) => (
                  <button
                    type="button"
                    key={step.label}
                    onClick={() => showRecommendations(step.signal)}
                    aria-controls="fatherhood-recommendations"
                    style={{top: step.top, left: step.left}}
                    className="absolute z-10 flex min-h-10 w-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-lg border-2 border-[#f2c230] bg-[#17231c] px-1 py-2 text-center text-white shadow-lg hover:bg-[#145b35] focus:outline-none focus:ring-4 focus:ring-[#f2c230]"
                    aria-label={"Step " + (index + 1) + ": " + step.label + ". View suggested products"}
                  >
                    <span className="text-[10px] font-black text-[#f2c230] sm:text-xs">{"STEP " + (index + 1)}</span>
                    <span className="text-[10px] font-extrabold uppercase leading-tight sm:text-sm">{step.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {relationshipSignals.map((signal) => {
                  const active = relationshipSignal === signal.key;
                  return (
                    <button
                      key={signal.key}
                      type="button"
                      onClick={() => showRecommendations(signal.key)}
                      aria-controls="fatherhood-recommendations"
                      aria-pressed={active}
                      className={`rounded-xl border-2 px-4 py-4 text-left transition-all ${signal.buttonClass} ${
                        active ? "scale-[1.02] shadow-lg ring-4 ring-black/10" : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      <span className="block text-xs font-black uppercase tracking-[0.16em]">{signal.label}</span>
                      <span className="mt-1 block text-sm font-extrabold leading-snug">{signal.title}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 rounded-xl bg-[#17231c] p-4 text-white">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f2c230]">
                  Your next step
                </p>
                <p className="mt-2 text-base font-bold">
                  {relationshipSignals.find((signal) => signal.key === relationshipSignal)?.guidance}
                </p>
              </div>
            </div>

            <div id="fatherhood-recommendations" tabIndex={-1} aria-live="polite" aria-label="Recommended Papa Life resources" className="scroll-mt-6 overflow-hidden rounded-2xl border border-[#17231c]/15 bg-[#17231c] text-white shadow-xl focus:outline-none">
              <div className="p-6 md:p-8">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f2c230]">Your Papa Life Options</p>
                <h3 className="mt-2 text-2xl font-extrabold md:text-3xl">Choose What Helps You Take the Next Step.</h3>
                <p className="mt-3 leading-relaxed text-white/80">Select your color beside the wheel. These relevant courses can help you move from awareness to action.</p>
                <div className="mt-6 rounded-xl border border-[#f2c230]/40 bg-white/5 p-5">
                  <p className="text-xs font-black uppercase tracking-wider text-[#f2c230]">Suggested for you</p>
                  <p className="mt-2 text-base font-semibold">{relationshipSignals.find((signal) => signal.key === relationshipSignal)?.guidance}</p>
                  <ul className="mt-4 space-y-3">
                    {relationshipSignals.find((signal) => signal.key === relationshipSignal)?.courses.map((course) => (
                      <li key={course} className="flex items-start gap-2 font-semibold text-white/90">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#f2c230]" aria-hidden="true" />
                        <span>{course}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-5 rounded-xl bg-white/10 p-5">
                  <h4 className="font-extrabold text-[#f2c230]">More Ways to Learn</h4>
                  <p className="mt-2 text-sm text-white/85">Explore the 12 available audio lessons, written manuscripts, the complete bundles, or the separate video collection. Each has a one-time purchase price.</p>
                </div>
                <div className="mt-5 flex flex-col gap-3">
                  <a href="/shop" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#f2c230] px-5 py-3 text-sm font-extrabold text-[#17231c] hover:bg-white">
                    {relationshipSignals.find((signal) => signal.key === relationshipSignal)?.action}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a href="/my-journey" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/35 px-5 py-3 text-sm font-extrabold text-white hover:border-[#f2c230]">Explore the Five-Step Journey</a>
                  <a href="/digital-twin" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/35 px-5 py-3 text-sm font-extrabold text-white hover:border-[#f2c230]">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Talk with Brian’s Digital AI
                  </a>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/80">No audio lesson can guarantee reconciliation. Your adult child decides whether and how to respond. The work you can choose is listening, accountability, and consistent respect for boundaries.</p>
                <p className="mt-3 text-sm text-white/80">You may request a full digital-product refund within seven calendar days of purchase. <a href="/refund-policy" className="font-bold text-[#f2c230] underline">Read the refund policy.</a></p>
                <p className="mt-5 text-xs leading-relaxed text-white/65">This website helps you choose. Approved product terms, agreements, and payments are handled in the separate GoHighLevel sales process.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section id="products" aria-labelledby="products-heading" className="bg-[#f8f0db] py-14 md:py-20">
          <div className="container">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#b33a32]">Original Papa Life Resources</p>
            <h2 id="products-heading" className="mt-3 max-w-4xl text-3xl font-extrabold md:text-5xl">Knowledge You Can Use at Your Own Pace.</h2>
            <p className="mt-4 max-w-3xl text-lg text-[#314239]">Learn through original content created by Brian Keith Hill. Choose what helps you understand your circumstances, strengthen your decisions, and take the next step with greater wisdom.</p>
            <div className="mt-9 grid gap-6 lg:grid-cols-3">
              {[
                { name: "Listen without defending", detail: "When every conversation turns into an explanation, start with Lesson 01: Listening Without Defending.", format: "Individual streaming audio lesson", price: "$14.99 one-time", label: "Buy Lesson 01", href: productCheckout.audio },
                { name: "Prepare for the next conversation", detail: "All 12 self-paced audio lessons: listening, responsibility, apology, presence, and rebuilding trust one step at a time.", format: "Complete 12-lesson audio program", price: "$79 one-time", label: "Buy All 12 Audio Lessons", href: productCheckout.fullAudio },
                { name: "When silence is hard to face", detail: "Wrestling the Silence Away includes 10 short video reflections for fathers of adult children.", format: "10-video collection", price: "$19.99 one-time", label: "Buy the Video Series", href: productCheckout.video },
                { name: "Read the first lesson at your own pace", detail: "Prefer written lessons? Begin with the Listening Without Defending manuscript PDF.", format: "Downloadable lesson PDF", price: "$14.99 one-time", label: "Buy the Lesson Manuscript", href: productCheckout.pdf },
                { name: "Listen and read the whole program", detail: "The 12 streaming audio lessons plus all 12 downloadable manuscript PDFs in one purchase.", format: "Complete audio + manuscript bundle", price: "$129 one-time", label: "Buy the Complete Bundle", href: productCheckout.complete },
              ].map((offer) => (
                <article key={offer.name} className="flex flex-col rounded-xl border-2 border-[#145b35] bg-white p-7 shadow-sm">
                  <p className="text-sm font-black uppercase tracking-wide text-[#145b35]">{offer.format}</p>
                  <h3 className="mt-2 text-2xl font-extrabold">{offer.name}</h3>
                  <p className="mt-3 flex-1 leading-relaxed text-[#425047]">{offer.detail}</p>
                  <p className="mt-4 text-2xl font-black text-[#17231c]">{offer.price}</p>
                  <a href={offer.href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#145b35] px-5 py-3 font-extrabold text-white hover:bg-[#114629]">
                    {offer.label} <ArrowRight className="h-4 w-4" aria-hidden="true"/>
                  </a>
                  <p className="mt-3 text-xs text-[#425047]">One-time purchase. No appointment or membership required.</p>
                </article>
              ))}
            </div>
            <p className="mt-5 text-sm text-[#314239]">For digital purchases, request a full refund within seven calendar days. <a href="/refund-policy" className="font-bold text-[#145b35] underline">Read the refund policy.</a></p>
            <div className="mt-9 rounded-xl border border-[#e4c669] bg-[#fff8e0] p-6">
              <h3 className="text-xl font-extrabold">More Original Intellectual Property</h3>
              <p className="mt-2 text-[#425047]">Only currently available, verified digital lessons, manuscripts, videos, and bundles are linked for purchase. Unfinished material is not offered for sale.</p>
            </div>
          </div>
        </section>

        {(approvedStories.length > 0 || approvedProofCount !== null || approvedExternalMentions.length > 0) && (
          <section aria-label="Verified Papa Life experiences and recognition" className="bg-[#fffaf0] py-10">
            <div className="container">
              <h2 className="text-2xl font-extrabold">Verified experiences</h2>
              {approvedProofCount !== null && <p className="mt-3 font-bold">{approvedProofCount} fathers have completed the Check-In.</p>}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {approvedStories.map((story) => <blockquote key={story.sourceId} className="rounded-xl border border-[#145b35]/25 p-5"><p>“{story.quote}”</p><cite className="mt-3 block text-sm font-bold">{story.firstName}</cite></blockquote>)}
              </div>
              <div className="mt-3 flex flex-wrap gap-4">
                {approvedExternalMentions.map((mention) => <a key={mention.url} href={mention.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[#145b35] underline">{mention.label} · {mention.date}</a>)}
              </div>
            </div>
          </section>
        )}


        {/* Shared brand introduction, deliberately visitor-controlled with no autoplay. */}
        <section id="two-learning-paths" aria-labelledby="two-learning-paths-heading" className="bg-[#fff8e6] py-12 text-[#17231c] md:py-16">
          <div className="container max-w-5xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#145b35]">A 57-second introduction from Brian</p>
            <h2 id="two-learning-paths-heading" className="mt-3 text-3xl font-extrabold leading-tight md:text-5xl">Two Learning Paths. One Purpose.</h2>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed">Papa Life helps fathers of adult children strengthen relationships. AI Boss Mobility helps entrepreneurs and community leaders use AI thoughtfully. Both start with people.</p>
            <p className="mt-3 font-bold text-[#145b35]">Press Play to watch and listen. The narration and smooth-jazz music never start automatically.</p>
            <video
              controls
              playsInline
              preload="none"
              poster="https://ai.bossmobilelifecoach.com/videos/two-learning-paths-one-purpose-poster.jpg"
              width={1280}
              height={720}
              aria-label="Two Learning Paths, One Purpose with Brian Keith Hill, captions and smooth-jazz music"
              className="mt-6 aspect-video w-full rounded-2xl bg-[#17231c] shadow-xl"
              style={{ objectFit: "contain" }}
            >
              <source src="https://ai.bossmobilelifecoach.com/videos/two-learning-paths-one-purpose.mp4" type="video/mp4" />
              Your browser does not support embedded video. <a href="https://ai.bossmobilelifecoach.com/videos/two-learning-paths-one-purpose.mp4" className="underline">Open the video</a>.
            </video>
            <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-base font-extrabold">
              <a href="/shop" className="text-[#145b35] underline">Explore Papa Life lessons</a>
              <a href="https://ai.bossmobilelifecoach.com/digital-courses" className="text-[#145b35] underline">Explore AI Boss Mobility courses</a>
            </div>
          </div>
        </section>

        <section id="brian-story" aria-labelledby="creator-heading" className="bg-[#17231c] py-14 text-white md:py-18">
          <div className="container grid items-center gap-7 md:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f2c230]">Meet the Creator</p>
              <h2 id="creator-heading" className="mt-3 text-3xl font-extrabold md:text-4xl">Original Works by Brian Keith Hill</h2>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/80">Papa Life is a fatherhood resource center sharing Brian's original ideas, teaching, audio lessons, and written works for fathers of adult children. The goal is to make his knowledge accessible without requiring an appointment or personal meeting.</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold">
                <a href="https://www.linkedin.com/in/brian-hill-bossmobility/" target="_blank" rel="noopener noreferrer" className="text-[#f2c230] underline">Brian on LinkedIn</a>
                <a href="/changelog" className="text-[#f2c230] underline">Dated Papa Life updates</a>
              </div>
            </div>
            <div className="rounded-xl border border-[#f2c230]/40 bg-white/10 p-6 text-center">
              <p className="text-lg font-extrabold text-[#f2c230]">Not sure which product fits?</p>
              <p className="mt-2 text-sm text-white/80">Brian's Digital AI can explain the resources, answer product questions, and help you decide what to explore.</p>
              <a href="/digital-twin" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#f2c230] px-5 py-3 font-extrabold text-[#17231c]">
                <MessageCircle className="h-5 w-5" aria-hidden="true"/> Talk with Brian’s Digital AI
              </a>
            </div>
          </div>
        </section>

        <section aria-labelledby="how-to-purchase" className="bg-[#f2c230] py-12 text-[#17231c]">
          <div className="container max-w-4xl text-center">
            <h2 id="how-to-purchase" className="text-3xl font-black md:text-4xl">Explore Here. Purchase Through GoHighLevel.</h2>
            <p className="mt-4 text-lg">PapaLifeCoach.com helps you discover and choose. Approved product details, agreement or terms, payment, and access are handled through the separate GoHighLevel sales process—not through checkout on this website.</p>
            <a href="/shop" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#145b35] px-8 py-3 font-extrabold text-white">See Lessons and Prices <ArrowRight className="h-4 w-4"/></a>
            <p className="mt-3 text-sm">You can request a digital-product refund within seven calendar days. <a href="/refund-policy" className="font-bold underline">Read the refund policy.</a></p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#f2c230]/30 bg-[#17231c] py-10 text-white">
        <div className="container flex flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <SiteLogo size="md" />
            <p className="mt-3 text-sm text-white/60">Stronger fathers. Healthier relationships. Lasting legacy.</p>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/50">
              Papa Life is a fatherhood initiative founded by <a href="/about-brian-keith-hill" className="underline hover:text-[#f2c230]">Brian Keith Hill</a> through Boss Mobility.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-5 text-sm font-semibold text-white/75">
            <a href="/site-directory" className="hover:text-[#f2c230]">Site Directory</a>
            <a href="/changelog" className="hover:text-[#f2c230]">Updates</a>
            <a href="/father-friendly-practice" className="hover:text-[#f2c230]">Father-Friendly Practice</a>
            <a href="/shop" className="hover:text-[#f2c230]">Explore Courses</a>
            <a href="/privacy-policy" className="hover:text-[#f2c230]">Privacy</a>
            <a href="/terms-of-service" className="hover:text-[#f2c230]">Terms</a>
            <a href="/refund-policy" className="font-bold text-[#f2c230] hover:underline">Refunds &amp; Cancellations</a>
            <a href="tel:+15104152098" className="hover:text-[#f2c230]">510.415.2098</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
