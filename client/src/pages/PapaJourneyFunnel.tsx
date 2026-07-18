import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Play,
  BookMarked,
  Brain,
  Compass,
  Shield,
  Heart,
  Zap,
  Quote,
  Star,
  Menu,
  X,
  Sparkles,
  Moon,
  Sun,
  Wind,
  Flame,
  Eye,
  Layers,
  Infinity,
} from "lucide-react";
import { SiteLogo } from "@/components/SiteLogo";
import { SiteMediaVideo } from "@/components/SiteMediaVideo";
import {
  PAPA_CALENDLY_LINK,
  PAPA_EMAIL_SERIES_LINK,
  PAPA_FATHERHOOD_STAGES_LINK,
  PAPA_PAYMENT_LINK,
} from "@/lib/papa-links";

const PAPA_SELF_ASSESSMENT = PAPA_FATHERHOOD_STAGES_LINK;
const PAPA_RECONNECTION_INFOGRAPHIC = "/media/papa-life-distance-reconnection-infographic.png";

// ─── Scroll animation hook ────────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const PILLARS = [
  {
    letter: "P",
    name: "Purpose",
    stage: "Awareness",
    tagline: "Know why you were built for this.",
    description:
      "Most fathers drift. They provide, protect, and disappear into routine — never stopping to ask who they were meant to be. In the Purpose stage, your AI Journal guides you back to your core identity as a father. You don't guess. You discover.",
    journalPrompt: "What kind of man do you want your child to say you were?",
    color: "teal",
    gradFrom: "from-primary",
    gradTo: "to-brand-yellow",
    bg: "bg-primary/10",
    border: "border-primary/30",
    text: "text-primary",
    icon: Compass,
  },
  {
    letter: "A",
    name: "Authority",
    stage: "Transformation",
    tagline: "Lead without control. Guide without force.",
    description:
      "Authority isn't aggression — it's groundedness. In this stage you stop managing and start leading. The AI Journey Journal tracks your growth from reactive to responsive, from feared to respected. Your adult child doesn't need a boss. They need a guide.",
    journalPrompt: "Where have you confused control with leadership?",
    color: "green",
    gradFrom: "from-primary",
    gradTo: "to-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    text: "text-primary",
    icon: Shield,
  },
  {
    letter: "P",
    name: "Presence",
    stage: "Growth",
    tagline: "Be the father who actually shows up.",
    description:
      "You can be in the room and still be absent. Presence is the most powerful thing a father can offer — and the hardest to build. Daily journal prompts train you to be emotionally available, to listen before speaking, and to see your child as they are — not as you wish they were.",
    journalPrompt: "When did your child last feel truly seen by you?",
    color: "red",
    gradFrom: "from-accent",
    gradTo: "to-accent",
    bg: "bg-accent/10",
    border: "border-accent/30",
    text: "text-accent",
    icon: Heart,
  },
  {
    letter: "A",
    name: "Alignment",
    stage: "Mastery",
    tagline: "Become who your words say you are.",
    description:
      "Alignment is integrity made visible. When your values, words, and actions match — your family feels it. Your adult children stop doubting you. They start trusting you. The PAPA Journey Journal holds you accountable to the father you declared you'd be.",
    journalPrompt: "Where is there distance between what you say and what you do?",
    color: "yellow",
    gradFrom: "from-brand-yellow",
    gradTo: "to-brand-yellow",
    bg: "bg-brand-yellow/10",
    border: "border-brand-yellow/30",
    text: "text-brand-yellow",
    icon: Zap,
  },
];

const TESTIMONIALS = [
  {
    quote: "I spent 20 years building a business and 20 minutes a week with my son. The PAPA Journey Journal made me face that. Not comfortably — but honestly. We talk every week now.",
    name: "Marcus T.",
    title: "Father of 2 adult sons",
    initials: "MT",
    color: "bg-primary/20 text-primary",
  },
  {
    quote: "The AI prompts don't let you off the hook. They ask the questions your kids can't say out loud. I cried writing my first Purpose entry. Best thing that ever happened to me as a dad.",
    name: "Derrick W.",
    title: "Father of a daughter, 26",
    initials: "DW",
    color: "bg-primary/20 text-primary",
  },
  {
    quote: "Brian's framework gave me a language I didn't have. I wasn't a bad father — I was an unaware one. The journal turned awareness into action. My daughter called me last Sunday just to talk.",
    name: "James P.",
    title: "Father of 3 grown children",
    initials: "JP",
    color: "bg-brand-yellow/20 text-brand-yellow",
  },
];

const FAQ = [
  {
    q: "What exactly is the PAPA Journey Journal?",
    a: "It's an AI-powered daily reflection and coaching journal built on the PAPA framework — Purpose, Authority, Presence, and Alignment. Each day you receive guided prompts crafted to help you grow in one of the four pillars. Your responses are private, but the insights are lasting.",
  },
  {
    q: "Who is this for?",
    a: "Fathers of adult children who feel some distance — emotional, relational, or physical — between themselves and their kids. If your child is 18+ and you want a deeper, more intentional relationship, this was built for you.",
  },
  {
    q: "How is this different from a regular journaling app?",
    a: "Most journaling apps ask you to track your mood. The PAPA Journey Journal asks you to rebuild your identity as a father. The prompts are deliberately uncomfortable. The AI guides you deeper when you're surface-level. And the PAPA framework ties every reflection to a specific transformation goal.",
  },
  {
    q: "What is the Dad Dojo?",
    a: "The Dad Dojo is a 30-day immersive coaching program built on the PAPA framework — one week per pillar, with structured lessons, live sessions, and daily journal prompts. Think of it as boot camp for the most important role you'll ever have.",
  },
  {
    q: "What is the Cosmic Insights feature?",
    a: "Cosmic Insights is a daily spiritual guidance layer built into the AI Journey Journal. Each day it reads the current lunar cycle — new moon, waxing, full, waning — and delivers a cosmic reading, spiritual affirmation, and journal prompt calibrated to that season. It connects your inner fatherhood work to the larger rhythms of the universe and your faith walk. Think of it as a spiritual advisor built into your journal, one that knows exactly which PAPA pillar you're working on.",
  },
  {
    q: "Is Cosmic Insights religious or spiritual?",
    a: "It is spiritually grounded and faith-forward, but not affiliated with any specific religion. PAPA Life was built on faith-based values, and Cosmic Insights speaks to men who believe their walk as a father is part of a larger calling. Whether that comes from faith in God, the universe, or something greater — Cosmic Insights meets you there and points you back to your family.",
  },
  {
    q: "Do I need to be good at writing?",
    a: "No. You need to be willing to be honest. The journal doesn't grade your grammar — it challenges your assumptions. One sentence written with truth is worth more than a page of performance.",
  },
  {
    q: "What if I have a strained relationship with my adult child?",
    a: "This is exactly who we built it for. The PAPA Journey Journal doesn't promise a quick repair — it builds the internal foundation for lasting change. Many fathers in our community started with broken relationships and are writing different endings.",
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#080808]/95 backdrop-blur-md border-b border-white/10" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="min-w-0 hover:opacity-95 transition-opacity">
          <SiteLogo size="md" />
        </a>
        <div className="hidden md:flex items-center gap-8">
          {["Framework", "Cosmic", "Journal", "Program", "Testimonials"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
        </div>
        <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-[#0d0d0d] border-t border-white/10 px-6 py-4 space-y-3">
          {["Framework", "Cosmic", "Journal", "Program", "Testimonials"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setOpen(false)} className="block text-sm text-gray-400 hover:text-white transition-colors py-1">{item}</a>
          ))}
          <a href={PAPA_PAYMENT_LINK} className="block text-sm bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-full text-center mt-2">Join Now</a>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden pt-20">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[#080808]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(56,189,248,0.12),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(59,130,246,0.08),transparent)]" />

      {/* Grid lines */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 mb-8">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="text-primary text-xs font-semibold tracking-widest uppercase">AI-Powered Fatherhood Transformation</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
          Your Adult Child Is{" "}
          <span className="relative">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-200">Still Waiting</span>
          </span>{" "}
          for Their Father to Show Up.
        </h1>

        <p className="text-xl md:text-2xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-4">
          Not the provider. Not the disciplinarian. The{" "}
          <em className="text-white not-italic font-semibold">present, purposeful father</em> — the one who knows how to lead with love, own his story, and rebuild what time has quietly eroded.
        </p>

        <p className="text-gray-500 text-base max-w-xl mx-auto mb-10">
          The PAPA Journey Journal combines AI-guided daily reflection with Brian Keith Hill's proven PAPA framework — so your transformation isn't just felt. It's tracked, built, and lived.
        </p>

        {/* CTA cluster */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <a href="/ai-coach" className="group flex items-center gap-2 bg-brand-yellow hover:bg-white text-black font-extrabold text-base px-8 py-4 rounded-full transition-all shadow-[0_0_40px_rgba(255,214,10,0.2)]">
            Ask the Papa Life AI Coach
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a href={PAPA_PAYMENT_LINK} className="group flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-base px-8 py-4 rounded-full transition-all shadow-[0_0_40px_rgba(56,189,248,0.25)] hover:shadow-[0_0_60px_rgba(56,189,248,0.4)]">
            Begin your journey
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a href="#journal" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors px-4 py-2">
            <Play className="w-4 h-4" /> See How the Journal Works
          </a>
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-gray-500 text-xs">
          {["Membership Access", "$4.99/month", "Cancel Anytime", "Private & Secure"].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> {item}
            </span>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-600">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <ChevronDown className="w-4 h-4 animate-bounce" />
      </div>
    </section>
  );
}

function ProblemSection() {
  const stats = [
    { number: "63%", label: "of adult children report feeling emotionally distant from their father" },
    { number: "40%", label: "of fathers don't know how to talk to their adult child without it turning into a lecture" },
    { number: "1 in 3", label: "fathers say their biggest regret is not being more present when it mattered" },
  ];

  return (
    <section className="py-28 px-6 bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-primary text-xs font-bold tracking-widest uppercase mb-4">The Silent Epidemic</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
              You Love Your Kids.<br />
              <span className="text-gray-500">But Something Got Lost.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
              It didn't happen in a single moment. It happened slowly — in the missed conversations, the reactions you can't take back, the version of you that showed up for work every day but barely showed up for them.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className="bg-[#111] border border-white/8 rounded-2xl p-8 text-center">
                <p className="text-5xl font-black text-primary mb-3">{s.number}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="bg-[#111] border border-white/8 rounded-2xl p-8 md:p-12 max-w-3xl mx-auto">
            <div className="flex gap-4">
              <Quote className="w-8 h-8 text-primary shrink-0 mt-1" />
              <div>
                <p className="text-white text-xl md:text-2xl font-semibold leading-relaxed mb-4">
                  "The hardest thing about being a father of adult children is realizing that your window to shape the relationship isn't closed — but it is narrowing. Every year you wait, the distance feels more permanent."
                </p>
                <p className="text-primary text-sm font-bold">— Brian Keith Hill, Founder of PAPA Life</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ReconnectionTeachingSection() {
  const struggles = [
    "silent distance",
    "unspoken hurt",
    "defensiveness",
    "fear of rejection",
  ];
  const moves = [
    "Self-reflection before correction",
    "Emotional ownership",
    "Repair conversations",
    "From authority to advisor",
    "Value-based reconnection",
    "Sustained trust building",
  ];

  return (
    <section className="py-24 px-6 bg-[#0a0a0a] border-y border-white/8">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-10 items-start">
            <div>
              <p className="text-brand-yellow text-xs font-bold tracking-widest uppercase mb-4">Start Here</p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
                From Distance<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-brand-yellow">to Reconnection</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                A father does not need another lecture. He needs a calm place to name the distance, understand what happened, and see a real path back.
              </p>
              <p className="text-gray-500 leading-relaxed">
                This teaching is the first map: the problem, the turning point, the PAPA framework, and the six steady moves that help a father rebuild trust without rushing or forcing the relationship.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <a
                  href={PAPA_FATHERHOOD_STAGES_LINK}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-4 text-sm font-bold text-white hover:border-white/30 transition-colors"
                >
                  Find Your Fatherhood Stage
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href={PAPA_PAYMENT_LINK}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Join PAPA Life — $4.99/mo
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="space-y-6">
              <a
                href={PAPA_RECONNECTION_INFOGRAPHIC}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl transition-opacity hover:opacity-95"
              >
                <img
                  src={PAPA_RECONNECTION_INFOGRAPHIC}
                  alt="Papa Life From Distance to Reconnection infographic"
                  className="w-full h-auto"
                  loading="lazy"
                />
              </a>

            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="rounded-xl border border-accent/25 bg-accent/10 p-5">
                  <p className="text-accent text-xs font-bold tracking-widest uppercase mb-3">What gets named</p>
                  <div className="space-y-2">
                    {struggles.map((item) => (
                      <p key={item} className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-primary/25 bg-primary/10 p-5">
                  <p className="text-primary text-xs font-bold tracking-widest uppercase mb-3">The turning point</p>
                  <p className="text-white font-semibold leading-relaxed">
                    The father changes first. Not because he was the only one hurt, but because he is willing to go first.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-brand-yellow/25 bg-brand-yellow/10 p-5">
                <p className="text-brand-yellow text-xs font-bold tracking-widest uppercase mb-4">Six steady moves</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {moves.map((move, index) => (
                    <div key={move} className="flex items-start gap-3 rounded-lg bg-black/25 px-4 py-3">
                      <span className="text-brand-yellow text-xs font-black pt-0.5">{index + 1}</span>
                      <span className="text-gray-200 text-sm font-medium leading-snug">{move}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SolutionBridge() {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-[#0a0a0a] to-[#0d0d0d]">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-green-400 text-xs font-bold tracking-widest uppercase mb-4">Two Powerful Systems. One Journey.</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
              What Happens When Proven Coaching<br />Meets AI-Guided Reflection
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              iShareHow's AI Journey Journal technology meets the PAPA Life framework — giving you a system that doesn't just motivate you to be a better father. It <em className="text-white not-italic font-semibold">builds</em> you into one.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Left: iShareHow */}
          <Reveal delay={0}>
            <div className="bg-[#111] border border-brand-yellow/20 rounded-2xl p-8 h-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-brand-yellow/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-brand-yellow" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">iShareHow AI Journey Journal</p>
                  <p className="text-brand-yellow text-xs">The Technology</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "AI-guided daily reflection prompts that go deeper as you grow",
                  "Consciousness-to-mastery 4-stage transformation path",
                  "Cosmic Insights — spiritual & cosmic guidance for your walk",
                  "Private journaling with pattern recognition",
                  "Community of conscious creators building in public",
                  "Live sessions, frameworks, and behind-the-scenes content",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-gray-400 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-brand-yellow mt-0.5 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Right: PAPA Life */}
          <Reveal delay={120}>
            <div className="bg-[#111] border border-primary/20 rounded-2xl p-8 h-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookMarked className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">PAPA Life Framework</p>
                  <p className="text-primary text-xs">The Transformation</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "PAPA framework: Purpose · Authority · Presence · Alignment",
                  "Built specifically for fathers of adult children",
                  "30-Day Dad Dojo immersive coaching program",
                  "Structured curriculum with courses per PAPA pillar",
                  "Direct coaching from Brian Keith Hill",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-gray-400 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        {/* Arrow */}
        <Reveal>
          <div className="flex items-center justify-center gap-4 py-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <div className="bg-gradient-to-r from-primary to-brand-yellow rounded-full p-3 shadow-[0_0_30px_rgba(255,214,10,0.3)]">
              <ArrowRight className="w-5 h-5 text-black" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>
          <p className="text-center text-white font-extrabold text-2xl md:text-3xl mt-4">
            The{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-brand-yellow">PAPA Journey Journal</span>
          </p>
          <p className="text-center text-gray-400 mt-3 text-base max-w-xl mx-auto">
            Where your daily reflection becomes the most powerful fatherhood tool you've ever used.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function FrameworkSection() {
  const [active, setActive] = useState(0);
  const pillar = PILLARS[active];
  const Icon = pillar.icon;

  return (
    <section id="framework" className="py-28 px-6 bg-[#0d0d0d]">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-primary text-xs font-bold tracking-widest uppercase mb-4">The PAPA Framework</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
              4 Pillars. 4 Stages.<br />One Transformed Father.
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Every pillar of the PAPA framework maps to a stage of the Journey — from raw awareness to daily mastery. This isn't motivation. It's methodology.
            </p>
          </div>
        </Reveal>

        {/* Pillar selector */}
        <div className="grid grid-cols-4 gap-2 mb-10 max-w-2xl mx-auto">
          {PILLARS.map((p, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative rounded-xl py-4 px-2 text-center transition-all duration-300 border ${active === i ? `${p.bg} ${p.border} shadow-lg` : "bg-white/5 border-white/5 hover:bg-white/10"}`}
            >
              <div className={`text-3xl font-black mb-1 ${active === i ? p.text : "text-gray-500"}`}>{p.letter}</div>
              <div className={`text-xs font-semibold ${active === i ? p.text : "text-gray-600"}`}>{p.name}</div>
              <div className={`text-[10px] ${active === i ? "text-gray-400" : "text-gray-700"} mt-0.5`}>{p.stage}</div>
            </button>
          ))}
        </div>

        {/* Pillar detail */}
        <div key={active} className={`bg-[#111] border ${pillar.border} rounded-2xl p-8 md:p-12 transition-all duration-300`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl ${pillar.bg} flex items-center justify-center`}>
                  <Icon className={`w-7 h-7 ${pillar.text}`} />
                </div>
                <div>
                  <p className={`text-xs font-bold tracking-widest uppercase ${pillar.text}`}>Stage: {pillar.stage}</p>
                  <h3 className="text-white font-extrabold text-2xl">{pillar.name}</h3>
                </div>
              </div>
              <p className={`${pillar.text} font-semibold text-lg mb-4 leading-snug`}>{pillar.tagline}</p>
              <p className="text-gray-400 text-base leading-relaxed">{pillar.description}</p>
            </div>

            <div className="flex flex-col justify-between gap-6">
              {/* Journal preview */}
              <div className="bg-[#080808] rounded-2xl border border-white/8 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2 h-2 rounded-full ${pillar.gradFrom.replace("from-", "bg-")}`} />
                  <span className="text-gray-500 text-xs font-semibold tracking-wide uppercase">Today's AI Prompt · {pillar.name}</span>
                </div>
                <p className={`${pillar.text} font-semibold text-lg leading-relaxed mb-6`}>
                  "{pillar.journalPrompt}"
                </p>
                <div className="w-full h-20 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
                  <span className="text-gray-600 text-sm italic">Your reflection begins here...</span>
                </div>
                <p className="text-gray-600 text-xs mt-3 text-right">Powered by iShareHow AI Journey Journal</p>
              </div>

              {/* Stage badge */}
              <div className={`flex items-center gap-3 ${pillar.bg} border ${pillar.border} rounded-xl p-4`}>
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${pillar.gradFrom} ${pillar.gradTo} flex items-center justify-center text-black font-extrabold text-sm shrink-0`}>
                  {String(active + 1)}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Journey Stage {active + 1} of 4</p>
                  <p className={`${pillar.text} text-xs`}>{pillar.stage} → {active < 3 ? PILLARS[active + 1].stage : "Living It Daily"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stage flow */}
        <Reveal>
          <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
            {PILLARS.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`${p.bg} border ${p.border} rounded-full px-4 py-2 text-xs font-bold ${p.text}`}>{p.stage}</div>
                {i < PILLARS.length - 1 && <ArrowRight className="w-4 h-4 text-gray-700" />}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CosmicInsightsSection() {
  const [activeInsight, setActiveInsight] = useState(0);

  const insights = [
    {
      icon: Moon,
      phase: "Waning Moon",
      pillar: "Presence",
      color: "text-accent",
      bg: "bg-accent/10",
      border: "border-accent/30",
      glow: "shadow-[0_0_60px_rgba(167,139,250,0.12)]",
      title: "A Season to Release",
      cosmicRead: "The waning moon calls you inward. Old patterns of control, silence, and pride — this is the time to let them go. The father you've been is clearing space for the father you're becoming.",
      papaInsight: "In your Authority pillar work this week, notice where you hold on instead of letting go. Authority is not grip — it is direction. What have you been gripping that your adult child has been trying to hand back to you?",
      affirmation: "I release the father I was afraid to admit I'd been. I make room for who I was always called to be.",
    },
    {
      icon: Sun,
      phase: "Full Moon",
      pillar: "Purpose",
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/30",
      glow: "shadow-[0_0_60px_rgba(56,189,248,0.12)]",
      title: "A Season of Illumination",
      cosmicRead: "Full moons reveal what has been hidden. Today your cosmic insight turns the light inward — on your unspoken intentions as a father. Why do you lead? Whose approval have you been seeking? The answers are closer than you think.",
      papaInsight: "Your Purpose pillar asks: Who are you when no one is watching? This cosmic season invites honesty about the gap between the father you perform and the father you actually are. Write the version your child would describe.",
      affirmation: "I stand fully in who I am. My purpose as a father does not need an audience — it needs my daily devotion.",
    },
    {
      icon: Wind,
      phase: "New Moon",
      pillar: "Alignment",
      color: "text-brand-yellow",
      bg: "bg-brand-yellow/10",
      border: "border-brand-yellow/30",
      glow: "shadow-[0_0_60px_rgba(34,211,238,0.10)]",
      title: "A Season of New Beginnings",
      cosmicRead: "The new moon is the universe's invitation to start fresh — without the weight of who you've been. Every relationship can be rewritten. Every silence can be broken. Every wound between a father and child carries within it the seed of the deepest healing.",
      papaInsight: "Your Alignment pillar work begins with a single question: What is one thing you can do today that your future self — and your child — will thank you for? Write it. Then do it before the day ends.",
      affirmation: "I begin again. Not because the past didn't happen — but because my children deserve a father who doesn't stay there.",
    },
    {
      icon: Flame,
      phase: "Waxing Moon",
      pillar: "Authority",
      color: "text-indigo-300",
      bg: "bg-accent/10",
      border: "border-accent/30",
      glow: "shadow-[0_0_60px_rgba(249,115,22,0.10)]",
      title: "A Season to Build",
      cosmicRead: "The waxing moon is gathering energy — and so are you. Momentum is sacred. This is the season where consistent, intentional action compounds. Every conversation you show up for, every boundary you hold with love, every time you choose presence over performance — it builds.",
      papaInsight: "In your Presence pillar this week, set one non-negotiable: a single moment of full, undistracted attention with or for your adult child. Not a call with half your mind elsewhere — full presence. The universe rewards the man who shows up fully.",
      affirmation: "I am building something that will outlast me. My consistency is my legacy.",
    },
  ];

  const insight = insights[activeInsight];
  const InsightIcon = insight.icon;

  return (
    <section id="cosmic" className="py-28 px-6 bg-[#080808] relative overflow-hidden">
      {/* Cosmic background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(88,28,135,0.12),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_20%_80%,rgba(30,58,138,0.08),transparent)]" />
      {/* Star field */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() > 0.8 ? "2px" : "1px",
              height: Math.random() > 0.8 ? "2px" : "1px",
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.4 + 0.05,
              animationDuration: `${Math.random() * 4 + 2}s`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span className="text-accent text-xs font-semibold tracking-widest uppercase">Cosmic Insights</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
              The Universe Has Something<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-brand-yellow to-primary">to Say About Your Walk.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-4">
              Your fatherhood journey doesn't happen in a vacuum. It happens within a season — a cosmic, spiritual, and personal season that shapes what you need to hear and what you're ready to face.
            </p>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              Cosmic Insights is the layer of the AI Journey Journal that reads the moment you're in — lunar cycles, seasonal energy, and spiritual wisdom — and delivers guidance that meets you exactly where you are on your walk.
            </p>
          </div>
        </Reveal>

        {/* What is Cosmic Insights */}
        <Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16 mt-12">
            {[
              {
                icon: Moon,
                color: "text-accent",
                bg: "bg-accent/10",
                title: "Lunar Cycle Guidance",
                body: "Each phase of the moon carries a different energy — releasing, building, illuminating, beginning. Your daily Cosmic Insight is calibrated to the lunar cycle so your journal prompts align with the season your spirit is already in.",
              },
              {
                icon: Eye,
                color: "text-brand-yellow",
                bg: "bg-brand-yellow/10",
                title: "Spiritual Pattern Recognition",
                body: "The AI notices patterns in your journey over time — where you resist, where you soften, where you grow. Cosmic Insights layers spiritual wisdom over those patterns, helping you see your fatherhood walk through a bigger lens.",
              },
              {
                icon: Layers,
                color: "text-brand-yellow",
                bg: "bg-brand-yellow/10",
                title: "PAPA Pillar Integration",
                body: "Every Cosmic Insight is anchored to one of your four PAPA pillars. The universe doesn't speak in abstract — it speaks directly to your Purpose, Authority, Presence, or Alignment work for the week.",
              },
              {
                icon: Sparkles,
                color: "text-primary",
                bg: "bg-primary/10",
                title: "Daily Cosmic Affirmations",
                body: "Start every morning with a spiritually-grounded affirmation written specifically for fathers — not generic positivity, but declarations rooted in your active transformation season.",
              },
              {
                icon: Infinity,
                color: "text-green-400",
                bg: "bg-green-400/10",
                title: "Faith-Forward Foundation",
                body: "Cosmic Insights isn't astrology for astrology's sake. It's spiritual language for men of faith who understand that their walk as a father is part of a larger design — and that alignment with that design changes everything.",
              },
              {
                icon: Flame,
                color: "text-indigo-300",
                bg: "bg-accent/10",
                title: "Seasonal Action Prompts",
                body: "Each cosmic reading closes with a specific, grounded action tied to your PAPA pillar work. The spirit moves — but the man has to act. Cosmic Insights bridges the two.",
              },
            ].map(({ icon: Icon, color, bg, title, body }, i) => (
              <Reveal key={i} delay={(i % 3) * 80}>
                <div className="bg-[#111] border border-white/8 rounded-2xl p-7 h-full">
                  <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-5`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <h3 className="text-white font-bold text-sm mb-3">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* Live Cosmic Insight Demo */}
        <Reveal>
          <div className="mb-6 text-center">
            <p className="text-gray-500 text-sm mb-4">Experience a Cosmic Insight — select a lunar phase:</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {insights.map((ins, i) => {
                const TabIcon = ins.icon;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveInsight(i)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${activeInsight === i ? `${ins.bg} ${ins.border} ${ins.color}` : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"}`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    {ins.phase}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Insight card */}
        <Reveal>
          <div key={activeInsight} className={`bg-[#0d0d0d] border ${insight.border} rounded-2xl overflow-hidden ${insight.glow} transition-all duration-500`}>
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/8 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${insight.bg} flex items-center justify-center shrink-0`}>
                  <InsightIcon className={`w-6 h-6 ${insight.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${insight.color} tracking-widest uppercase`}>{insight.phase}</span>
                    <span className="text-gray-700">·</span>
                    <span className="text-gray-500 text-xs">PAPA Pillar: {insight.pillar}</span>
                  </div>
                  <h3 className="text-white font-extrabold text-xl">{insight.title}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 rounded-full px-3 py-1 shrink-0">
                <Sparkles className="w-3 h-3 text-accent" />
                <span className="text-accent text-[10px] font-bold">Cosmic Insight</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/8">
              {/* Cosmic Reading */}
              <div className="px-8 py-7">
                <p className="text-xs font-bold tracking-widest uppercase text-gray-600 mb-4">Cosmic Reading</p>
                <p className="text-gray-300 text-base leading-relaxed mb-6">{insight.cosmicRead}</p>
                <div className={`${insight.bg} border ${insight.border} rounded-xl px-5 py-4`}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Daily Affirmation</p>
                  <p className={`${insight.color} font-semibold text-sm leading-relaxed italic`}>"{insight.affirmation}"</p>
                </div>
              </div>

              {/* PAPA Journal Prompt */}
              <div className="px-8 py-7">
                <p className="text-xs font-bold tracking-widest uppercase text-gray-600 mb-4">Your PAPA Journal Prompt</p>
                <p className="text-gray-300 text-base leading-relaxed mb-6">{insight.papaInsight}</p>
                <div className="bg-white/5 rounded-xl border border-white/8 p-4">
                  <p className="text-gray-600 text-xs mb-3">Write your reflection...</p>
                  <div className="space-y-2">
                    <div className="h-2 bg-white/5 rounded-full w-3/4" />
                    <div className="h-2 bg-white/5 rounded-full w-full" />
                    <div className="h-2 bg-white/5 rounded-full w-1/2" />
                  </div>
                </div>
                <p className="text-gray-700 text-xs mt-3 text-right">Powered by iShareHow AI · PAPA Life</p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Bridge statement */}
        <Reveal>
          <div className="mt-12 text-center max-w-2xl mx-auto">
            <p className="text-gray-400 text-base leading-relaxed">
              Cosmic Insights doesn't replace scripture, therapy, or community — it <span className="text-white font-semibold">enhances your walk</span>. When you understand the season you're in, you can stop fighting the current and start swimming with it — toward the father, the legacy, and the relationship your family deserves.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function JournalSection() {
  const [activeTab, setActiveTab] = useState(0);

  const conversations = [
    {
      label: "Deep Coaching",
      day: "Day 14 · Presence",
      messages: [
        { role: "ai", color: "text-brand-yellow", bg: "bg-brand-yellow/8 border border-brand-yellow/10", label: "PAPA AI", message: "You wrote last week that you struggle to listen without preparing your response. Today, reflect on a specific moment this week when you caught yourself doing exactly that. What was your adult child actually trying to tell you?" },
        { role: "user", color: "text-accent", bg: "bg-accent/8 border border-accent/10", label: "You", message: "My daughter called Tuesday. I was already forming my response before she finished her third sentence. She was telling me she got a promotion — and I turned it into advice about her next step. She went quiet. I didn't notice until an hour later." },
        { role: "ai", color: "text-brand-yellow", bg: "bg-brand-yellow/8 border border-brand-yellow/10", label: "PAPA AI", message: "That awareness is Presence work in action. You noticed a pattern mid-conversation, not weeks later. That's growth. Now: what would it look like to call her back and simply say \"I'm proud of you\" — nothing else? No advice. No follow-up. Just that." },
      ],
    },
    {
      label: "Cosmic + PAPA",
      day: "New Moon · Alignment",
      messages: [
        { role: "cosmic", color: "text-accent", bg: "bg-accent/8 border border-accent/10", label: "✦ Cosmic Insight", message: "The new moon is the universe's invitation to begin again. Old distances between fathers and children are not permanent — they are seasons. This is your season to plant something new." },
        { role: "ai", color: "text-brand-yellow", bg: "bg-brand-yellow/8 border border-brand-yellow/10", label: "PAPA AI", message: "Your Alignment work this new moon: write the message to your adult child you've been drafting in your head but never sent. Don't analyze it. Don't edit it. Write what's true. You don't have to send it today — but write it." },
        { role: "user", color: "text-accent", bg: "bg-accent/8 border border-accent/10", label: "You", message: "I wrote it. It took 40 minutes and I cried twice. I didn't know I was carrying all of that. I'm sending it tomorrow." },
        { role: "ai", color: "text-brand-yellow", bg: "bg-brand-yellow/8 border border-brand-yellow/10", label: "PAPA AI", message: "That took courage. The man who sends that message is not the same man who sat down 40 minutes ago. This is what Alignment looks like — your words finally matching your heart." },
      ],
    },
    {
      label: "Pattern Insight",
      day: "Day 31 · Authority",
      messages: [
        { role: "ai", color: "text-brand-yellow", bg: "bg-brand-yellow/8 border border-brand-yellow/10", label: "PAPA AI", message: "Over the last 30 days, your journal shows a pattern: you write most openly about your son on Sundays — and you go quiet about him mid-week. What happens on Mondays that makes you close off?" },
        { role: "user", color: "text-accent", bg: "bg-accent/8 border border-accent/10", label: "You", message: "That's... honestly I never noticed that. Monday is when I get into work mode. I think I compartmentalize. My son and my work feel like two different versions of me." },
        { role: "ai", color: "text-brand-yellow", bg: "bg-brand-yellow/8 border border-brand-yellow/10", label: "PAPA AI", message: "That's your Alignment gap speaking. The Authority pillar asks: what would it look like if the man you are at work — decisive, present, purposeful — showed up for your son with the same energy? You don't have two selves. You have one calling." },
      ],
    },
  ];

  const tab = conversations[activeTab];

  return (
    <section id="journal" className="py-28 px-6 bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-brand-yellow text-xs font-bold tracking-widest uppercase mb-4">The AI Journey Journal</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
              This Isn't a Mood Tracker.<br />
              <span className="text-gray-500">It's a Mirror With Memory.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Most journaling apps ask you to log. The PAPA Journey Journal asks you to <em className="text-white not-italic font-semibold">reckon</em>. The AI remembers what you wrote last week, last month — and asks the question you've been avoiding.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            {
              icon: Brain,
              color: "text-brand-yellow",
              bg: "bg-brand-yellow/10",
              title: "Adaptive AI Coaching",
              body: "Prompts evolve with you. The AI tracks your language patterns across entries — noticing where you deflect, where you soften, and where you're finally ready to go deeper.",
            },
            {
              icon: Sparkles,
              color: "text-accent",
              bg: "bg-accent/10",
              title: "Cosmic Insight Layer",
              body: "Each day opens with a cosmic spiritual reading tied to the lunar cycle and your current PAPA pillar — so your reflection is always grounded in both the heavens and your homework.",
            },
            {
              icon: BookMarked,
              color: "text-primary",
              bg: "bg-primary/10",
              title: "PAPA Pillar Tagging",
              body: "Every entry is mapped to Purpose, Authority, Presence, or Alignment — so you can see your growth per pillar and know exactly where to push harder.",
            },
            {
              icon: Eye,
              color: "text-brand-yellow",
              bg: "bg-brand-yellow/10",
              title: "Pattern Recognition",
              body: "After 30 days, the AI shows you patterns you didn't see — days you go silent, topics you avoid, the version of yourself that shows up on hard weeks.",
            },
            {
              icon: Zap,
              color: "text-green-400",
              bg: "bg-green-400/10",
              title: "Progress Tracking",
              body: "Lessons completed, journal streaks, pillar growth scores — your transformation becomes visible data, not just a feeling. You'll see yourself changing.",
            },
            {
              icon: Flame,
              color: "text-indigo-300",
              bg: "bg-accent/10",
              title: "Action Prompts",
              body: "Every session closes with one concrete action tied to your fatherhood walk — small enough to do today, significant enough to change your relationship over time.",
            },
          ].map(({ icon: Icon, color, bg, title, body }, i) => (
            <Reveal key={i} delay={(i % 3) * 80}>
              <div className="bg-[#111] border border-white/8 rounded-2xl p-7 h-full">
                <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-5`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="text-white font-bold text-base mb-3">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Interactive journal demo */}
        <Reveal>
          <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden max-w-2xl mx-auto shadow-[0_0_80px_rgba(59,130,246,0.06)]">
            {/* Tab bar */}
            <div className="flex border-b border-white/8">
              {conversations.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`flex-1 text-xs font-semibold py-3 px-2 transition-colors border-b-2 ${activeTab === i ? "text-white border-brand-yellow bg-white/5" : "text-gray-600 border-transparent hover:text-gray-400"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white text-sm font-semibold">PAPA Journey Journal</span>
                </div>
                <span className="text-gray-600 text-xs">{tab.day}</span>
              </div>

              <div className="space-y-3">
                {tab.messages.map((msg, i) => (
                  <div key={i} className={`${msg.bg} rounded-xl px-4 py-3`}>
                    <p className={`text-xs font-bold ${msg.color} mb-1.5`}>{msg.label}</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{msg.message}</p>
                  </div>
                ))}
              </div>

              <p className="text-gray-700 text-xs text-center mt-5">
                Powered by iShareHow AI Technology · PAPA Life Framework · Cosmic Insights
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ProgramSection() {
  const includes = [
    { label: "PAPA Journey Journal", desc: "AI-guided daily prompts for all 4 pillars", color: "text-primary" },
    { label: "Cosmic Insights", desc: "Daily lunar-cycle spiritual guidance tied to your PAPA pillar walk", color: "text-accent" },
    { label: "30-Day Dad Dojo", desc: "Immersive coaching — one week per PAPA pillar", color: "text-green-400" },
    { label: "Full Course Library", desc: "Structured lessons: Purpose, Authority, Presence, Alignment", color: "text-brand-yellow" },
    { label: "Weekly Live Sessions", desc: "Direct coaching and community accountability calls", color: "text-indigo-300" },
    { label: "iShareHow Rise Dashboard", desc: "Track your consciousness-to-mastery journey", color: "text-accent" },
    { label: "Private Community", desc: "A collective of fathers rising together — no judgment", color: "text-primary" },
    { label: "Exclusive Frameworks & PDFs", desc: "Downloadable tools for every PAPA pillar", color: "text-green-400" },
    { label: "Daily Affirmations", desc: "Spiritually-grounded, fatherhood-specific affirmations each morning", color: "text-accent" },
    { label: "ElevenLabs AI Coach", desc: "Ask Brian's AI coach anything, anytime", color: "text-primary" },
  ];

  return (
    <section id="program" className="py-28 px-6 bg-[#0d0d0d]">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-indigo-300 text-xs font-bold tracking-widest uppercase mb-4">The Full Program</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
              Everything You Need to Become<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-brand-yellow">The Father You Were Built to Be</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              This isn't a book. This isn't a podcast. This is a live, AI-powered, community-backed transformation system — built exclusively for fathers of adult children.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          {includes.map((item, i) => (
            <Reveal key={i} delay={(i % 4) * 80}>
              <div className="flex items-start gap-4 bg-[#111] border border-white/8 rounded-xl px-5 py-4">
                <CheckCircle2 className={`w-5 h-5 ${item.color} mt-0.5 shrink-0`} />
                <div>
                  <p className="text-white font-semibold text-sm">{item.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Offer card */}
        <Reveal>
          <div className="relative bg-[#111] border border-primary/30 rounded-2xl p-10 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(56,189,248,0.08),transparent)] pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 mb-6">
                <Star className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary text-xs font-semibold">Join PAPA Life</span>
              </div>
              <h3 className="text-white text-3xl font-extrabold mb-3">Papa Life Membership</h3>
              <p className="text-gray-400 text-base max-w-md mx-auto mb-8 leading-relaxed">
                Join Papa Life for $4.99/month with community access and Course 11 streaming. Members may separately purchase permanent digital lessons and manuscript PDFs.
              </p>
              <a href={PAPA_PAYMENT_LINK} className="group inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-lg px-10 py-4 rounded-full transition-all shadow-[0_0_40px_rgba(56,189,248,0.3)] hover:shadow-[0_0_60px_rgba(56,189,248,0.5)]">
                Join PAPA Life — $4.99/mo
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </a>
              <p className="text-gray-600 text-xs mt-4">No free trial · Cancel anytime · Your data is private</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-28 px-6 bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <p className="text-green-400 text-xs font-bold tracking-widest uppercase mb-4">Fathers in the Journey</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
              Real Men. Real Change.
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={i} delay={i * 120}>
              <div className="bg-[#111] border border-white/8 rounded-2xl p-7 flex flex-col h-full">
                <Quote className="w-6 h-6 text-gray-700 mb-5" />
                <p className="text-gray-300 text-sm leading-relaxed flex-1 mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3 border-t border-white/8 pt-5">
                  <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center font-bold text-xs shrink-0`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.title}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Star row */}
        <Reveal>
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-primary text-primary" />
            ))}
            <span className="text-gray-400 text-sm ml-2">Rated 4.9 by fathers in the PAPA community</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-28 px-6 bg-[#0d0d0d]">
      <div className="max-w-3xl mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-white mb-4">Common Questions</h2>
            <p className="text-gray-400 text-base">Real answers. No jargon.</p>
          </div>
        </Reveal>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <Reveal key={i} delay={i * 50}>
              <div className={`bg-[#111] border rounded-xl overflow-hidden transition-colors ${open === i ? "border-primary/30" : "border-white/8 hover:border-white/15"}`}>
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <span className={`font-semibold text-base transition-colors ${open === i ? "text-primary" : "text-white"}`}>{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform shrink-0 ml-4 ${open === i ? "rotate-180" : ""}`} />
                </button>
                {open === i && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FreeResourcesSection() {
  const resources = [
    {
      title: "Give. Listen. Love. Serve.",
      desc: "A free 4-week email series for fathers who want to start gently.",
      href: PAPA_EMAIL_SERIES_LINK,
    },
    {
      title: "The PAPA Workbook",
      desc: "Work the framework on paper, at your pace.",
      href: "https://afcdmbri.gensparkspace.com/resources/papa-workbook.html",
    },
    {
      title: "The Letter Template",
      desc: "The words, when you can't find your own.",
      href: "https://afcdmbri.gensparkspace.com/resources/letter-template.html",
    },
    {
      title: "Weekly Reset Journal",
      desc: "Small, consistent presence — one week at a time.",
      href: "https://afcdmbri.gensparkspace.com/resources/weekly-reset-journal.html",
    },
  ];

  return (
    <section id="free-resources" className="py-28 px-6 bg-[#0a0a0a] border-y border-white/8">
      <div className="max-w-3xl mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <p className="text-brand-yellow text-xs font-bold tracking-widest uppercase mb-4">Free to start</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
              Take the first step before you decide.
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Start by finding where you are. The full guided path opens when you join PAPA Life.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <SiteMediaVideo
            placement="papa_journey_video_assessment"
            className="mb-8"
            autoPlay={false}
            muted={false}
            reserveSpace
          />
          <a
            href={PAPA_SELF_ASSESSMENT}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-4 bg-[#111] border border-accent/30 hover:border-accent/50 rounded-2xl px-6 py-5 mb-6 transition-colors"
          >
            <div className="text-left">
              <p className="text-white font-bold text-lg">Find Your Fatherhood Stage</p>
              <p className="text-gray-400 text-sm mt-1">Take the 5-stage tool first so you know where to begin.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-accent shrink-0 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href={PAPA_PAYMENT_LINK}
            className="group flex items-center justify-between gap-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl px-6 py-5 mb-6 transition-colors font-bold"
          >
            <div className="text-left">
              <p className="text-lg">Continue Into PAPA Life</p>
              <p className="text-sm mt-1 opacity-80">Join the community and member area for $4.99/month.</p>
            </div>
            <ArrowRight className="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1" />
          </a>
        </Reveal>

        <div className="space-y-3">
          {resources.map((r, i) => (
            <Reveal key={r.href} delay={i * 60}>
              <a
                href={r.href}
                className="group flex items-center justify-between gap-4 bg-[#111] border border-white/8 hover:border-white/15 rounded-xl px-5 py-4 transition-colors"
              >
                <div>
                  <p className="text-white font-semibold text-sm">{r.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{r.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white shrink-0 transition-colors" />
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-28 px-6 bg-[#080808] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(56,189,248,0.07),transparent)]" />
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <Reveal>
          <SiteMediaVideo
            placement="papa_journey_video_membership"
            className="mb-10 max-w-2xl mx-auto"
            autoPlay={false}
            muted={false}
            reserveSpace
          />
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <SiteLogo size="lg" />
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-[1.05] mb-6">
              It's not too late.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-brand-yellow">Pick up the phone. Begin.</span>
            </h2>
            <p className="text-gray-400 text-xl leading-relaxed mb-2">
              Papa Life Membership for <span className="text-brand-yellow font-bold">$4.99/month</span>
            </p>
            <p className="text-gray-500 text-base max-w-xl mx-auto mb-10">
              No free trial. Membership includes the community, member area, and Course 11 streaming; permanent downloads and manuscripts are optional member purchases.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <a
              href={PAPA_PAYMENT_LINK}
              className="group inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xl px-12 py-5 rounded-full transition-all shadow-[0_0_60px_rgba(56,189,248,0.3)] hover:shadow-[0_0_80px_rgba(56,189,248,0.5)]"
            >
              Join Papa Life — $4.99/mo
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1.5" />
            </a>
            <a
              href={PAPA_CALENDLY_LINK}
              className="inline-flex items-center gap-2 text-gray-300 hover:text-white border border-white/15 hover:border-white/30 font-semibold text-base px-8 py-5 rounded-full transition-colors"
            >
              Talk to Brian first
            </a>
          </div>
          <p className="text-gray-600 text-sm">No free trial · Cancel anytime</p>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-gray-600 text-xs">
            {["Purpose", "Authority", "Presence", "Alignment"].map((p, i) => (
              <span key={p} className={`${PILLARS[i].text} font-bold`}>{p}</span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#080808] border-t border-white/8 py-10 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SiteLogo size="sm" />
          <span className="text-gray-500 text-sm">
            <a href="https://ventures.isharehow.app" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">iShareHow Ventures</a>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-gray-500 text-xs">
          <a href="/tuesday" className="font-bold text-yellow-400 hover:text-yellow-300 transition-colors">Tuesday Live</a>
          <a href="/walkthrough" className="font-bold text-yellow-400 hover:text-yellow-300 transition-colors">P2P Walkthrough</a>
          <a href="/privacy-policy" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
          <a href="/terms-of-service" className="hover:text-gray-400 transition-colors">Terms of Service</a>
          <a href="/" className="hover:text-gray-400 transition-colors">Home</a>
          <a href="/member-login" className="hover:text-gray-400 transition-colors">Member Login</a>
        </div>
        <p className="text-gray-700 text-xs">© {new Date().getFullYear()} Boss Mobile Life Coach. All rights reserved.</p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PapaJourneyFunnel() {
  return (
    <div className="bg-[#080808] text-white font-sans">
      <Nav />
      <Hero />
      <ReconnectionTeachingSection />
      <ProblemSection />
      <SolutionBridge />
      <FrameworkSection />
      <CosmicInsightsSection />
      <JournalSection />
      <ProgramSection />
      <TestimonialsSection />
      <FAQSection />
      <FreeResourcesSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
