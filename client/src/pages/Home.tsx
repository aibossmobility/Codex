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

const navigation = [
  { label: "Come Inside", href: "/house" },
  { label: "Brian’s Story", href: "#brian-story" },
  { label: "Start With the Wheel", href: "/#fatherhood-wheel" },
  { label: "Explore Courses", href: "/shop" },
];

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

  function openPapaAiCoach() {
    window.location.assign("/digital-twin");
  }

  return (
    <div className="papa-house-home min-h-screen overflow-x-hidden bg-[#f8f0db] text-[#17231c]">
      <PageMeta
        title="Papa Life Fatherhood Resource Center | Courses & Original Resources"
        description="Explore original Papa Life audio lessons, manuscripts and learning resources for fathers of adult children. Find your next step with the Awareness Wheel."
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
            <button
              type="button"
              onClick={openPapaAiCoach}
              className="inline-flex items-center gap-2 rounded-md border border-[#17231c]/35 px-4 py-3 text-sm font-extrabold text-[#17231c] hover:border-[#145b35] hover:bg-[#145b35] hover:text-white"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              1-Minute AI Experience
            </button>
            <a
              href={shopHref}
              className="rounded-md bg-[#b33a32] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#942e29]"
            >
              Explore Courses &amp; Resources
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
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openPapaAiCoach();
                }}
                className="flex items-center gap-2 rounded-md px-4 py-3 text-left font-bold hover:bg-[#145b35] hover:text-white"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                1-Minute AI Experience
              </button>
              <a
                href={shopHref}
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 rounded-md bg-[#b33a32] px-4 py-3 font-extrabold text-white"
              >
                Explore Courses &amp; Resources
              </a>
            </div>
          </div>
        )}
      </nav>

      <section className="papa-house-outdoor-hero" aria-labelledby="welcome-home-heading">
        <div className="papa-house-outdoor-inner">
          <span className="papa-house-kicker">Papa Life · Fathers of Adult Children</span>
          <h1 id="welcome-home-heading">Your journey has a place to <em>begin.</em></h1>
          <p>Welcome. Step out of the noise and into a place built for reflection, wisdom, and the courage to reconnect. Come inside, make yourself comfortable, and discover what speaks to you.</p>
          <div className="papa-house-outdoor-actions">
            <a href="/house" className="papa-house-button">Come Inside <ArrowRight size={20} aria-hidden="true"/></a>
            <a href="/shop" className="papa-house-button-outline">Browse Resources <ArrowRight size={18} aria-hidden="true"/></a>
          </div>
        </div>
      </section>
      <div className="papa-house-outdoor-note">A welcoming home for fathers to <strong>read, listen, reflect, and grow</strong>. <a href="/house">Explore the rooms</a> at your own pace.</div>
      <HouseTrail current="Outside" />

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
                    onClick={() => setRelationshipSignal(step.signal)}
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
                      onClick={() => setRelationshipSignal(signal.key)}
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

            <div className="overflow-hidden rounded-2xl border border-[#17231c]/15 bg-[#17231c] text-white shadow-xl">
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
                  <p className="mt-2 text-sm text-white/85">Explore individual audio lessons, manuscripts and the complete 12-lesson program. Original books, music, and spoken-word offerings will be featured when ready and cleared for sale.</p>
                </div>
                <div className="mt-5 flex flex-col gap-3">
                  <a href="/shop" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#f2c230] px-5 py-3 text-sm font-extrabold text-[#17231c] hover:bg-white">
                    {relationshipSignals.find((signal) => signal.key === relationshipSignal)?.action}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a href="/my-journey" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/35 px-5 py-3 text-sm font-extrabold text-white hover:border-[#f2c230]">Explore the Five-Step Journey</a>
                  <button type="button" onClick={openPapaAiCoach} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/35 px-5 py-3 text-sm font-extrabold text-white hover:border-[#f2c230]">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Ask Brian’s Digital AI About the Options
                  </button>
                </div>
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
                { name: "Complete 12-Lesson Audio Program", detail: "A complete self-paced learning path covering listening, ownership, presence, healthy authority, apology, and rebuilding trust.", label: "View Complete Program", href: "/shop" },
                { name: "Individual Audio Lessons", detail: "Choose the topic that fits your current situation. Learn and revisit insights at a pace that works for you.", label: "Explore All 12 Lessons", href: "/shop" },
                { name: "Written Manuscripts & Bundles", detail: "Read the material on your own, take notes, and revisit the ideas that matter most to you.", label: "View Written Resources", href: "/shop" },
              ].map((offer) => (
                <article key={offer.name} className="flex flex-col rounded-xl border-2 border-[#145b35] bg-white p-7 shadow-sm">
                  <h3 className="text-2xl font-extrabold">{offer.name}</h3>
                  <p className="mt-3 flex-1 leading-relaxed text-[#425047]">{offer.detail}</p>
                  <a href={offer.href} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#145b35] px-5 py-3 font-extrabold text-white hover:bg-[#114629]">
                    {offer.label} <ArrowRight className="h-4 w-4" aria-hidden="true"/>
                  </a>
                </article>
              ))}
            </div>
            <div className="mt-9 rounded-xl border border-[#e4c669] bg-[#fff8e0] p-6">
              <h3 className="text-xl font-extrabold">More Original Intellectual Property</h3>
              <p className="mt-2 text-[#425047]">Books, original songs, spoken word, and additional learning products will join the catalog as rights, delivery formats, and GoHighLevel sales links are confirmed. They are not available for purchase here yet.</p>
            </div>
          </div>
        </section>

        <section id="brian-story" aria-labelledby="creator-heading" className="bg-[#17231c] py-14 text-white md:py-18">
          <div className="container grid items-center gap-7 md:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f2c230]">Meet the Creator</p>
              <h2 id="creator-heading" className="mt-3 text-3xl font-extrabold md:text-4xl">Original Works by Brian Keith Hill</h2>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-white/80">Papa Life is a fatherhood resource center sharing Brian's original ideas, teaching, audio lessons, and written works for fathers of adult children. The goal is to make his knowledge accessible without requiring an appointment or personal meeting.</p>
            </div>
            <div className="rounded-xl border border-[#f2c230]/40 bg-white/10 p-6 text-center">
              <p className="text-lg font-extrabold text-[#f2c230]">Not sure which product fits?</p>
              <p className="mt-2 text-sm text-white/80">Brian's Digital AI can explain the resources, answer product questions, and help you decide what to explore.</p>
              <button type="button" onClick={openPapaAiCoach} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#f2c230] px-5 py-3 font-extrabold text-[#17231c]">
                <MessageCircle className="h-5 w-5" aria-hidden="true"/> Ask Brian's Digital AI
              </button>
            </div>
          </div>
        </section>

        <section aria-labelledby="how-to-purchase" className="bg-[#f2c230] py-12 text-[#17231c]">
          <div className="container max-w-4xl text-center">
            <h2 id="how-to-purchase" className="text-3xl font-black md:text-4xl">Explore Here. Purchase Through GoHighLevel.</h2>
            <p className="mt-4 text-lg">PapaLifeCoach.com helps you discover and choose. Approved product details, agreement or terms, payment, and access are handled through the separate GoHighLevel sales process—not through checkout on this website.</p>
            <a href="/shop" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#145b35] px-8 py-3 font-extrabold text-white">Browse the Product Catalog <ArrowRight className="h-4 w-4"/></a>
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
