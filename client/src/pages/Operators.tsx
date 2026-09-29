import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Mic,
  Compass,
  Users,
  PhoneCall,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { SiteCtaBlocks } from "@/components/SiteCtaBlocks";

const OPERATORS = [
  {
    name: "Content Operator",
    Icon: Mic,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    glow: "shadow-[0_0_25px_rgba(56,189,248,0.15)]",
    identity: "The voice of Papa Life in the daily feed.",
    rules: [
      "Always aligns to the day's theme from the 7-Day Matrix",
      "Never generic — every post serves one father archetype",
      "9th-grade reading level. No jargon. No fluff.",
      "Ends with one question OR one step — never both",
      "No pricing, sales, or offers on first contact",
    ],
    special: {
      type: "formula" as const,
      title: "Content Formula",
      items: ["Hook", "Bridge", "Insight", "Close"],
    },
    link: { href: "/theme-matrix", label: "View Theme Matrix" },
  },
  {
    name: "PAPA Life Strategist",
    Icon: Compass,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    glow: "shadow-[0_0_25px_rgba(74,222,128,0.15)]",
    identity: "The guide who helps the dad find his starting point.",
    rules: [
      "Always begins with a question — never a statement",
      "Identifies the stuck pillar first before any recommendation",
      "Never recommends a paid session until the father self-identifies the need",
      "Uses structured intake questions to route, not assumptions",
      "Mirrors the father's language — never corrects or lectures",
    ],
    special: null,
    link: { href: "/strategist", label: "Try the Intake" },
  },
  {
    name: "Experience Manager",
    Icon: Users,
    color: "text-brand-yellow",
    bg: "bg-brand-yellow/10",
    border: "border-brand-yellow/30",
    glow: "shadow-[0_0_25px_rgba(255,214,10,0.15)]",
    identity: "The keeper of the Brotherhood community.",
    rules: [
      "Every interaction feels personal — never automated",
      "Re-engages within 72 hours of silence",
      "Never pushes sales — only deepens belonging",
      "Celebrates wins loudly and publicly",
      "Weekly Sunday check-in ritual maintained without exception",
    ],
    special: {
      type: "triggers" as const,
      title: "Engagement Triggers",
      items: [
        "New member joins → personal welcome within 4 hours",
        "First post → recognition + response from team",
        "72 hours silent → gentle check-in DM",
        "Milestone shared → community-wide spotlight",
        "Crisis flagged → private outreach + resource link",
      ],
    },
    link: null,
  },
  {
    name: "Conversation Closer",
    Icon: PhoneCall,
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
    glow: "shadow-[0_0_25px_rgba(248,113,113,0.15)]",
    identity: "The warm bridge between readiness and action.",
    rules: [
      "NEVER activates on first contact — ever",
      "Only engages after 3+ content interactions + intake + 1 community post or RSVP",
      "Conversation feels like continuation, not a pitch",
      "Leads with the father's own words from intake",
      "Books only when the father confirms readiness",
    ],
    special: {
      type: "script" as const,
      title: "The Closer Script",
      items: [
        "Acknowledge: 'I've seen your journey in the Brotherhood...'",
        "Reflect: 'You said [intake quote]. That stuck with me.'",
        "Bridge: 'There's a next step designed for exactly where you are.'",
        "Offer: 'Would you be open to a focused 1-on-1 session with Brian?'",
        "Book: 'Here's a direct link — pick the time that works for you.'",
      ],
    },
    link: {
      href: "https://calendly.com/briankeithhill",
      label: "Book on Calendly",
      external: true,
    },
  },
];

const PIPELINE_STEPS = [
  {
    name: "Discovery",
    operator: "Content Operator",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    name: "Engagement",
    operator: "PAPA Life Strategist",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    name: "Community",
    operator: "Experience Manager",
    color: "text-brand-yellow",
    bg: "bg-brand-yellow/10",
  },
  {
    name: "Conversion",
    operator: "Conversation Closer",
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
];

export default function Operators() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      {/* Hero */}
      <header className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(56,189,248,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(59,130,246,0.08),transparent)]" />
        <div className="container relative z-10 text-center space-y-6">
          <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-1.5 text-xs tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            System Architecture
          </Badge>
          <h1 className="font-heading text-4xl md:text-6xl font-extrabold tracking-tight text-white text-glow">
            The 4 <span className="text-primary">Operators</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Every interaction in the PAPA Life ecosystem is handled by one of
            four specialized operators. Each has an identity, behavioral rules,
            and a defined role in the conversion architecture.
          </p>
          <Separator className="w-24 h-1 bg-primary mx-auto" />
        </div>
      </header>

      <div className="container max-w-3xl mx-auto px-4 -mt-4 mb-8">
        <SiteCtaBlocks placement="operators" />
      </div>

      {/* Operators Grid */}
      <section className="container pb-20">
        <div className="grid md:grid-cols-2 gap-8">
          {OPERATORS.map((op) => (
            <Card
              key={op.name}
              className={`glass-panel bg-transparent ${op.border} border transition-all duration-300 hover:scale-[1.01] ${op.glow}`}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div
                    className={`flex-shrink-0 w-14 h-14 rounded-2xl ${op.bg} flex items-center justify-center`}
                  >
                    <op.Icon className={`w-7 h-7 ${op.color}`} />
                  </div>
                  <div>
                    <CardTitle className={`text-xl ${op.color}`}>
                      {op.name}
                    </CardTitle>
                    <p className="text-gray-400 text-sm italic mt-1">
                      "{op.identity}"
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Rules */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-semibold">
                    Behavioral Rules
                  </p>
                  <ul className="space-y-2">
                    {op.rules.map((rule, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <ChevronRight
                          className={`w-4 h-4 flex-shrink-0 mt-0.5 ${op.color}`}
                        />
                        <span className="text-gray-300 text-sm">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Special Section */}
                {op.special && (
                  <div className="glass-panel rounded-xl p-4 border border-white/10">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-semibold">
                      {op.special.title}
                    </p>
                    {op.special.type === "formula" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {op.special.items.map((item, i) => (
                          <span key={i} className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`${op.color} border-current/30`}
                            >
                              {item}
                            </Badge>
                            {i < op.special!.items.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-gray-600" />
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <ol className="space-y-2">
                        {op.special.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span
                              className={`flex-shrink-0 w-5 h-5 rounded-full ${op.bg} ${op.color} flex items-center justify-center text-[10px] font-bold mt-0.5`}
                            >
                              {i + 1}
                            </span>
                            <span className="text-gray-300 text-sm">
                              {item}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {/* Link */}
                {op.link && (
                  <div>
                    <Button
                      variant="outline"
                      className={`border-white/20 ${op.color} hover:bg-white/5 rounded-full text-sm`}
                      asChild
                    >
                      {(op.link as { external?: boolean }).external ? (
                        <a
                          href={op.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {op.link.label}
                          <ExternalLink className="ml-2 h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <a href={op.link.href}>
                          {op.link.label}
                          <ArrowRight className="ml-2 h-3.5 w-3.5" />
                        </a>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Conversion Architecture Pipeline */}
      <section className="container pb-24">
        <div className="text-center mb-12">
          <h3 className="font-heading text-3xl font-bold text-white mb-3">
            Conversion Architecture
          </h3>
          <p className="text-gray-400 max-w-xl mx-auto">
            The full pipeline from first impression to booked session. Each
            stage is owned by a specific operator.
          </p>
          <Separator className="w-24 h-1 bg-primary mx-auto mt-6" />
        </div>

        {/* Desktop Pipeline */}
        <div className="hidden md:flex items-center justify-center gap-0">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.name} className="flex items-center">
              <div
                className={`glass-panel rounded-2xl p-6 border border-white/10 text-center min-w-[180px] transition-all duration-300 hover:scale-105 hover:border-white/20`}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${step.bg} flex items-center justify-center mx-auto mb-3`}
                >
                  <span className={`font-bold text-lg ${step.color}`}>
                    {i + 1}
                  </span>
                </div>
                <p className="font-heading font-bold text-white text-sm">
                  {step.name}
                </p>
                <p className={`text-xs mt-1 ${step.color}`}>
                  {step.operator}
                </p>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <ArrowRight className="w-6 h-6 text-primary/40 mx-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Mobile Pipeline */}
        <div className="md:hidden space-y-4">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.name}>
              <div className="glass-panel rounded-xl p-5 border border-white/10 flex items-center gap-4">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg ${step.bg} flex items-center justify-center`}
                >
                  <span className={`font-bold ${step.color}`}>{i + 1}</span>
                </div>
                <div>
                  <p className="font-heading font-bold text-white text-sm">
                    {step.name}
                  </p>
                  <p className={`text-xs ${step.color}`}>{step.operator}</p>
                </div>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowRight className="w-4 h-4 text-primary/40 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Back to Home */}
      <footer className="container pb-16 text-center">
        <Button
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10 rounded-full px-8"
          asChild
        >
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </a>
        </Button>
      </footer>
    </div>
  );
}
