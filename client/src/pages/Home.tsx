import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { heroBackgroundImage } from "@/lib/site-assets";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Compass,
  Crown,
  Heart,
  Menu,
  Scale,
  X,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { label: "Start Here", href: "/#start-here" },
  { label: "AI Coach", href: "/ai-coach" },
  { label: "Assessment", href: "/assessment" },
  { label: "Marlee", href: "/marlee-assessment" },
  { label: "Workshop", href: "/papa-first-lesson" },
  { label: "PAPA Framework", href: "/#framework" },
  { label: "Join", href: "/go/join" },
];

const marleeAssessmentLink = "https://getmarlee.com/app/invite/link/683d41b3ac650107f5a49f3de7866dc4";

const comparisonRows = [
  ["My son rarely calls anymore.", "Rebuild meaningful communication without pressure."],
  ["My daughter keeps me at a distance.", "Understand what may be beneath the silence."],
  ["Every conversation feels guarded or tense.", "Learn a new way to approach hard conversations."],
  ["I provided, but I don’t feel connected.", "Move from provider-only to present father."],
  ["I don’t know what to say anymore.", "Gain practical words, tools, and next steps."],
  ["I wonder if it’s too late.", "Begin again with humility, clarity, and hope."],
];

const pathSteps = [
  {
    number: "01",
    title: "Get Clear",
    copy: "Take the free assessment to identify where distance, tension, or old patterns may be shaping the relationship.",
    button: "Take the Assessment",
    href: "/assessment",
  },
  {
    number: "02",
    title: "Learn the New Role",
    copy: "Discover why fatherhood changes when children become adults—and how to move from pressure to presence.",
    button: "Start the Free Workshop",
    href: "/papa-first-lesson",
  },
  {
    number: "03",
    title: "Understand Motivation",
    copy: "Use Marlee inside the Papa Life Growth System to discover what motivates you, how you decide, and how your natural style affects relationships.",
    button: "Take the Marlee Motivation Assessment",
    href: "/marlee-assessment",
  },
  {
    number: "04",
    title: "Practice the Path",
    copy: "Use the PAPA Framework, guided tools, and brotherhood to rebuild trust with humility and consistency.",
    button: "Explore Papa Life",
    href: "/go/join",
  },
];

const framework = [
  {
    letter: "P",
    title: "Purpose",
    description:
      "Know who you are now that fatherhood is no longer centered on daily provision and control.",
    Icon: Compass,
    accent: "text-brand-yellow",
    border: "border-brand-yellow/35",
  },
  {
    letter: "A",
    title: "Authority",
    description:
      "Lead through character, humility, and consistency—not position, pressure, or being right.",
    Icon: Crown,
    accent: "text-primary",
    border: "border-primary/35",
  },
  {
    letter: "P",
    title: "Presence",
    description:
      "Listen before fixing. Stay emotionally available. Become safe enough for honest conversation.",
    Icon: Heart,
    accent: "text-accent",
    border: "border-accent/35",
  },
  {
    letter: "A",
    title: "Alignment",
    description:
      "Bring your faith, words, values, and daily actions into the same lane.",
    Icon: Scale,
    accent: "text-brand-yellow",
    border: "border-brand-yellow/35",
  },
];

const workshopPoints = [
  "Understand why well-meaning fathers get stuck.",
  "See the difference between authority and influence.",
  "Learn six steady moves for rebuilding trust.",
  "Choose one next step without forcing the relationship.",
];

const membershipPoints = [
  "Work through Purpose, Authority, Presence, and Alignment.",
  "Use guided lessons and reflection tools.",
  "Build consistency instead of relying on one emotional moment.",
  "Grow alongside fathers who understand this season.",
];

function PrimaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      size="lg"
      className={`h-auto min-h-14 rounded-full bg-primary px-7 py-4 text-base font-extrabold text-primary-foreground shadow-[0_0_24px_rgba(34,197,94,0.25)] hover:bg-primary/90 ${className}`}
      asChild
    >
      <a href={href}>
        {children}
        <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
      </a>
    </Button>
  );
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <PageMeta
        title="Papa Life — A Practical Path for Fathers of Adult Children"
        description="Papa Life helps fathers understand distance, tension, and changing roles with adult children—and begin rebuilding connection with humility, faith, and practical next steps."
        keywords="fathers of adult children, fatherhood assessment, reconnect with adult child, PAPA Framework, Papa Life"
      />

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="container flex h-20 items-center justify-between gap-4">
          <a href="/" className="min-w-0 transition-opacity hover:opacity-90" aria-label="Papa Life home">
            <SiteLogo size="md" />
          </a>

          <div className="hidden items-center gap-5 lg:flex">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-semibold text-white/80 transition-colors hover:text-brand-yellow"
              >
                {item.label}
              </a>
            ))}
          </div>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          >
            {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-navigation" className="border-t border-white/10 bg-black px-4 py-4 lg:hidden">
            <div className="container flex flex-col gap-1">
              {navigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-lg px-4 py-3 text-base font-semibold text-white/85 hover:bg-white/5 hover:text-brand-yellow"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>

      <header className="relative flex min-h-[760px] items-center overflow-hidden pt-20 md:min-h-screen">
        <div className="absolute inset-0">
          <img
            src={heroBackgroundImage}
            alt=""
            className="h-full w-full object-cover object-center"
            loading="eager"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
          <div className="papa-hero-radial absolute inset-0 opacity-70" />
        </div>

        <div className="container relative z-10 py-20">
          <div className="max-w-4xl">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.24em] text-brand-yellow md:text-base">
              For fathers of adult children
            </p>
            <h1 className="max-w-4xl font-heading text-4xl font-extrabold leading-[1.08] text-white md:text-6xl lg:text-7xl">
              You Didn’t Stop Being a Father.{" "}
              <span className="text-brand-yellow">But Something Changed.</span>
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/78 md:text-2xl md:leading-relaxed">
              If silence, tension, or distance has grown between you and your adult child, Papa Life gives
              you a practical, faith-grounded path to understand what happened—and begin rebuilding
              connection without pressure.
            </p>
            <div className="mt-10 flex flex-col items-start gap-3">
              <PrimaryButton href="/assessment">Take the Free Fatherhood Assessment</PrimaryButton>
              <p className="pl-2 text-sm font-medium text-white/65">
                Free · About 5 minutes · No signup required
              </p>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="border-y border-white/10 bg-gradient-to-br from-brand-yellow/10 via-black to-primary/10 py-16 md:py-20">
          <div className="container">
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
              <div>
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-brand-yellow">
                  Papa Life Growth System
                </p>
                <h2 className="text-4xl font-bold md:text-5xl">Understand What Motivates You</h2>
                <p className="mt-6 text-lg leading-relaxed text-white/75 md:text-xl">
                  Papa Life is now using Marlee to help fathers, leaders, coaches, and participants better
                  understand how they are motivated, how they make decisions, how they communicate, and
                  how they build relationships.
                </p>
                <p className="mt-5 text-lg leading-relaxed text-white/70">
                  This assessment is not about labeling people. It is about creating greater
                  self-awareness, stronger communication, and healthier relationships.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <PrimaryButton href={marleeAssessmentLink}>Take the Marlee Assessment</PrimaryButton>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-auto min-h-14 rounded-full border-white/25 px-7 py-4 text-base font-extrabold text-white hover:border-brand-yellow hover:bg-brand-yellow hover:text-black"
                  >
                    <a href="/marlee-assessment">
                      Learn More
                      <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              </div>

              <Card className="overflow-hidden border-brand-yellow/30 bg-black/55 shadow-2xl">
                <CardContent className="p-7 md:p-9">
                  <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-full border border-brand-yellow/30 bg-brand-yellow/10 text-brand-yellow">
                    <Brain className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Marlee Motivation Assessment</h3>
                  <p className="mt-4 leading-relaxed text-white/70">
                    Discover what motivates you, how you make decisions, and how your natural style may
                    impact leadership, communication, and relationships.
                  </p>
                  <Button
                    asChild
                    className="mt-7 min-h-12 rounded-full bg-brand-yellow px-5 font-extrabold text-black hover:bg-white"
                  >
                    <a href={marleeAssessmentLink}>
                      Start Assessment
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="start-here" className="scroll-mt-20 py-20 md:py-28">
          <div className="container">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-primary">Start here</p>
              <h2 className="text-4xl font-bold md:text-5xl">Is This You?</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground md:text-xl">
                You may not have the language for what changed. You only know the relationship does not
                feel the way you hoped it would.
              </p>
            </div>

            <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-card/70 shadow-2xl">
              <div className="hidden grid-cols-2 bg-white/[0.06] md:grid">
                <div className="border-r border-white/10 p-5 text-lg font-bold text-brand-yellow">
                  What You May Be Experiencing
                </div>
                <div className="p-5 text-lg font-bold text-primary">How Papa Life Helps</div>
              </div>
              <div className="grid gap-4 p-4 md:gap-0 md:p-0">
                {comparisonRows.map(([problem, solution]) => (
                  <div
                    key={problem}
                    className="grid rounded-xl border border-white/10 bg-black/25 md:grid-cols-2 md:rounded-none md:border-x-0 md:border-b-0 md:bg-transparent"
                  >
                    <div className="p-5 md:border-r md:border-white/10">
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-yellow md:hidden">
                        What you may be experiencing
                      </p>
                      <p className="text-base font-semibold text-white md:text-lg">{problem}</p>
                    </div>
                    <div className="border-t border-white/10 p-5 md:border-t-0">
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary md:hidden">
                        How Papa Life helps
                      </p>
                      <p className="text-base text-white/70 md:text-lg">{solution}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.025] py-20 md:py-28">
          <div className="container">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-brand-yellow">
                Your path forward
              </p>
              <h2 className="text-4xl font-bold md:text-5xl">You Do Not Have to Fix Everything Today.</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground md:text-xl">
                Start by getting honest about where the relationship stands. Then learn a better way to
                show up—one steady step at a time.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {pathSteps.map((step) => (
                <Card key={step.number} className="border-white/10 bg-card/80">
                  <CardContent className="flex h-full flex-col p-7">
                    <p className="text-sm font-black tracking-[0.2em] text-brand-yellow">{step.number}</p>
                    <h3 className="mt-4 text-2xl font-bold">{step.title}</h3>
                    <p className="mt-4 flex-1 text-base leading-relaxed text-muted-foreground">{step.copy}</p>
                    <Button
                      asChild
                      variant="outline"
                      className="mt-7 min-h-12 justify-between rounded-full border-white/20 px-5 text-white hover:border-primary hover:bg-primary hover:text-black"
                    >
                      <a href={step.href}>
                        {step.button}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="framework" className="scroll-mt-20 py-20 md:py-28">
          <div className="container">
            <div className="mx-auto mb-14 max-w-4xl text-center">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-primary">
                The PAPA Framework
              </p>
              <h2 className="text-4xl font-bold md:text-5xl">A New Way to Lead as a Father</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground md:text-xl">
                Papa Life is not generic life coaching. It is a fatherhood path for becoming the kind of
                man your adult children can experience as grounded, trustworthy, and present.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {framework.map(({ letter, title, description, Icon, accent, border }) => (
                <Card key={title} className={`relative overflow-hidden border bg-card/75 ${border}`}>
                  <CardContent className="p-7">
                    <span className="absolute right-5 top-1 select-none text-8xl font-black text-white/[0.035]">
                      {letter}
                    </span>
                    <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/50 ${accent}`}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-2xl font-bold">{title}</h3>
                    <p className="mt-4 leading-relaxed text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-white/10 py-20 md:py-28">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-black to-brand-yellow/5" />
          <div className="container relative z-10">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
              <div>
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-accent">Free Workshop</p>
                <h2 className="text-4xl font-bold md:text-5xl">Fatherhood Didn’t End. It Changed.</h2>
                <p className="mt-6 text-lg leading-relaxed text-white/70 md:text-xl">
                  This free workshop gives you a clear map for the adult-child season—without blame,
                  shame, or vague motivation.
                </p>
                <div className="mt-9">
                  <PrimaryButton href="/papa-first-lesson">Start the Free Workshop</PrimaryButton>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8">
                <ul className="space-y-5">
                  {workshopPoints.map((point) => (
                    <li key={point} className="flex items-start gap-4">
                      <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-brand-yellow" aria-hidden="true" />
                      <span className="text-lg leading-relaxed text-white/85">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container">
            <div className="mx-auto max-w-5xl rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-black p-7 shadow-2xl md:p-12">
              <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
                <div>
                  <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-primary">
                    Brotherhood and practice
                  </p>
                  <h2 className="text-4xl font-bold md:text-5xl">Join Papa Life</h2>
                  <p className="mt-6 text-lg leading-relaxed text-white/70">
                    When you are ready to go deeper, Papa Life gives you a structured journey, guided
                    reflection, practical tools, and a community of fathers committed to changing first.
                  </p>
                  <div className="mt-9 flex flex-col items-start gap-5">
                    <PrimaryButton href="/go/join">Explore Papa Life Membership</PrimaryButton>
                    <a
                      href="/papa-journey"
                      className="inline-flex items-center gap-2 font-bold text-brand-yellow underline decoration-brand-yellow/40 underline-offset-4 hover:text-white"
                    >
                      See the Full Papa Journey
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>

                <div className="grid content-center gap-4">
                  {membershipPoints.map((point) => (
                    <div key={point} className="flex items-start gap-4 rounded-xl border border-white/10 bg-black/30 p-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <span className="leading-relaxed text-white/80">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-white/10 py-24 text-center md:py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-yellow/10 via-accent/5 to-black" />
          <div className="container relative z-10">
            <h2 className="mx-auto max-w-4xl text-4xl font-extrabold md:text-6xl">
              As Long as You’re Both Alive, <span className="text-brand-yellow">It’s Not Too Late.</span>
            </h2>
            <p className="mt-6 text-xl text-white/70 md:text-2xl">Begin the conversation today.</p>
            <div className="mt-9 flex justify-center">
              <PrimaryButton href="/assessment">Take the Free Fatherhood Assessment</PrimaryButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#070707] py-14">
        <div className="container">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <SiteLogo size="lg" />
              <p className="mt-5 max-w-lg leading-relaxed text-muted-foreground">
                A practical, faith-grounded fatherhood path for men navigating distance, tension, or a
                changing relationship with their adult children.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-white">Papa Life</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {navigation.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="hover:text-brand-yellow">
                      {item.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="/papa-journey" className="hover:text-brand-yellow">
                    Full Papa Journey
                  </a>
                </li>
                <li>
                  <a href="/papa-life-master-knowledge-center" className="hover:text-brand-yellow">
                    Master Knowledge Center
                  </a>
                </li>
                <li>
                  <a href="/about-brian-keith-hill" className="hover:text-brand-yellow">
                    About Brian Keith Hill
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white">Member &amp; Team Tools</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li><a href="/member-login" className="hover:text-brand-yellow">Member Login</a></li>
                <li><a href="/courses" className="hover:text-brand-yellow">Courses</a></li>
                <li><a href="/strategist" className="hover:text-brand-yellow">Strategist</a></li>
                <li><a href="/theme-matrix" className="hover:text-brand-yellow">Weekly Themes</a></li>
                <li><a href="/operators" className="hover:text-brand-yellow">Operators</a></li>
                <li><a href="/governance" className="hover:text-brand-yellow">Governance</a></li>
                <li><a href="/login" className="hover:text-brand-yellow">CRM Login</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-brand-yellow">Live Pages</h3>
                <p className="mt-1 text-sm text-white/65">
                  Open the Tuesday control room or the complete P2P Digital Dojo video tour.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="/tuesday"
                  className="inline-flex items-center justify-center rounded-full bg-brand-yellow px-5 py-3 text-sm font-extrabold text-black transition-colors hover:bg-white"
                >
                  Tuesday Live
                </a>
                <a
                  href="/walkthrough"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:border-brand-yellow hover:text-brand-yellow"
                >
                  P2P Walkthrough
                </a>
              </div>
            </div>
          </div>

          <Separator className="my-9 bg-white/10" />
          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} Boss Mobile Life Coach. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <a href="/privacy-policy" className="hover:text-brand-yellow">Privacy Policy</a>
              <a href="/terms-of-service" className="hover:text-brand-yellow">Terms of Service</a>
              <a href="tel:+15104152098" className="hover:text-brand-yellow">Brian Keith Hill · 510.415.2098</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
