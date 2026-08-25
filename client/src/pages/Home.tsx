import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { brianKeithHillHeadshot } from "@/lib/site-assets";
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { label: "Start Here", href: "#is-this-you" },
  { label: "Brian’s Story", href: "#brian-story" },
  { label: "Media Library", href: "/media-library" },
  { label: "Fatherhood Check-In", href: "/assessment" },
  { label: "Member Login", href: "/member-login" },
];

const selfIdentificationStatements = [
  "My son or daughter rarely calls or responds.",
  "I am not sure when or why our relationship changed.",
  "I miss being part of my grandchildren’s lives.",
  "I want to apologize, but I do not know what to say.",
  "Our conversations quickly become defensive or tense.",
  "I regret choices I made when my children were younger.",
  "I have prayed for reconciliation but still need practical direction.",
  "I want to rebuild trust without trying to control my adult child.",
  "I know something needs to change, and I am willing to begin with myself.",
];

const costOfWaiting = [
  "More missed birthdays and holidays.",
  "Greater emotional distance.",
  "Lost time with grandchildren.",
  "Misunderstandings becoming fixed family stories.",
  "Additional years of regret.",
  "Opportunities for conversation passing without preparation.",
];

const fathersServed = [
  "Love their adult children.",
  "Want a healthier relationship.",
  "Carry regret, confusion, or unanswered questions.",
  "Want to rebuild trust.",
  "Need practical guidance about what to say and what not to say.",
  "Are willing to listen before defending themselves.",
  "Are willing to examine their choices and patterns.",
  "Understand that change may take time.",
  "Want Scripture-centered guidance and the support of other fathers.",
];

const readinessBoundaries = [
  "You only want help proving your adult child is wrong.",
  "You want a technique for forcing someone to respond.",
  "You believe the other person must change first.",
  "You are unwilling to examine your own actions.",
  "You expect an instant reconciliation guarantee.",
];

const transformations = [
  ["Silence", "Safer conversation"],
  ["Defensiveness", "Listening"],
  ["Shame", "Healthy responsibility"],
  ["Confusion", "Clarity"],
  ["Control", "Presence"],
  ["Isolation", "Community"],
  ["Fear", "Renewed hope"],
];

const benefits = [
  "Listen without immediately defending.",
  "Take responsibility without collapsing into shame.",
  "Apologize without explanation or manipulation.",
  "Understand authority without control.",
  "Rebuild trust through small, consistent actions.",
  "Respond wisely when an adult child pulls away.",
  "Lead with presence instead of pressure.",
  "Become emotionally and spiritually safer to talk to.",
];

const mostFatherhoodPrograms = [
  "Parenting younger children",
  "Discipline and household structure",
  "Child development",
  "Managing the family",
];

const papaLifeDifference = [
  "Rebuilding relationships with adult children",
  "Restoring trust after distance or conflict",
  "Learning to listen without defending",
  "Leading through humility, presence, and consistency",
];

function ActionLink({
  href,
  children,
  light = false,
}: {
  href: string;
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <a
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-extrabold transition-transform hover:-translate-y-0.5 ${
        light
          ? "bg-[#f2c230] text-[#17231c] hover:bg-[#f7d75e]"
          : "bg-[#145b35] text-white hover:bg-[#0f492a]"
      }`}
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const joinHref = "/go/join?src=homepage";

  function openPapaAiCoach() {
    window.dispatchEvent(new Event("papa-ai:open"));
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f0db] text-[#17231c]">
      <PageMeta
        title="Papa Life | Help for Fathers of Adult Children"
        description="Papa Life helps fathers of adult children rebuild trust, restore communication, and move from distance to reconnection through Scripture-centered guidance and practical tools."
        keywords="fathers of adult children, reconnect with adult child, Papa Life, fatherhood, relationship repair"
      />

      <nav className="relative z-50 border-b border-[#17231c]/20 bg-[#f2c230]">
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
              href={joinHref}
              className="rounded-md bg-[#b33a32] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#942e29]"
            >
              Enroll Now — Immediate Access
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
          <div className="border-t border-[#17231c]/20 bg-[#f2c230] px-4 py-4 lg:hidden">
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
                href={joinHref}
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 rounded-md bg-[#b33a32] px-4 py-3 font-extrabold text-white"
              >
                Enroll Now — Immediate Access
              </a>
            </div>
          </div>
        )}
      </nav>

      <header className="relative overflow-hidden bg-[#f8f0db] text-[#17231c]">
        <img
          src="/images/papa-life-reconnection-path-hero.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(235,218,179,0.94)_0%,rgba(235,218,179,0.82)_40%,rgba(235,218,179,0.28)_58%,rgba(235,218,179,0.04)_72%)]" />
        <div className="container relative z-10 flex min-h-[650px] items-center py-16 md:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#b33a32]">
              Papa Life · For Fathers of Adult Children
            </p>
            <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.04] sm:text-5xl md:text-7xl">
              Your Adult Child May Be Grown, but Your Fatherhood Is Not Finished.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#314239] md:text-xl">
              If you are ready to be taught, humbled, and led forward, Papa Life will help you take the next faithful step. Some doors between fathers and adult children cannot be forced open. Only God can make a way—and your part is to be ready when He does.
            </p>
            <p className="mt-5 text-lg font-bold text-[#145b35] md:text-xl">
              As long as you’re both alive, it’s never too late.
            </p>
            <div className="mt-8 max-w-2xl rounded-xl border border-[#145b35]/30 bg-white/75 p-4 shadow-lg backdrop-blur-sm sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div>
                <p className="font-extrabold text-[#17231c]">Experience AI in your fatherhood.</p>
                <p className="mt-1 text-sm leading-relaxed text-[#314239]">
                  Take one minute to share what you are facing and experience how AI can help you understand where you are, explore the app, and choose one practical next step.
                </p>
              </div>
              <button
                type="button"
                onClick={openPapaAiCoach}
                className="mt-4 inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#f2c230] px-5 py-3 text-sm font-extrabold text-[#17231c] hover:bg-white sm:mt-0"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                Try the 1-Minute AI Experience
              </button>
            </div>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <ActionLink href={joinHref} light>
                Enroll Now — Immediate Access
              </ActionLink>
              <a
                href="/assessment"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#145b35]/45 bg-white/55 px-6 py-3 font-extrabold text-[#145b35] hover:border-[#145b35] hover:bg-white"
              >
                Take the 2-Minute Check-In
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-5 text-sm font-semibold text-[#314239]">
              We do not help fathers win arguments. We help fathers rebuild relationships.
            </p>
          </div>
        </div>
      </header>

      <div className="bg-[#b33a32] py-5 text-center text-white">
        <p className="container text-sm font-black uppercase tracking-[0.16em] md:text-base">
          Faith-grounded · Purpose-driven · Community-powered
        </p>
      </div>

      <main>
        <section aria-labelledby="why-papa-life-heading" className="bg-white py-14 md:py-18">
          <div className="container">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#b33a32]">
              For Fathers of Adult Children
            </p>
            <h2 id="why-papa-life-heading" className="mt-3 max-w-4xl text-3xl font-extrabold md:text-5xl">
              Why Papa Life?
            </h2>
            <p className="mt-5 max-w-4xl text-xl font-extrabold leading-relaxed text-[#17231c]">
              Most fatherhood programs focus on raising children. Papa Life exists for fathers whose sons and daughters are already adults.
            </p>
            <p className="mt-4 max-w-4xl text-lg leading-relaxed text-[#314239]">
              Papa Life serves fathers whose children are already grown. This work is not about custody, co-parenting, or raising young children. It is about rebuilding trust, restoring meaningful communication, taking responsibility without shame, and becoming safer to talk to.
            </p>
            <div className="mt-9 grid gap-5 lg:grid-cols-2">
              <article className="rounded-xl border border-[#17231c]/15 bg-[#f8f0db] p-6 md:p-8">
                <h3 className="text-2xl font-extrabold text-[#b33a32]">Most Fatherhood Programs</h3>
                <ul className="mt-5 space-y-3">
                  {mostFatherhoodPrograms.map((item) => (
                    <li key={item} className="flex gap-3 font-semibold leading-relaxed">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#b33a32]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="rounded-xl border-2 border-[#145b35] bg-[#145b35] p-6 text-white shadow-lg md:p-8">
                <h3 className="text-2xl font-extrabold text-[#f2c230]">Papa Life</h3>
                <ul className="mt-5 space-y-3">
                  {papaLifeDifference.map((item) => (
                    <li key={item} className="flex gap-3 font-semibold leading-relaxed">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#f2c230]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section id="is-this-you" aria-labelledby="is-this-you-heading" className="scroll-mt-6 bg-[#f8f0db] py-16 md:py-20">
          <div className="container">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#b33a32]">
              Welcome to Papa Life
            </p>
            <h2 id="is-this-you-heading" className="mt-3 max-w-4xl text-3xl font-extrabold md:text-5xl">
              Does This Sound Like You?
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[#314239]">
              You love your adult child. You want a healthier relationship. And you are ready to begin with the part you can change.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {selfIdentificationStatements.map((statement) => (
                <div key={statement} className="flex gap-3 rounded-lg border border-[#17231c]/15 bg-white p-5 shadow-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#145b35]" aria-hidden="true" />
                  <p className="font-semibold leading-relaxed">{statement}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 max-w-4xl rounded-lg bg-[#f2c230] p-6 text-lg font-extrabold">
              If several of these statements describe your life, Papa Life was created for fathers like you.
            </p>
            <div className="mt-7">
              <ActionLink href="#transformation">See How Papa Life Helps</ActionLink>
            </div>
          </div>
        </section>

        <section aria-labelledby="cost-of-waiting-heading" className="bg-[#b33a32] py-16 text-white md:py-20">
          <div className="container grid items-start gap-10 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f6cf55]">Why begin now</p>
              <h2 id="cost-of-waiting-heading" className="mt-3 text-4xl font-extrabold md:text-5xl">
                Silence Rarely Heals Itself.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">
                Continued waiting can leave a father carrying more distance, more regret, and less preparation for the conversations that may still be possible.
              </p>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {costOfWaiting.map((item) => (
                  <li key={item} className="flex gap-3 leading-relaxed">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#f2c230]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <blockquote className="rounded-xl bg-[#17231c] p-8 text-2xl font-extrabold leading-relaxed text-[#f2c230] shadow-xl">
              “The greatest risk is not hearing ‘no.’ The greatest risk is allowing another year to pass without becoming ready.”
            </blockquote>
          </div>
        </section>

        <section aria-labelledby="fathers-served-heading" className="bg-white py-16 md:py-20">
          <div className="container">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#145b35]">A place for honest work</p>
            <h2 id="fathers-served-heading" className="mt-3 text-4xl font-extrabold md:text-5xl">
              Papa Life Is for Fathers Who…
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {fathersServed.map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border border-[#17231c]/15 bg-[#f8f0db] p-5">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#145b35]" aria-hidden="true" />
                  <p className="font-semibold leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="readiness-heading" className="bg-[#17231c] py-16 text-white md:py-20">
          <div className="container grid gap-10 lg:grid-cols-[1fr_.9fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f2c230]">A compassionate boundary</p>
              <h2 id="readiness-heading" className="mt-3 max-w-3xl text-4xl font-extrabold md:text-5xl">
                Papa Life May Not Be the Right Next Step Yet If…
              </h2>
              <ul className="mt-8 space-y-4">
                {readinessBoundaries.map((item) => (
                  <li key={item} className="flex gap-3 text-lg leading-relaxed text-white/85">
                    <X className="mt-1 h-5 w-5 shrink-0 text-[#b33a32]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="self-center rounded-xl border border-[#f2c230]/30 bg-white/5 p-8">
              <p className="text-2xl font-extrabold leading-relaxed text-[#f2c230]">
                The door remains open. Papa Life begins when a father is willing to work on the part of the relationship he can control—himself.
              </p>
            </div>
          </div>
        </section>

        <section id="transformation" aria-labelledby="transformation-heading" className="scroll-mt-6 bg-[#f2c230] py-16 md:py-20">
          <div className="container">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#b33a32]">From distance to reconnection</p>
            <h2 id="transformation-heading" className="mt-3 max-w-5xl text-4xl font-extrabold md:text-5xl">
              From Distance to Reconnection Begins With the Father You Become.
            </h2>
            <div className="mt-9 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {transformations.map(([from, to]) => (
                <div key={from} className="flex items-center justify-between gap-4 rounded-lg bg-[#f8f0db] p-5 shadow-sm">
                  <span className="font-bold text-[#b33a32]">{from}</span>
                  <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="font-extrabold text-[#145b35]">{to}</span>
                </div>
              ))}
            </div>
            <p className="mt-8 max-w-3xl text-xl font-extrabold leading-relaxed">
              We cannot control another person’s response. We can change how we show up.
            </p>
          </div>
        </section>

        <section aria-labelledby="benefits-heading" className="bg-[#f8f0db] py-16 md:py-20">
          <div className="container">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#145b35]">Practical guidance</p>
            <h2 id="benefits-heading" className="mt-3 text-4xl font-extrabold md:text-5xl">
              What Papa Life Helps Fathers Do
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {benefits.map((item) => (
                <div key={item} className="flex gap-3 rounded-lg bg-white p-5 shadow-sm">
                  <ShieldCheck className="h-6 w-6 shrink-0 text-[#145b35]" aria-hidden="true" />
                  <p className="font-semibold leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 grid gap-4 rounded-xl bg-[#145b35] p-6 text-white md:grid-cols-3 md:p-8">
              {['Start with clarity.', 'Learn the new role.', 'Practice the path.'].map((step, index) => (
                <p key={step} className="text-center text-lg font-extrabold">
                  <span className="mr-2 text-[#f2c230]">0{index + 1}</span>
                  {step}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section id="brian-story" aria-labelledby="brian-story-heading" className="bg-white py-16 md:py-20">
          <div className="container grid items-center gap-8 md:grid-cols-[260px_1fr]">
            <img
              src={brianKeithHillHeadshot}
              alt="Brian Keith Hill, founder of Boss Mobility and Papa Life"
              className="aspect-square w-full rounded-xl object-cover object-top shadow-lg"
            />
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#b33a32]">A father-to-father word from Brian</p>
              <h2 id="brian-story-heading" className="mt-3 text-3xl font-extrabold md:text-5xl">I Know What It Is to Carry the Silence.</h2>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[#314239]">
                Brian Keith Hill is the founder of Boss Mobility and Papa Life. He helps fathers face the places where pride, pain, misunderstanding, and silence have damaged family relationships—then take the next honest step with faith, humility, and presence.
              </p>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#314239]">
                Fifty years of marriage have also taught Brian that fatherhood was never meant to be carried alone. He is grateful for the faithful love, honest correction, grace, and companionship God has used to shape the father he is still becoming.
              </p>
              <a href="/about-brian-keith-hill" className="mt-6 inline-flex items-center gap-2 font-extrabold text-[#145b35] hover:text-[#b33a32]">
                About Brian and the work
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section aria-labelledby="final-invitation-heading" className="bg-[#17231c] py-20 text-center text-white">
          <div className="container">
            <h2 id="final-invitation-heading" className="text-4xl font-extrabold md:text-5xl">
              You Do Not Have to Carry This Alone.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
              You may not be able to rewrite yesterday, but you can decide what kind of father you will be from this day forward.
            </p>
            <div className="mt-8">
              <ActionLink href={joinHref} light>
                Enroll Now — Immediate Access
              </ActionLink>
            </div>
            <p className="mt-5 text-white/75">
              Begin the work of becoming the father healthy reconnection may become possible with.
            </p>
            <p className="mt-6 text-lg font-extrabold text-[#f2c230]">Papa Life Membership — $4.99 per month</p>
            <p className="mt-8 text-2xl font-extrabold text-[#f2c230]">Father by title. Father by presence.</p>
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
            <a href="/member-login" className="hover:text-[#f2c230]">Member Login</a>
            <a href="/privacy-policy" className="hover:text-[#f2c230]">Privacy</a>
            <a href="/terms-of-service" className="hover:text-[#f2c230]">Terms</a>
            <a href="tel:+15104152098" className="hover:text-[#f2c230]">510.415.2098</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
