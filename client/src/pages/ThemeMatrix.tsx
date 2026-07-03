import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Moon,
  PhoneOff,
  UserCog,
  BookOpen,
  PenTool,
  Crown,
  Trophy,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { SiteCtaBlocks } from "@/components/SiteCtaBlocks";

const THEMES = [
  {
    day: 0,
    dayName: "Sunday",
    theme: "Weekly Reset",
    emotionalCore: "Reflection & intention",
    direction:
      "Quiet, faith-rooted. Set the tone for the coming week. One intention. One anchor.",
    color: "brand-yellow",
    bgColor: "bg-brand-yellow/10",
    borderColor: "border-brand-yellow/40",
    textColor: "text-brand-yellow",
    glowColor: "shadow-[0_0_30px_rgba(255,214,10,0.3)]",
    Icon: Moon,
  },
  {
    day: 1,
    dayName: "Monday",
    theme: "The Silent Phone",
    emotionalCore: "Pain of distance",
    direction:
      "Speak to the dad whose adult kid has pulled away. Validate the hurt. Open the honest conversation.",
    color: "accent",
    bgColor: "bg-accent/10",
    borderColor: "border-accent/40",
    textColor: "text-accent",
    glowColor: "shadow-[0_0_30px_rgba(239,43,45,0.3)]",
    Icon: PhoneOff,
  },
  {
    day: 2,
    dayName: "Tuesday",
    theme: "Provider vs. Parent",
    emotionalCore: "Identity shift",
    direction:
      "Address the man who defined himself by what he provided. Who is he now?",
    color: "brand-yellow",
    bgColor: "bg-brand-yellow/10",
    borderColor: "border-brand-yellow/40",
    textColor: "text-brand-yellow",
    glowColor: "shadow-[0_0_30px_rgba(255,214,10,0.3)]",
    Icon: UserCog,
  },
  {
    day: 3,
    dayName: "Wednesday",
    theme: "PAPA Framework",
    emotionalCore: "Teaching & reflection",
    direction:
      "Deep educational content on one of the four pillars. This is the anchor day.",
    color: "primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/40",
    textColor: "text-primary",
    glowColor: "shadow-[0_0_30px_rgba(34,197,94,0.3)]",
    Icon: BookOpen,
  },
  {
    day: 4,
    dayName: "Thursday",
    theme: "The Letter You Didn't Send",
    emotionalCore: "Emotional honesty",
    direction:
      "Unspoken words. Unresolved moments. Prompt vulnerability and repair.",
    color: "accent",
    bgColor: "bg-accent/10",
    borderColor: "border-accent/40",
    textColor: "text-accent",
    glowColor: "shadow-[0_0_30px_rgba(239,43,45,0.3)]",
    Icon: PenTool,
  },
  {
    day: 5,
    dayName: "Friday",
    theme: "Authority Reclaimed",
    emotionalCore: "Confidence & character",
    direction:
      "What leading as a father of adults actually looks like. Practical and empowering.",
    color: "primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/40",
    textColor: "text-primary",
    glowColor: "shadow-[0_0_30px_rgba(34,197,94,0.25)]",
    Icon: Crown,
  },
  {
    day: 6,
    dayName: "Saturday",
    theme: "Success Story",
    emotionalCore: "Proof & inspiration",
    direction:
      "Real dads. Real breakthroughs. Community wins. Social proof without hype.",
    color: "brand-yellow",
    bgColor: "bg-brand-yellow/10",
    borderColor: "border-brand-yellow/40",
    textColor: "text-brand-yellow",
    glowColor: "shadow-[0_0_30px_rgba(255,214,10,0.3)]",
    Icon: Trophy,
  },
];

const CONTENT_FORMULA = [
  {
    step: 1,
    name: "Hook",
    description:
      "Stop the scroll. Use a pattern interrupt — a bold truth, a surprising question, or a visceral image.",
  },
  {
    step: 2,
    name: "Bridge",
    description:
      "Connect the hook to the listener's real pain. Make them feel seen and understood in one sentence.",
  },
  {
    step: 3,
    name: "Insight",
    description:
      "Deliver the reframe. The new perspective. The thing they haven't considered. This is where transformation happens.",
  },
  {
    step: 4,
    name: "Close",
    description:
      "One clear action or one honest question. Never both. Leave them with a next step that feels achievable.",
  },
];

export default function ThemeMatrix() {
  const today = new Date().getDay();
  const todayTheme = THEMES[today];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      {/* Hero Banner */}
      <header className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(56,189,248,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(59,130,246,0.08),transparent)]" />
        <div className="container relative z-10 text-center space-y-6">
          <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-1.5 text-xs tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Content Engine
          </Badge>
          <h1 className="font-heading text-4xl md:text-6xl font-extrabold tracking-tight text-white text-glow">
            7-Day Content <span className="text-primary">Theme Matrix</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            All content aligns to this weekly rhythm. No exceptions.
          </p>
          <Separator className="w-24 h-1 bg-primary mx-auto" />
        </div>
      </header>

      <div className="container max-w-3xl mx-auto px-4 -mt-2 mb-8">
        <SiteCtaBlocks placement="theme_matrix" />
      </div>

      {/* Today's Theme — Highlighted */}
      <section className="container relative z-10 -mt-4 mb-16">
        <div
          className={`relative glass-panel rounded-2xl p-8 md:p-12 ${todayTheme.borderColor} border-2 ${todayTheme.glowColor} transition-all duration-500`}
        >
          <div className="absolute top-4 right-4">
            <Badge className="bg-primary text-primary-foreground font-bold text-xs px-3 py-1 animate-pulse">
              TODAY
            </Badge>
          </div>
          <div className="flex flex-col md:flex-row items-start gap-8">
            <div
              className={`flex-shrink-0 w-20 h-20 rounded-2xl ${todayTheme.bgColor} flex items-center justify-center`}
            >
              <todayTheme.Icon className={`w-10 h-10 ${todayTheme.textColor}`} />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p
                  className={`text-sm font-semibold tracking-wider uppercase ${todayTheme.textColor}`}
                >
                  {todayTheme.dayName}
                </p>
                <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white mt-1">
                  {todayTheme.theme}
                </h2>
              </div>
              <div className="glass-panel rounded-xl p-4 border border-white/10">
                <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">
                  Emotional Core
                </p>
                <p className={`text-lg font-semibold ${todayTheme.textColor}`}>
                  {todayTheme.emotionalCore}
                </p>
              </div>
              <p className="text-gray-300 text-base leading-relaxed max-w-2xl">
                {todayTheme.direction}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* All 7 Days Grid */}
      <section className="container pb-20">
        <h3 className="font-heading text-2xl font-bold text-white mb-8 text-center">
          Full Weekly Rhythm
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {THEMES.map((theme) => {
            const isToday = theme.day === today;
            return (
              <Card
                key={theme.day}
                className={`glass-panel border ${
                  isToday
                    ? `${theme.borderColor} border-2 ${theme.glowColor}`
                    : "border-white/10"
                } bg-transparent transition-all duration-300 hover:scale-[1.02] hover:border-white/20`}
              >
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-lg ${theme.bgColor} flex items-center justify-center`}
                    >
                      <theme.Icon className={`w-5 h-5 ${theme.textColor}`} />
                    </div>
                    {isToday && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-2 animate-pulse">
                        TODAY
                      </Badge>
                    )}
                  </div>
                  <p
                    className={`text-xs font-semibold tracking-wider uppercase mt-3 ${theme.textColor}`}
                  >
                    {theme.dayName}
                  </p>
                  <CardTitle className="text-white text-lg">
                    {theme.theme}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider">
                      Emotional Core
                    </p>
                    <p className={`text-sm font-medium ${theme.textColor}`}>
                      {theme.emotionalCore}
                    </p>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {theme.direction}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Content Formula */}
      <section className="container pb-24">
        <div className="text-center mb-12">
          <h3 className="font-heading text-3xl font-bold text-white mb-3">
            The Content Formula
          </h3>
          <p className="text-gray-400 max-w-xl mx-auto">
            Every piece of PAPA Life content follows this 4-step structure.
            Memorize it. Never deviate.
          </p>
          <Separator className="w-24 h-1 bg-primary mx-auto mt-6" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CONTENT_FORMULA.map((item, i) => (
            <div key={item.step} className="relative">
              <Card className="glass-panel border border-white/10 bg-transparent h-full">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-lg">
                      {item.step}
                    </span>
                    <h4 className="font-heading text-xl font-bold text-primary">
                      {item.name}
                    </h4>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
              {i < CONTENT_FORMULA.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-5 h-5 text-primary/50" />
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
