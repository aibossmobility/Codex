import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { ArrowLeft, ArrowRight, CheckCircle2, HeartHandshake, LockKeyhole, MessageCircle, ShieldCheck } from "lucide-react";

const checkInLink = "https://getmarlee.com/app/invite/link/683d41b3ac650107f5a49f3de7866dc4";

const reflectionAreas = [
  "How communication feels right now",
  "Where trust may need rebuilding",
  "Patterns that can create distance",
  "How you respond when conversations get difficult",
  "Where listening may matter more than explaining",
  "What you can begin changing first",
];

export default function MarleeAssessment() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="2-Minute Fatherhood Check-In | Papa Life"
        description="Where are you with your adult child? Take the Papa Life 2-Minute Fatherhood Check-In and identify a practical place to begin rebuilding connection."
        keywords="fatherhood check-in, fathers of adult children, Papa Life, reconnect with adult child, rebuild trust"
      />

      <header className="border-b border-white/10 bg-black/90">
        <div className="container flex min-h-20 items-center justify-between gap-4 py-3">
          <a href="/" aria-label="Papa Life home"><SiteLogo size="md" /></a>
          <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-brand-yellow">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Papa Life
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-white/10 py-16 md:py-24">
          <div className="absolute inset-0 papa-hero-radial opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black to-black" />
          <div className="container relative z-10">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-yellow">2-Minute Fatherhood Check-In</p>
                <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">Where Are You With Your Adult Child?</h1>
                <p className="mt-6 text-lg leading-relaxed text-white/75 md:text-xl">
                  This is not a test, a score, or a judgment of you as a father. It is a short private check-in to help you notice where things are today and where you may want to begin.
                </p>
                <p className="mt-5 text-lg leading-relaxed text-white/70">
                  You do not have to solve the whole relationship today. Start by getting clear about what is happening, what you are carrying, and what is within your control.
                </p>
                <div className="mt-8">
                  <Button asChild size="lg" className="h-auto min-h-14 rounded-full bg-primary px-7 py-4 text-base font-extrabold text-black hover:bg-primary/90">
                    <a href={checkInLink}>Take the 2-Minute Check-In <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" /></a>
                  </Button>
                </div>
              </div>

              <Card className="overflow-hidden border-brand-yellow/30 bg-black/65 shadow-2xl">
                <CardContent className="p-7 md:p-9">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-brand-yellow/30 bg-brand-yellow/10 text-brand-yellow">
                    <HeartHandshake className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">A Place to Begin, Dad</h2>
                  <p className="mt-4 leading-relaxed text-white/70">
                    Sometimes the first useful question is not “How do I fix this?” but “What is happening between us, and what can I change first?”
                  </p>
                  <div className="mt-7 rounded-xl border border-primary/25 bg-primary/10 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <p className="text-sm leading-relaxed text-white/75">Papa Life is about reconnection, humility, presence, and practical next steps—not labeling fathers or adult children.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-primary">A few minutes of honest reflection</p>
              <h2 className="text-3xl font-bold md:text-5xl">What the Check-In Helps You Notice</h2>
            </div>
            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reflectionAreas.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-card/75 p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-yellow" aria-hidden="true" />
                  <span className="font-semibold text-white/85">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.025] py-16 md:py-20">
          <div className="container mx-auto max-w-4xl">
            <Card className="border-white/10 bg-card/80">
              <CardContent className="p-7 md:p-9">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-primary">
                  <MessageCircle className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 className="text-3xl font-bold">What Happens Next?</h2>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                  Use what you notice as a starting point for prayer, reflection, a Papa Life conversation, or one small action that makes you safer to talk to. The goal is not a perfect score. The goal is a more honest next step.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container">
            <div className="mx-auto max-w-4xl rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-6 md:p-9">
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/50 text-brand-yellow">
                  <LockKeyhole className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-yellow">Privacy note</p>
                  <p className="mt-3 text-lg leading-relaxed text-white/75">Your private responses and conversations remain private unless you choose to share them.</p>
                </div>
              </div>
            </div>
            <div className="mt-12 text-center">
              <Button asChild size="lg" className="h-auto min-h-14 rounded-full bg-primary px-7 py-4 text-base font-extrabold text-black hover:bg-primary/90">
                <a href={checkInLink}>Take the 2-Minute Check-In <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" /></a>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
