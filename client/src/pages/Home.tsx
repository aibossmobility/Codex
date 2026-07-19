import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { brianKeithHillHeadshot, heroBackgroundImage } from "@/lib/site-assets";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  Heart,
  Menu,
  ShieldCheck,
  Target,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { label: "Start Here", href: "/#start-here" },
  { label: "Assessment", href: "/assessment" },
  { label: "Workshop", href: "/papa-first-lesson" },
  { label: "Course 11", href: "/courses/11" },
  { label: "Shop", href: "/shop" },
  { label: "Member Login", href: "/member-login" },
];

const features = [
  {
    title: "Get Clear",
    copy: "Understand where distance, tension, or old patterns may be shaping the relationship.",
    href: "/assessment",
    label: "Take the assessment",
    Icon: Compass,
    tone: "bg-[#f6cf55]",
  },
  {
    title: "Learn the New Role",
    copy: "Move from pressure and control toward presence, humility, and trustworthy influence.",
    href: "/papa-first-lesson",
    label: "Start the workshop",
    Icon: Users,
    tone: "bg-[#dbe8cf]",
  },
  {
    title: "Practice with Purpose",
    copy: "Use practical tools and reflection to make one steady change at a time.",
    href: "/papa-journey",
    label: "See the journey",
    Icon: Target,
    tone: "bg-[#f6cf55]",
  },
  {
    title: "Build Your Legacy",
    copy: "Create a relationship your adult children can experience as safe, grounded, and present.",
    href: "/go/join",
    label: "Explore membership",
    Icon: Heart,
    tone: "bg-[#dbe8cf]",
  },
];

const membershipPoints = [
  "Immediate access to Course 11",
  "Twelve audio lessons, Lessons 75–86",
  "Guided reflection and progress tracking",
  "No free trial—cancel anytime",
];

function ActionLink({ href, children, light = false }: { href: string; children: React.ReactNode; light?: boolean }) {
  return (
    <a
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-extrabold transition-transform hover:-translate-y-0.5 ${
        light ? "bg-[#f2c230] text-[#17231c] hover:bg-[#f7d75e]" : "bg-[#145b35] text-white hover:bg-[#0f492a]"
      }`}
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f2c230] text-[#17231c]">
      <PageMeta
        title="Papa Life — A Practical Path for Fathers of Adult Children"
        description="Papa Life helps fathers rebuild connection with adult children through faith, practical tools, and the PAPA Framework."
        keywords="fathers of adult children, reconnect with adult child, Papa Life, Course 11"
      />

      <nav className="relative z-50 border-b border-[#17231c]/20 bg-[#f2c230]">
        <div className="container flex h-20 items-center justify-between gap-4">
          <a href="/" aria-label="Papa Life home"><SiteLogo size="md" /></a>
          <div className="hidden items-center gap-6 lg:flex">
            {navigation.map((item) => (
              <a key={item.label} href={item.href} className="text-sm font-bold text-[#17231c] hover:text-[#b33a32]">
                {item.label}
              </a>
            ))}
            <a href="/go/join" className="rounded-md bg-[#b33a32] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#942e29]">
              Join Papa Life
            </a>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#17231c]/30 lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-[#17231c]/20 bg-[#f2c230] px-4 py-4 lg:hidden">
            <div className="container flex flex-col gap-1">
              {navigation.map((item) => (
                <a key={item.label} href={item.href} className="rounded-md px-4 py-3 font-bold hover:bg-[#145b35] hover:text-white">
                  {item.label}
                </a>
              ))}
              <a href="/go/join" className="mt-2 rounded-md bg-[#b33a32] px-4 py-3 font-extrabold text-white">Join Papa Life</a>
            </div>
          </div>
        )}
      </nav>

      <header className="relative min-h-[610px] overflow-hidden bg-[#17231c] text-white">
        <div className="absolute inset-y-0 right-0 hidden w-[47%] bg-[#f8f0db] md:block">
          <img src={brianKeithHillHeadshot} alt="Brian Keith Hill" className="h-full w-full object-cover object-center" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#101712] via-[#101712] md:via-[#101712]/95 md:to-transparent" />
        <div className="container relative z-10 flex min-h-[610px] items-center py-16">
          <div className="max-w-2xl">
            <p className="mb-5 text-sm font-black uppercase tracking-[0.22em] text-[#f2c230]">Faith · Purpose · Presence · Alignment</p>
            <h1 className="font-heading text-5xl font-extrabold leading-[1.02] md:text-7xl">
              Stronger Faith.<br />Better <span className="text-[#b33a32]">Father.</span><br />Lasting <span className="text-[#76b947]">Legacy.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85 md:text-xl">
              Choose the path that fits you: join the ongoing Papa Life journey, or buy the lessons and manuscripts you want without membership.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <ActionLink href="/join" light>Join for $4.99 Monthly</ActionLink>
              <a href="/shop" className="inline-flex min-h-12 items-center gap-2 rounded-md border border-white/40 px-6 py-3 font-extrabold text-white hover:border-[#f2c230] hover:text-[#f2c230]">
                Shop Without Membership <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-4 text-sm font-semibold text-white/65">No forced choice · Permanent purchases stay yours · No membership trial</p>
          </div>
        </div>
      </header>

      <div className="bg-[#b33a32] py-5 text-center text-white">
        <p className="container text-sm font-black uppercase tracking-[0.16em] md:text-base">Faith-grounded · Purpose-driven · Community-powered</p>
      </div>

      <main>
        <section aria-labelledby="adult-child-distance-heading" className="bg-[#f8f0db] py-12 md:py-16">
          <div className="container grid items-center gap-7 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#b33a32]">For fathers of adult children</p>
              <h2 id="adult-child-distance-heading" className="mt-3 text-3xl font-extrabold md:text-5xl">Is There Distance Between You and Your Adult Child?</h2>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#314239]">Papa Life helps fathers move from silence, defensiveness, regret, and confusion toward humility, safer conversations, renewed hope, and the possibility of reconnection.</p>
            </div>
            <a href="/welcome-to-papa-life" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#145b35] px-6 py-3 font-extrabold text-white hover:bg-[#0f492a]">
              See If Papa Life Is for You <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>

        <section aria-labelledby="founder-heading" className="bg-white py-14 md:py-18">
          <div className="container grid items-center gap-8 md:grid-cols-[220px_1fr]">
            <img src={brianKeithHillHeadshot} alt="Brian Keith Hill, founder of Boss Mobility and Papa Life" className="aspect-square w-full rounded-xl object-cover object-top shadow-lg" />
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#b33a32]">Meet the founder</p>
              <h2 id="founder-heading" className="mt-3 text-3xl font-extrabold md:text-5xl">Brian Keith Hill</h2>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#314239]">Brian Keith Hill is the founder of Boss Mobility and Papa Life, a Scripture-centered fatherhood coaching movement helping fathers of adult children become safer, more present, and better prepared for healthy reconnection.</p>
              <a href="/about-brian-keith-hill" className="mt-6 inline-flex items-center gap-2 font-extrabold text-[#145b35] hover:text-[#b33a32]">About Brian and the work <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <section id="start-here" className="bg-[#b33a32] px-4 pb-16 pt-10">
          <div className="container rounded-xl bg-[#f2c230] p-6 shadow-2xl md:p-10">
            <div className="mx-auto mb-8 max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#145b35]">Everything you need to move forward</p>
              <h2 className="mt-3 text-3xl font-extrabold md:text-5xl">A Clear Path for This Season of Fatherhood</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {features.map(({ title, copy, href, label, Icon, tone }) => (
                <article key={title} className={`${tone} flex min-h-[280px] flex-col rounded-lg border border-[#17231c]/15 p-6 shadow-sm`}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#145b35] text-[#f2c230]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold">{title}</h3>
                  <p className="mt-3 flex-1 leading-relaxed text-[#314239]">{copy}</p>
                  <a href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#145b35] hover:text-[#b33a32]">
                    {label} <ArrowRight className="h-4 w-4" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#145b35] py-8 text-white">
          <div className="container flex flex-col items-center justify-between gap-5 text-center md:flex-row md:text-left">
            <div className="flex items-center gap-4">
              <Users className="h-12 w-12 text-[#f2c230]" />
              <div><h2 className="text-3xl font-extrabold">You Don’t Have to Do This Alone</h2><p className="mt-1 text-white/80">Walk with fathers who understand this season.</p></div>
            </div>
            <ActionLink href="/go/join" light>Join the Community</ActionLink>
          </div>
        </section>

        <section className="bg-[#f2c230] py-16 md:py-20">
          <div className="container grid items-stretch gap-8 lg:grid-cols-[.9fr_1.1fr]">
            <div className="relative min-h-[360px] overflow-hidden rounded-xl">
              <img src={heroBackgroundImage} alt="Fathers rebuilding connection with their adult children" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#17231c]/70 to-transparent" />
            </div>
            <div className="rounded-xl bg-[#f6cf55] p-7 md:p-10">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#b33a32]">A community that has your back</p>
              <h2 className="mt-3 text-4xl font-extrabold md:text-5xl">Papa Life Membership</h2>
              <p className="mt-2 text-2xl font-black text-[#145b35]">$4.99 per month</p>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed">Immediate access to Course 11 while your membership is active. No free trial and no unrelated product access.</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {membershipPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3 rounded-md bg-[#f8f0db] p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#145b35]" />
                    <span className="font-semibold">{point}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8"><ActionLink href="/go/join">Join Papa Life for $4.99</ActionLink></div>
            </div>
          </div>
        </section>

        <section className="bg-[#145b35] py-14 text-white">
          <div className="container grid gap-8 text-center md:grid-cols-3">
            <div><BookOpen className="mx-auto h-9 w-9 text-[#f2c230]" /><p className="mt-3 text-2xl font-extrabold">12 Audio Lessons</p><p className="mt-1 text-white/75">Course 11 · Lessons 75–86</p></div>
            <div><ShieldCheck className="mx-auto h-9 w-9 text-[#f2c230]" /><p className="mt-3 text-2xl font-extrabold">Private Member Access</p><p className="mt-1 text-white/75">Your membership controls entitlement.</p></div>
            <div><Heart className="mx-auto h-9 w-9 text-[#f2c230]" /><p className="mt-3 text-2xl font-extrabold">Practical Growth</p><p className="mt-1 text-white/75">Purpose, Authority, Presence, Alignment.</p></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#f2c230]/30 bg-[#17231c] py-10 text-white">
        <div className="container flex flex-col items-center justify-between gap-6 md:flex-row">
          <div><SiteLogo size="md" /><p className="mt-3 text-sm text-white/60">Stronger fathers. Healthier relationships. Lasting legacy.</p><p className="mt-2 max-w-xl text-xs leading-relaxed text-white/50">Papa Life is a fatherhood initiative founded by <a href="/about-brian-keith-hill" className="underline hover:text-[#f2c230]">Brian Keith Hill</a> through Boss Mobility.</p></div>
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
